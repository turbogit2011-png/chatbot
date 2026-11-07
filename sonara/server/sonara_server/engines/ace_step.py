"""ACE-Step engine: open-weight, full-song generation with real sung vocals.

ACE-Step (Apache-2.0, StepFun/ACE Studio) is the closest open model to a
commercial song generator: it takes a style prompt plus timestamped lyrics and
renders a complete mixed track with vocals.

This module keeps the integration defensive on purpose. The upstream pipeline's
keyword names have moved between releases, so instead of hard-coding a call
signature we introspect it and pass only the arguments it actually accepts.
Install it with `pip install -r requirements-ace.txt` on a CUDA machine.
"""
from __future__ import annotations

import inspect
import os
import random
import shutil
import threading
from pathlib import Path
from typing import Any, Dict, List, Optional

from .. import audio_io, covers
from ..config import settings
from ..models import CoverRequest, ExtendRequest, GenerateRequest, ModelInfo
from .base import Engine, ProgressFn, RenderedClip


def _import_pipeline():
    """Returns the ACE-Step pipeline class, or None when it is not installed."""
    candidates = (
        ("acestep.pipeline_ace_step", "ACEStepPipeline"),
        ("acestep.pipeline", "ACEStepPipeline"),
        ("ace_step.pipeline_ace_step", "ACEStepPipeline"),
    )
    for module_name, attr in candidates:
        try:
            module = __import__(module_name, fromlist=[attr])
            return getattr(module, attr)
        except Exception:
            continue
    return None


def _torch():
    try:
        import torch  # type: ignore

        return torch
    except Exception:
        return None


class AceStepEngine(Engine):
    name = "ace-step"
    description = "ACE-Step open-weight song model: sung vocals, full arrangement, GPU required"
    supports_vocals = True
    supports_extend = True
    supports_cover = True
    supports_stems = False
    max_duration_seconds = 240

    def __init__(self) -> None:
        self._pipeline: Any = None
        self._lock = threading.Lock()

    # ----------------------------------------------------------- availability

    def available(self) -> bool:
        if _import_pipeline() is None:
            return False
        torch = _torch()
        if torch is None:
            return False
        return bool(getattr(torch, "cuda", None) and torch.cuda.is_available()) or settings.ace_cpu_offload

    def device(self) -> str:
        torch = _torch()
        if torch is None:
            return "unavailable"
        if getattr(torch, "cuda", None) and torch.cuda.is_available():
            try:
                return f"cuda:{settings.ace_device_id} {torch.cuda.get_device_name(settings.ace_device_id)}"
            except Exception:
                return "cuda"
        return "cpu"

    def models(self) -> List[ModelInfo]:
        return [
            ModelInfo(
                id="ace-step-v1-3.5b",
                name="ACE-Step v1 3.5B",
                description="Open-weight song generation with sung vocals (up to 4 minutes)",
                max_duration_seconds=self.max_duration_seconds,
                supports_vocals=True,
                supports_extend=True,
                supports_stems=False,
                engine=self.name,
            )
        ]

    # ------------------------------------------------------------------ setup

    def warmup(self) -> None:
        self._ensure_pipeline()

    def _ensure_pipeline(self):
        with self._lock:
            if self._pipeline is not None:
                return self._pipeline
            cls = _import_pipeline()
            if cls is None:
                raise RuntimeError(
                    "ACE-Step is not installed. Install it with "
                    "'pip install -r requirements-ace.txt' on a CUDA machine."
                )
            kwargs = self._filter_kwargs(
                cls.__init__,
                {
                    "checkpoint_dir": settings.ace_checkpoint or None,
                    "checkpoint_path": settings.ace_checkpoint or None,
                    "dtype": "bfloat16" if settings.ace_bf16 else "float32",
                    "torch_compile": settings.ace_torch_compile,
                    "cpu_offload": settings.ace_cpu_offload,
                    "device_id": settings.ace_device_id,
                    "overlapped_decode": True,
                },
            )
            self._pipeline = cls(**kwargs)
            return self._pipeline

    @staticmethod
    def _filter_kwargs(func, candidate: Dict[str, Any]) -> Dict[str, Any]:
        """Drops any keyword the installed version does not accept."""
        try:
            signature = inspect.signature(func)
        except (TypeError, ValueError):
            return {}
        if any(p.kind is inspect.Parameter.VAR_KEYWORD for p in signature.parameters.values()):
            return {k: v for k, v in candidate.items() if v is not None}
        allowed = set(signature.parameters)
        return {k: v for k, v in candidate.items() if k in allowed and v is not None}

    # --------------------------------------------------------------- generate

    def generate(self, request: GenerateRequest, out_dir: Path, progress: ProgressFn) -> List[RenderedClip]:
        pipeline = self._ensure_pipeline()
        prompt = self._build_prompt(request)
        lyrics = self._build_lyrics(request)
        base_seed = request.seed or random.randrange(1, 2**31)
        clips: List[RenderedClip] = []
        total = max(1, request.num_variations)

        for index in range(total):
            seed = base_seed + index * 7919
            progress(index / total + 0.02, "loading model" if index == 0 else "rendering")
            target = out_dir / f"ace-{seed}-{index + 1}.wav"
            target.parent.mkdir(parents=True, exist_ok=True)

            call_kwargs = self._filter_kwargs(
                pipeline.__call__,
                {
                    "prompt": prompt,
                    "lyrics": lyrics,
                    "audio_duration": float(request.duration_seconds),
                    "duration": float(request.duration_seconds),
                    "infer_step": settings.ace_steps,
                    "infer_steps": settings.ace_steps,
                    "guidance_scale": settings.ace_guidance,
                    "scheduler_type": "euler",
                    "cfg_type": "apg",
                    "omega_scale": 10.0,
                    "manual_seeds": str(seed),
                    "seed": seed,
                    "guidance_interval": 0.5,
                    "guidance_interval_decay": 0.0,
                    "min_guidance_scale": 3.0,
                    "use_erg_tag": True,
                    "use_erg_lyric": True,
                    "use_erg_diffusion": True,
                    "save_path": str(target),
                    "output_path": str(target),
                    "format": "wav",
                    "batch_size": 1,
                    "lora_name_or_path": "none",
                },
            )
            progress(index / total + 0.1, "rendering audio")
            result = pipeline(**call_kwargs)
            produced = self._resolve_output(result, target)
            if produced is None:
                raise RuntimeError("ACE-Step finished without writing an audio file")

            mp3_path = out_dir / f"ace-{seed}-{index + 1}.mp3"
            if produced.suffix.lower() == ".mp3":
                if produced != mp3_path:
                    shutil.move(str(produced), mp3_path)
            else:
                audio_io.encode_mp3(produced, mp3_path)
                produced.unlink(missing_ok=True)

            title = (request.title or "").strip() or self._title_from(request, seed)
            cover = None
            if settings.covers:
                cover = covers.render_cover(
                    settings.cover_dir / f"{mp3_path.stem}.jpg",
                    title,
                    mp3_path.stem,
                    self._tags(request),
                )
            audio_io.tag_mp3(mp3_path, title, "Sonara Studio", "Sonara generations", cover)

            clips.append(
                RenderedClip(
                    path=mp3_path,
                    title=title,
                    duration_seconds=audio_io.probe_duration(mp3_path) or float(request.duration_seconds),
                    lyrics=None if request.instrumental else (request.lyrics or None),
                    style=request.style,
                    style_tags=self._tags(request),
                    instrumental=request.instrumental,
                    variant=index + 1,
                    seed=seed,
                    model=request.model,
                )
            )
            progress((index + 1) / total, "done")
        return clips

    def extend(
        self,
        request: ExtendRequest,
        source_audio: Optional[Path],
        out_dir: Path,
        progress: ProgressFn,
    ) -> List[RenderedClip]:
        """Renders a continuation and crossfades it onto the trimmed original."""
        generate_request = GenerateRequest(
            prompt=request.style or "",
            lyrics=request.lyrics,
            style=request.style,
            instrumental=not bool(request.lyrics),
            model=request.model,
            duration_seconds=request.duration_seconds,
            num_variations=1,
        )
        clips = self.generate(generate_request, out_dir, lambda v, s: progress(v * 0.85, s))
        clip = clips[0]
        if source_audio and source_audio.exists():
            progress(0.9, "joining sections")
            head, _ = audio_io.decode_to_numpy(source_audio)
            cut = int(max(0.0, request.continue_at_seconds) * 44100)
            head = head[:cut] if cut else head
            tail, _ = audio_io.decode_to_numpy(clip.path)
            joined = audio_io.crossfade(head, tail, seconds=1.8)
            wav = clip.path.with_suffix(".joined.wav")
            audio_io.write_wav(wav, joined)
            audio_io.encode_mp3(wav, clip.path)
            wav.unlink(missing_ok=True)
            clip.duration_seconds = joined.shape[0] / 44100
        clip.role = "extension"
        progress(1.0, "done")
        return [clip]

    def cover(
        self,
        request: CoverRequest,
        source_audio: Optional[Path],
        out_dir: Path,
        progress: ProgressFn,
    ) -> List[RenderedClip]:
        generate_request = GenerateRequest(
            prompt=request.style,
            lyrics=request.lyrics,
            style=request.style,
            instrumental=not bool(request.lyrics),
            model=request.model,
            duration_seconds=180,
            num_variations=request.num_variations,
        )
        return self.generate(generate_request, out_dir, progress)

    # ----------------------------------------------------------------- prompt

    def _build_prompt(self, request: GenerateRequest) -> str:
        """ACE-Step reads a comma separated tag list, so flatten everything into one."""
        parts: List[str] = []
        if request.style:
            parts.append(request.style)
        if request.prompt:
            parts.append(request.prompt)
        if request.tempo_bpm:
            parts.append(f"{request.tempo_bpm} bpm")
        if request.key_signature:
            parts.append(request.key_signature)
        if request.vocal_gender and request.vocal_gender != "any":
            parts.append(f"{request.vocal_gender} vocals")
        if request.instrumental:
            parts.append("instrumental")
        if request.language:
            parts.append(f"{request.language} lyrics")
        if request.negative_style:
            parts.append(f"not {request.negative_style}")
        return ", ".join(p.strip() for p in parts if p and p.strip()) or "pop, clean mix"

    def _build_lyrics(self, request: GenerateRequest) -> str:
        if request.instrumental or not request.lyrics:
            return "[instrumental]"
        return request.lyrics

    def _tags(self, request: GenerateRequest) -> List[str]:
        raw = (request.style or "").split(",")
        return [t.strip() for t in raw if t.strip()][:8]

    def _title_from(self, request: GenerateRequest, seed: int) -> str:
        if request.lyrics:
            for line in request.lyrics.splitlines():
                clean = line.strip().strip("[]")
                if 8 <= len(clean) <= 44 and not clean.lower().startswith(("verse", "chorus", "bridge")):
                    return clean.title()
        if request.prompt:
            return " ".join(request.prompt.split()[:4]).title()
        return f"ACE {seed % 10000}"

    def _resolve_output(self, result: Any, expected: Path) -> Optional[Path]:
        """The pipeline may return a path, a list of paths, or just write the file."""
        candidates: List[Path] = []
        if isinstance(result, (str, os.PathLike)):
            candidates.append(Path(result))
        elif isinstance(result, (list, tuple)):
            for item in result:
                if isinstance(item, (str, os.PathLike)):
                    candidates.append(Path(item))
        elif isinstance(result, dict):
            for key in ("audio_path", "path", "output", "file"):
                value = result.get(key)
                if isinstance(value, (str, os.PathLike)):
                    candidates.append(Path(value))
        candidates.append(expected)
        for candidate in candidates:
            if candidate.exists() and candidate.stat().st_size > 0:
                return candidate
        # some builds append a suffix to save_path
        for sibling in expected.parent.glob(expected.stem + "*"):
            if sibling.is_file() and sibling.stat().st_size > 0:
                return sibling
        return None

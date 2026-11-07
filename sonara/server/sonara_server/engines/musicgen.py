"""MusicGen engine (Meta, via transformers): high quality instrumentals.

MusicGen has no vocals, so requests that ask for singing are rendered as
instrumentals and the job reports that. Long tracks are produced by generating
in windows and feeding the tail of each window back in as an audio prompt, which
keeps the arrangement continuous instead of restarting every 30 seconds.
"""
from __future__ import annotations

import random
from pathlib import Path
from typing import List, Optional

import numpy as np

from .. import audio_io, covers, dsp
from ..config import settings
from ..models import GenerateRequest, ModelInfo
from .base import Engine, ProgressFn, RenderedClip

WINDOW_SECONDS = 28.0
OVERLAP_SECONDS = 6.0


class MusicGenEngine(Engine):
    name = "musicgen"
    description = "Meta MusicGen: instrumental generation, stitched into full-length tracks"
    supports_vocals = False
    supports_extend = True
    supports_cover = False
    supports_stems = False
    max_duration_seconds = 300

    def __init__(self) -> None:
        self._model = None
        self._processor = None
        self._sr = 32000

    def available(self) -> bool:
        try:
            import torch  # noqa: F401
            import transformers  # noqa: F401
        except Exception:
            return False
        return True

    def device(self) -> str:
        try:
            import torch

            if torch.cuda.is_available():
                return f"cuda {torch.cuda.get_device_name(0)}"
            if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
                return "mps"
        except Exception:
            pass
        return "cpu"

    def models(self) -> List[ModelInfo]:
        return [
            ModelInfo(
                id=settings.musicgen_model,
                name="MusicGen " + settings.musicgen_model.split("-")[-1],
                description="Instrumental only — vocals are not supported by this model",
                max_duration_seconds=self.max_duration_seconds,
                supports_vocals=False,
                supports_extend=True,
                supports_stems=False,
                engine=self.name,
            )
        ]

    def warmup(self) -> None:
        self._ensure()

    def _ensure(self):
        if self._model is not None:
            return
        import torch
        from transformers import AutoProcessor, MusicgenForConditionalGeneration

        self._processor = AutoProcessor.from_pretrained(settings.musicgen_model)
        model = MusicgenForConditionalGeneration.from_pretrained(settings.musicgen_model)
        if torch.cuda.is_available():
            model = model.to("cuda")
        model.eval()
        self._model = model
        self._sr = model.config.audio_encoder.sampling_rate

    def generate(self, request: GenerateRequest, out_dir: Path, progress: ProgressFn) -> List[RenderedClip]:
        import torch

        self._ensure()
        prompt = self._prompt(request)
        base_seed = request.seed or random.randrange(1, 2**31)
        clips: List[RenderedClip] = []
        total = max(1, request.num_variations)

        for index in range(total):
            seed = base_seed + index * 7919
            torch.manual_seed(seed)
            audio = self._render_long(prompt, request.duration_seconds, progress, index, total)
            stereo = audio if audio.ndim == 2 and audio.shape[1] == 2 else dsp.haas(audio.reshape(-1), 9.0, 0.35)
            stereo = dsp.fade(dsp.normalize(stereo, 0.95), 0.03, 2.0, sr=self._sr)

            stem = f"musicgen-{seed}-{index + 1}"
            wav_path = out_dir / f"{stem}.wav"
            mp3_path = out_dir / f"{stem}.mp3"
            audio_io.write_wav(wav_path, stereo, self._sr)
            audio_io.encode_mp3(wav_path, mp3_path)
            wav_path.unlink(missing_ok=True)

            title = (request.title or "").strip() or " ".join((request.prompt or prompt).split()[:4]).title()
            cover = None
            if settings.covers:
                cover = covers.render_cover(settings.cover_dir / f"{stem}.jpg", title, stem, self._tags(request))
            audio_io.tag_mp3(mp3_path, title, "Sonara Studio", "Sonara generations", cover)

            clips.append(
                RenderedClip(
                    path=mp3_path,
                    title=title,
                    duration_seconds=stereo.shape[0] / self._sr,
                    lyrics=None,
                    style=request.style,
                    style_tags=self._tags(request),
                    instrumental=True,
                    variant=index + 1,
                    seed=seed,
                    model=request.model,
                )
            )
        return clips

    def _render_long(
        self,
        prompt: str,
        duration: int,
        progress: ProgressFn,
        index: int,
        total: int,
    ) -> np.ndarray:
        import torch

        assert self._processor is not None and self._model is not None
        device = next(self._model.parameters()).device
        remaining = max(10, min(duration, self.max_duration_seconds))
        pieces: List[np.ndarray] = []
        context: Optional[np.ndarray] = None
        window_index = 0
        windows = max(1, int(np.ceil(remaining / (WINDOW_SECONDS - OVERLAP_SECONDS))))

        while remaining > 0:
            seconds = min(WINDOW_SECONDS, remaining + OVERLAP_SECONDS)
            tokens = int(seconds * 50)  # MusicGen runs at 50 Hz token rate
            if context is None:
                inputs = self._processor(text=[prompt], padding=True, return_tensors="pt").to(device)
            else:
                inputs = self._processor(
                    text=[prompt],
                    audio=context,
                    sampling_rate=self._sr,
                    padding=True,
                    return_tensors="pt",
                ).to(device)
            with torch.no_grad():
                output = self._model.generate(**inputs, max_new_tokens=tokens, do_sample=True, guidance_scale=3.0)
            chunk = output[0].float().cpu().numpy()
            if chunk.ndim == 2:
                chunk = chunk.T  # (samples, channels)
            else:
                chunk = chunk.reshape(-1, 1)
            if context is not None:
                skip = int(OVERLAP_SECONDS * self._sr)
                chunk = chunk[skip:] if chunk.shape[0] > skip else chunk
            pieces.append(chunk)
            produced = chunk.shape[0] / self._sr
            remaining -= produced
            context = chunk[-int(OVERLAP_SECONDS * self._sr):, 0] if chunk.shape[0] else None
            window_index += 1
            progress(
                (index + min(1.0, window_index / windows)) / total,
                f"rendering window {window_index}/{windows}",
            )
            if window_index > 24:
                break

        audio = np.concatenate(pieces, axis=0)
        if audio.shape[1] == 1:
            return audio[:, 0]
        return audio

    def _prompt(self, request: GenerateRequest) -> str:
        parts = [p for p in (request.style, request.prompt) if p]
        if request.tempo_bpm:
            parts.append(f"{request.tempo_bpm} bpm")
        text = ", ".join(parts).strip()
        return text or "cinematic instrumental, warm analog production"

    def _tags(self, request: GenerateRequest) -> List[str]:
        return [t.strip() for t in (request.style or "").split(",") if t.strip()][:8]

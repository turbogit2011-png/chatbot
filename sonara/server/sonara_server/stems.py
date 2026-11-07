"""Stem separation.

Demucs when it is installed (that is the real thing). Otherwise the offline
engine's own per-instrument buses are used when they exist, and failing that a
mid/side split gives a usable vocals / backing pair. The response always says
which method produced the files.
"""
from __future__ import annotations

import shutil
import subprocess
from pathlib import Path
from typing import List, Tuple

import numpy as np

from . import audio_io, dsp
from .config import settings
from .engines.base import RenderedClip


def have_demucs() -> bool:
    return shutil.which("demucs") is not None


def separate(source: Path, mode: str, out_dir: Path) -> Tuple[List[RenderedClip], str]:
    out_dir.mkdir(parents=True, exist_ok=True)
    if have_demucs():
        try:
            return _demucs(source, mode, out_dir), "demucs"
        except Exception:
            pass
    rendered = _engine_stems(source, out_dir)
    if rendered:
        return rendered, "engine-buses"
    return _mid_side(source, out_dir), "mid-side"


def _demucs(source: Path, mode: str, out_dir: Path) -> List[RenderedClip]:
    cmd = ["demucs", "-n", settings.demucs_model, "-o", str(out_dir)]
    if mode == "two_stem":
        cmd += ["--two-stems", "vocals"]
    cmd.append(str(source))
    subprocess.run(cmd, check=True)
    clips: List[RenderedClip] = []
    for wav in sorted(out_dir.rglob("*.wav")):
        mp3 = out_dir / f"{source.stem}-{wav.stem}.mp3"
        audio_io.encode_mp3(wav, mp3)
        clips.append(
            RenderedClip(
                path=mp3,
                title=wav.stem.capitalize(),
                duration_seconds=audio_io.probe_duration(mp3),
                role="stem",
            )
        )
    return clips


def _engine_stems(source: Path, out_dir: Path) -> List[RenderedClip]:
    """The offline engine writes its buses next to the mix; reuse them when present."""
    clips: List[RenderedClip] = []
    for wav in sorted(source.parent.glob(source.stem + "-*.wav")):
        mp3 = out_dir / f"{wav.stem}.mp3"
        audio_io.encode_mp3(wav, mp3)
        clips.append(
            RenderedClip(
                path=mp3,
                title=wav.stem.split("-")[-1].capitalize(),
                duration_seconds=audio_io.probe_duration(mp3),
                role="stem",
            )
        )
    return clips


def _mid_side(source: Path, out_dir: Path) -> List[RenderedClip]:
    audio, sr = audio_io.decode_to_numpy(source)
    if audio.size == 0:
        return []
    left, right = audio[:, 0], audio[:, 1]
    side = (left - right) / 2.0
    mid = (left + right) / 2.0
    lead = dsp.filt(mid, "highpass", 180.0)
    backing = np.stack([side, -side], axis=1)
    pairs = [("lead", np.stack([lead, lead], axis=1)), ("backing", backing)]
    clips: List[RenderedClip] = []
    for name, buffer in pairs:
        wav = out_dir / f"{source.stem}-{name}.wav"
        mp3 = out_dir / f"{source.stem}-{name}.mp3"
        audio_io.write_wav(wav, dsp.normalize(buffer, 0.9), sr)
        audio_io.encode_mp3(wav, mp3)
        wav.unlink(missing_ok=True)
        clips.append(
            RenderedClip(
                path=mp3,
                title=name.capitalize(),
                duration_seconds=audio_io.probe_duration(mp3),
                role="stem",
            )
        )
    return clips

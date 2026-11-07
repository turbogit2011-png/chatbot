"""Audio file IO. WAV via the standard library, everything else via ffmpeg."""
from __future__ import annotations

import json
import shutil
import subprocess
import wave
from pathlib import Path
from typing import Optional, Tuple

import numpy as np

from .config import settings


class FfmpegMissing(RuntimeError):
    pass


def ffmpeg_path() -> str:
    path = shutil.which("ffmpeg")
    if not path:
        raise FfmpegMissing("ffmpeg is required for audio encoding; install it and retry")
    return path


def have_ffmpeg() -> bool:
    return shutil.which("ffmpeg") is not None


def write_wav(path: Path, audio: np.ndarray, sample_rate: int = 44100) -> Path:
    """Writes float32 mono or (n, 2) stereo as 24-bit-safe 16-bit PCM."""
    data = np.asarray(audio, dtype=np.float32)
    if data.ndim == 1:
        data = data[:, None]
    data = np.clip(data, -1.0, 1.0)
    pcm = (data * 32767.0).astype("<i2")
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as handle:
        handle.setnchannels(data.shape[1])
        handle.setsampwidth(2)
        handle.setframerate(sample_rate)
        handle.writeframes(pcm.tobytes())
    return path


def encode_mp3(wav_path: Path, mp3_path: Path, bitrate: Optional[str] = None) -> Path:
    mp3_path.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        ffmpeg_path(), "-y", "-hide_banner", "-loglevel", "error",
        "-i", str(wav_path),
        "-codec:a", "libmp3lame",
        "-b:a", bitrate or settings.mp3_bitrate,
        "-ar", str(settings.sample_rate),
        str(mp3_path),
    ]
    subprocess.run(cmd, check=True)
    return mp3_path


def tag_mp3(path: Path, title: str, artist: str = "Sonara", album: str = "Sonara", cover: Optional[Path] = None) -> None:
    """Rewrites the file with ID3 tags (and artwork when available)."""
    tmp = path.with_suffix(".tagged.mp3")
    cmd = [ffmpeg_path(), "-y", "-hide_banner", "-loglevel", "error", "-i", str(path)]
    if cover and cover.exists():
        cmd += ["-i", str(cover), "-map", "0:a", "-map", "1:v", "-c:v", "mjpeg",
                "-metadata:s:v", "title=Album cover", "-metadata:s:v", "comment=Cover (front)"]
    cmd += [
        "-c:a", "copy",
        "-id3v2_version", "3",
        "-metadata", f"title={title}",
        "-metadata", f"artist={artist}",
        "-metadata", f"album={album}",
        str(tmp),
    ]
    try:
        subprocess.run(cmd, check=True)
        tmp.replace(path)
    except Exception:
        tmp.unlink(missing_ok=True)


def decode_to_numpy(path: Path, sample_rate: int = 44100) -> Tuple[np.ndarray, int]:
    """Decodes any ffmpeg-readable file into float32 stereo."""
    cmd = [
        ffmpeg_path(), "-hide_banner", "-loglevel", "error",
        "-i", str(path), "-f", "f32le", "-ac", "2", "-ar", str(sample_rate), "-",
    ]
    result = subprocess.run(cmd, check=True, stdout=subprocess.PIPE)
    audio = np.frombuffer(result.stdout, dtype=np.float32)
    if audio.size == 0:
        return np.zeros((0, 2), dtype=np.float32), sample_rate
    return audio.reshape(-1, 2).copy(), sample_rate


def probe_duration(path: Path) -> float:
    probe = shutil.which("ffprobe")
    if not probe:
        return 0.0
    cmd = [probe, "-v", "error", "-show_entries", "format=duration",
           "-of", "json", str(path)]
    try:
        result = subprocess.run(cmd, check=True, stdout=subprocess.PIPE)
        payload = json.loads(result.stdout or b"{}")
        return float(payload.get("format", {}).get("duration", 0.0))
    except Exception:
        return 0.0


def crossfade(a: np.ndarray, b: np.ndarray, seconds: float = 1.5, sample_rate: int = 44100) -> np.ndarray:
    """Joins two stereo buffers with an equal-power crossfade."""
    if a.size == 0:
        return b
    if b.size == 0:
        return a
    n = min(int(seconds * sample_rate), a.shape[0], b.shape[0])
    if n <= 0:
        return np.concatenate([a, b])
    ramp = np.linspace(0.0, 1.0, n, dtype=np.float32)
    fade_out = np.cos(ramp * np.pi / 2)[:, None]
    fade_in = np.sin(ramp * np.pi / 2)[:, None]
    head = a[:-n]
    blend = a[-n:] * fade_out + b[:n] * fade_in
    tail = b[n:]
    return np.concatenate([head, blend, tail]).astype(np.float32)

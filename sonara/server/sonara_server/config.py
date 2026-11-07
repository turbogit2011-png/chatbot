"""Runtime configuration, all overridable through environment variables."""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path


def _bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, default))
    except (TypeError, ValueError):
        return default


@dataclass
class Settings:
    host: str = os.getenv("SONARA_HOST", "0.0.0.0")
    port: int = _int("SONARA_PORT", 8000)
    data_dir: Path = Path(os.getenv("SONARA_DATA_DIR", "./sonara-data")).expanduser()
    engine: str = os.getenv("SONARA_ENGINE", "auto")
    api_key: str = os.getenv("SONARA_API_KEY", "")
    max_concurrency: int = _int("SONARA_MAX_CONCURRENCY", 1)
    public_base_url: str = os.getenv("SONARA_PUBLIC_BASE_URL", "")
    mp3_bitrate: str = os.getenv("SONARA_MP3_BITRATE", "192k")
    sample_rate: int = _int("SONARA_SAMPLE_RATE", 44100)
    covers: bool = _bool("SONARA_COVERS", True)
    keep_jobs_hours: int = _int("SONARA_KEEP_JOBS_HOURS", 72)

    # ACE-Step (open-weight song model)
    ace_checkpoint: str = os.getenv("SONARA_ACE_CHECKPOINT", "")
    ace_steps: int = _int("SONARA_ACE_STEPS", 60)
    ace_guidance: float = float(os.getenv("SONARA_ACE_GUIDANCE", "15.0"))
    ace_bf16: bool = _bool("SONARA_ACE_BF16", True)
    ace_cpu_offload: bool = _bool("SONARA_ACE_CPU_OFFLOAD", False)
    ace_torch_compile: bool = _bool("SONARA_ACE_TORCH_COMPILE", False)
    ace_device_id: int = _int("SONARA_ACE_DEVICE_ID", 0)

    # DiffRhythm
    diffrhythm_repo: str = os.getenv("SONARA_DIFFRHYTHM_REPO", "ASLP-lab/DiffRhythm-1_2")

    # MusicGen (instrumental only)
    musicgen_model: str = os.getenv("SONARA_MUSICGEN_MODEL", "facebook/musicgen-stereo-medium")

    # Hosted provider bridge
    remote_profile: str = os.getenv("SONARA_REMOTE_PROFILE", "")
    remote_base_url: str = os.getenv("SONARA_REMOTE_BASE_URL", "")
    remote_api_key: str = os.getenv("SONARA_REMOTE_API_KEY", "")
    remote_model: str = os.getenv("SONARA_REMOTE_MODEL", "")
    remote_timeout: int = _int("SONARA_REMOTE_TIMEOUT", 600)

    # Lyric writer
    lyrics_provider: str = os.getenv("SONARA_LYRICS_PROVIDER", "auto")
    lyrics_base_url: str = os.getenv("SONARA_LYRICS_BASE_URL", "")
    lyrics_api_key: str = os.getenv("SONARA_LYRICS_API_KEY", "")
    lyrics_model: str = os.getenv("SONARA_LYRICS_MODEL", "")

    # Stem separation
    demucs_model: str = os.getenv("SONARA_DEMUCS_MODEL", "htdemucs")

    extra: dict = field(default_factory=dict)

    @property
    def audio_dir(self) -> Path:
        return self.data_dir / "audio"

    @property
    def cover_dir(self) -> Path:
        return self.data_dir / "covers"

    @property
    def upload_dir(self) -> Path:
        return self.data_dir / "uploads"

    def ensure_dirs(self) -> None:
        for path in (self.data_dir, self.audio_dir, self.cover_dir, self.upload_dir):
            path.mkdir(parents=True, exist_ok=True)


settings = Settings()

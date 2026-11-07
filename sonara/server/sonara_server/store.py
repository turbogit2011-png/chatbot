"""Durable registry of produced clips.

Audio lives on disk; this keeps the metadata next to it in a single JSON file so
the server can restart without losing track of what it rendered (which matters
for extend / cover / stems, all of which take a clip id).
"""
from __future__ import annotations

import json
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

from .config import settings
from .engines.base import RenderedClip
from .models import Clip

_LOCK = threading.Lock()


def _index_path() -> Path:
    return settings.data_dir / "clips.json"


def _load() -> Dict[str, dict]:
    path = _index_path()
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text("utf-8"))
    except Exception:
        return {}


def _save(data: Dict[str, dict]) -> None:
    path = _index_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, indent=2), "utf-8")
    tmp.replace(path)


def record(clip_id: str, rendered: RenderedClip, job_id: str) -> Clip:
    """Stores a rendered clip and returns its wire representation."""
    cover = settings.cover_dir / f"{rendered.path.stem}.jpg"
    entry = {
        "id": clip_id,
        "job_id": job_id,
        "title": rendered.title,
        "path": str(rendered.path),
        "cover": str(cover) if cover.exists() else "",
        "duration_seconds": rendered.duration_seconds,
        "lyrics": rendered.lyrics,
        "style": rendered.style,
        "style_tags": rendered.style_tags,
        "instrumental": rendered.instrumental,
        "variant": rendered.variant,
        "role": rendered.role,
        "seed": rendered.seed,
        "model": rendered.model,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    with _LOCK:
        data = _load()
        data[clip_id] = entry
        _save(data)
    return to_clip(entry)


def get(clip_id: str) -> Optional[dict]:
    with _LOCK:
        return _load().get(clip_id)


def audio_path(clip_id: str) -> Optional[Path]:
    entry = get(clip_id)
    if not entry:
        return None
    path = Path(entry["path"])
    return path if path.exists() else None


def cover_path(clip_id: str) -> Optional[Path]:
    entry = get(clip_id)
    if not entry or not entry.get("cover"):
        return None
    path = Path(entry["cover"])
    return path if path.exists() else None


def to_clip(entry: dict) -> Clip:
    clip_id = entry["id"]
    return Clip(
        id=clip_id,
        title=entry.get("title") or "Untitled",
        audio_url=public_url(f"/v1/audio/{clip_id}.mp3"),
        stream_url=public_url(f"/v1/audio/{clip_id}.mp3"),
        image_url=public_url(f"/v1/cover/{clip_id}.jpg") if entry.get("cover") else None,
        duration_seconds=float(entry.get("duration_seconds") or 0.0),
        lyrics=entry.get("lyrics"),
        style_tags=list(entry.get("style_tags") or []),
        style=entry.get("style"),
        model=entry.get("model"),
        instrumental=bool(entry.get("instrumental")),
        variant=int(entry.get("variant") or 1),
        role=entry.get("role") or "song",
        seed=entry.get("seed"),
        created_at=entry.get("created_at"),
    )


def public_url(path: str) -> str:
    """Relative by default; the client resolves it against the server it called."""
    base = settings.public_base_url.strip().rstrip("/")
    return f"{base}{path}" if base else path


def all_clips() -> List[Clip]:
    with _LOCK:
        data = _load()
    return [to_clip(entry) for entry in data.values()]

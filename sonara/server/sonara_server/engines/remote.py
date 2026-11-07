"""Bridge to a hosted music-generation API.

Sonara does not ship credentials for anybody's service. You point this engine at
an endpoint you are entitled to use, describe its shape with a profile, and the
app talks to it through the same interface as the local engines.

Two profiles are built in:

* ``openapi_async`` — POST a JSON body, get a task id back, poll a status
  endpoint until it returns audio URLs. This is the shape most hosted song APIs
  and API gateways expose.
* ``replicate`` — replicate.com predictions API (``Prefer: wait`` plus polling).

Everything is configured by environment variables, so adding another provider
usually means setting SONARA_REMOTE_* rather than writing code.
"""
from __future__ import annotations

import json
import os
import random
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx

from .. import audio_io, covers
from ..config import settings
from ..models import CoverRequest, ExtendRequest, GenerateRequest, ModelInfo
from .base import Engine, ProgressFn, RenderedClip


def _dig(payload: Any, *paths: str) -> Any:
    """Reads the first present dotted path out of a nested response."""
    for path in paths:
        node: Any = payload
        ok = True
        for part in path.split("."):
            if isinstance(node, dict) and part in node:
                node = node[part]
            elif isinstance(node, list) and part.isdigit() and int(part) < len(node):
                node = node[int(part)]
            else:
                ok = False
                break
        if ok and node not in (None, "", [], {}):
            return node
    return None


def _collect_audio_urls(payload: Any) -> List[str]:
    """Walks any JSON shape and returns everything that looks like an audio URL."""
    found: List[str] = []

    def visit(node: Any) -> None:
        if isinstance(node, str):
            lowered = node.lower()
            if lowered.startswith(("http://", "https://")) and any(
                ext in lowered for ext in (".mp3", ".wav", ".flac", ".m4a", ".ogg", "audio")
            ):
                found.append(node)
        elif isinstance(node, dict):
            for value in node.values():
                visit(value)
        elif isinstance(node, list):
            for value in node:
                visit(value)

    visit(payload)
    seen: set = set()
    unique = []
    for url in found:
        if url not in seen:
            seen.add(url)
            unique.append(url)
    return unique


class RemoteEngine(Engine):
    name = "remote"
    description = "Bridge to a hosted generation API you have access to"
    supports_vocals = True
    supports_extend = True
    supports_cover = True
    supports_stems = False
    max_duration_seconds = 480

    def available(self) -> bool:
        return bool(settings.remote_base_url and settings.remote_profile)

    def device(self) -> str:
        return settings.remote_profile or "remote"

    def models(self) -> List[ModelInfo]:
        label = settings.remote_model or "hosted"
        return [
            ModelInfo(
                id=label,
                name=f"Hosted · {label}",
                description=f"Rendered by {settings.remote_base_url}",
                max_duration_seconds=self.max_duration_seconds,
                supports_vocals=True,
                supports_extend=True,
                supports_stems=False,
                engine=self.name,
            )
        ]

    # ------------------------------------------------------------------- http

    def _client(self) -> httpx.Client:
        headers = {"Content-Type": "application/json", "Accept": "application/json"}
        if settings.remote_api_key:
            headers["Authorization"] = f"Bearer {settings.remote_api_key}"
        return httpx.Client(
            base_url=settings.remote_base_url.rstrip("/"),
            headers=headers,
            timeout=httpx.Timeout(60.0, read=settings.remote_timeout),
            follow_redirects=True,
        )

    def _payload(self, request: GenerateRequest) -> Dict[str, Any]:
        if settings.remote_profile == "replicate":
            return {
                "input": {
                    "prompt": ", ".join(p for p in (request.style, request.prompt) if p),
                    "lyrics": request.lyrics or "",
                    "duration": request.duration_seconds,
                    "instrumental": request.instrumental,
                    "seed": request.seed or random.randrange(1, 2**31),
                }
            }
        return {
            "prompt": request.prompt or "",
            "style": request.style or "",
            "tags": request.style or "",
            "title": request.title or "",
            "lyrics": request.lyrics or "",
            "instrumental": request.instrumental,
            "make_instrumental": request.instrumental,
            "model": settings.remote_model or request.model,
            "duration": request.duration_seconds,
            "seed": request.seed,
            "custom_mode": bool(request.lyrics or request.style),
            "wait_audio": False,
        }

    def generate(self, request: GenerateRequest, out_dir: Path, progress: ProgressFn) -> List[RenderedClip]:
        if not self.available():
            raise RuntimeError(
                "No hosted provider configured. Set SONARA_REMOTE_PROFILE, "
                "SONARA_REMOTE_BASE_URL and SONARA_REMOTE_API_KEY."
            )
        submit_path = os.getenv("SONARA_REMOTE_SUBMIT_PATH", "/predictions" if settings.remote_profile == "replicate" else "/generate")
        status_path = os.getenv("SONARA_REMOTE_STATUS_PATH", "")

        progress(0.05, "submitting to provider")
        with self._client() as client:
            response = client.post(submit_path, json=self._payload(request))
            response.raise_for_status()
            body = response.json()

            urls = _collect_audio_urls(body)
            task_id = _dig(body, "id", "data.id", "task_id", "data.task_id", "data.0.id")
            deadline = time.time() + settings.remote_timeout
            poll_target = status_path or (f"/predictions/{task_id}" if settings.remote_profile == "replicate" else f"/generate/{task_id}")

            while not urls and task_id and time.time() < deadline:
                time.sleep(3.0)
                poll = client.get(poll_target if "{id}" not in poll_target else poll_target.replace("{id}", str(task_id)))
                if poll.status_code >= 400:
                    break
                body = poll.json()
                state = str(_dig(body, "status", "data.status", "state") or "").lower()
                if state in {"failed", "error", "canceled", "cancelled"}:
                    raise RuntimeError(f"Provider reported {state}: {json.dumps(body)[:400]}")
                urls = _collect_audio_urls(body)
                elapsed = 1.0 - max(0.0, (deadline - time.time()) / settings.remote_timeout)
                progress(min(0.85, 0.1 + elapsed), state or "rendering")

            if not urls:
                raise RuntimeError("Provider returned no audio URLs")

            clips: List[RenderedClip] = []
            wanted = max(1, request.num_variations)
            for index, url in enumerate(urls[:wanted]):
                progress(0.85 + 0.1 * (index + 1) / wanted, "downloading audio")
                stem = f"remote-{int(time.time())}-{index + 1}"
                mp3_path = out_dir / f"{stem}.mp3"
                mp3_path.parent.mkdir(parents=True, exist_ok=True)
                with client.stream("GET", url) as download:
                    download.raise_for_status()
                    with open(mp3_path, "wb") as handle:
                        for chunk in download.iter_bytes(1 << 16):
                            handle.write(chunk)

                title = (request.title or "").strip() or _dig(body, "title", "data.title", f"data.{index}.title") or f"Hosted track {index + 1}"
                cover_url = _dig(body, "image_url", "data.image_url", f"data.{index}.image_url")
                cover_path = None
                if isinstance(cover_url, str) and cover_url.startswith("http"):
                    cover_path = settings.cover_dir / f"{stem}.jpg"
                    try:
                        with client.stream("GET", cover_url) as art:
                            art.raise_for_status()
                            cover_path.parent.mkdir(parents=True, exist_ok=True)
                            with open(cover_path, "wb") as handle:
                                for chunk in art.iter_bytes(1 << 16):
                                    handle.write(chunk)
                    except Exception:
                        cover_path = None
                if cover_path is None and settings.covers:
                    cover_path = covers.render_cover(
                        settings.cover_dir / f"{stem}.jpg", str(title), stem,
                        [t.strip() for t in (request.style or "").split(",") if t.strip()],
                    )

                clips.append(
                    RenderedClip(
                        path=mp3_path,
                        title=str(title),
                        duration_seconds=audio_io.probe_duration(mp3_path),
                        lyrics=request.lyrics,
                        style=request.style,
                        style_tags=[t.strip() for t in (request.style or "").split(",") if t.strip()][:8],
                        instrumental=request.instrumental,
                        variant=index + 1,
                        seed=request.seed,
                        model=settings.remote_model or request.model,
                    )
                )
            progress(1.0, "done")
            return clips

    def extend(self, request: ExtendRequest, source_audio, out_dir: Path, progress: ProgressFn):
        generate = GenerateRequest(
            prompt=request.style or "",
            style=request.style,
            lyrics=request.lyrics,
            instrumental=not bool(request.lyrics),
            duration_seconds=request.duration_seconds,
            num_variations=request.num_variations,
            model=request.model,
        )
        clips = self.generate(generate, out_dir, progress)
        for clip in clips:
            clip.role = "extension"
        return clips

    def cover(self, request: CoverRequest, source_audio, out_dir: Path, progress: ProgressFn):
        generate = GenerateRequest(
            prompt=request.style,
            style=request.style,
            lyrics=request.lyrics,
            instrumental=not bool(request.lyrics),
            duration_seconds=180,
            num_variations=request.num_variations,
            model=request.model,
        )
        return self.generate(generate, out_dir, progress)

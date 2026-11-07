"""Sonara server: HTTP surface used by the Android app."""
from __future__ import annotations

import shutil
import uuid
from pathlib import Path
from typing import List, Optional

from fastapi import Depends, FastAPI, File, Header, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from . import audio_io, engines, jobs, lyrics, stems, store
from .config import settings
from .models import (
    Clip,
    CoverRequest,
    ExtendRequest,
    GenerateRequest,
    HealthResponse,
    JobResponse,
    LyricsRequest,
    LyricsResponse,
    ModelsResponse,
    StemsRequest,
    UploadResponse,
)

VERSION = "1.0.0"

app = FastAPI(
    title="Sonara server",
    version=VERSION,
    description="Text-to-song backend for the Sonara Studio Android app",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup() -> None:
    settings.ensure_dirs()
    if not audio_io.have_ffmpeg():
        print("[sonara] WARNING: ffmpeg not found — audio encoding will fail")
    usable = [engine.name for engine in engines.available_engines()]
    print(f"[sonara] engines available: {', '.join(usable) or 'none'}")


def require_key(authorization: Optional[str] = Header(default=None)) -> None:
    """Optional shared-secret guard, enabled by setting SONARA_API_KEY."""
    if not settings.api_key:
        return
    expected = f"Bearer {settings.api_key}"
    if authorization != expected:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")


def pick_engine(preferred: str, model: str):
    try:
        return engines.select(preferred, model)
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


# ------------------------------------------------------------------ discovery


@app.get("/v1/health", response_model=HealthResponse)
def health(x_sonara_engine: Optional[str] = Header(default=None)) -> HealthResponse:
    try:
        engine = engines.select(x_sonara_engine or "", "")
        return HealthResponse(
            status="ok",
            engine=engine.name,
            version=VERSION,
            device=engine.device(),
            queue_depth=jobs.manager.queue_depth(),
        )
    except Exception as exc:  # noqa: BLE001
        return HealthResponse(status="degraded", engine="", version=VERSION, device=str(exc))


@app.get("/v1/models", response_model=ModelsResponse)
def models() -> ModelsResponse:
    return ModelsResponse(models=engines.models())


@app.get("/v1/engines")
def list_engines() -> JSONResponse:
    payload = [
        {
            "name": engine.name,
            "description": engine.description,
            "available": engine.available(),
            "device": engine.device() if engine.available() else "",
            "supports_vocals": engine.supports_vocals,
            "supports_extend": engine.supports_extend,
            "supports_cover": engine.supports_cover,
            "supports_stems": engine.supports_stems,
            "max_duration_seconds": engine.max_duration_seconds,
        }
        for engine in engines.all_engines()
    ]
    return JSONResponse({"engines": payload, "selected": settings.engine})


# ----------------------------------------------------------------- generation


@app.post("/v1/generate", response_model=JobResponse, dependencies=[Depends(require_key)])
def generate(request: GenerateRequest, x_sonara_engine: Optional[str] = Header(default=None)) -> JobResponse:
    if not any([request.prompt, request.lyrics, request.style]):
        raise HTTPException(status_code=422, detail="Provide a prompt, lyrics or a style")
    engine = pick_engine(x_sonara_engine or "", request.model)
    if request.duration_seconds > engine.max_duration_seconds:
        request.duration_seconds = engine.max_duration_seconds
    if request.lyrics and not engine.supports_vocals and not request.instrumental:
        request.instrumental = True

    def work(job: jobs.Job) -> List[Clip]:
        rendered = engine.generate(request, settings.audio_dir, jobs.make_progress(job))
        return jobs.register_clips(job, rendered)

    job = jobs.manager.submit("generate", engine.name, work)
    return job.response(jobs.manager.queue_position(job))


@app.post("/v1/extend", response_model=JobResponse, dependencies=[Depends(require_key)])
def extend(request: ExtendRequest, x_sonara_engine: Optional[str] = Header(default=None)) -> JobResponse:
    engine = pick_engine(x_sonara_engine or "", request.model)
    if not engine.supports_extend:
        raise HTTPException(status_code=400, detail=f"{engine.name} cannot extend tracks")
    source = store.audio_path(request.clip_id)

    def work(job: jobs.Job) -> List[Clip]:
        rendered = engine.extend(request, source, settings.audio_dir, jobs.make_progress(job))
        return jobs.register_clips(job, rendered, prefix="ext")

    job = jobs.manager.submit("extend", engine.name, work)
    return job.response(jobs.manager.queue_position(job))


@app.post("/v1/cover", response_model=JobResponse, dependencies=[Depends(require_key)])
def cover(request: CoverRequest, x_sonara_engine: Optional[str] = Header(default=None)) -> JobResponse:
    engine = pick_engine(x_sonara_engine or "", request.model)
    if not engine.supports_cover:
        raise HTTPException(status_code=400, detail=f"{engine.name} cannot create covers")
    source = store.audio_path(request.clip_id) if request.clip_id else None

    def work(job: jobs.Job) -> List[Clip]:
        rendered = engine.cover(request, source, settings.audio_dir, jobs.make_progress(job))
        return jobs.register_clips(job, rendered, prefix="cover")

    job = jobs.manager.submit("cover", engine.name, work)
    return job.response(jobs.manager.queue_position(job))


@app.post("/v1/stems", response_model=JobResponse, dependencies=[Depends(require_key)])
def split_stems(request: StemsRequest) -> JobResponse:
    source = store.audio_path(request.clip_id)
    if source is None:
        raise HTTPException(status_code=404, detail="Unknown clip id")

    def work(job: jobs.Job) -> List[Clip]:
        progress = jobs.make_progress(job)
        progress(0.1, "separating")
        rendered, method = stems.separate(source, request.mode, settings.audio_dir / "stems" / job.id)
        progress(0.9, f"separated with {method}")
        return jobs.register_clips(job, rendered, prefix="stem")

    job = jobs.manager.submit("stems", "stems", work)
    return job.response(jobs.manager.queue_position(job))


@app.get("/v1/jobs/{job_id}", response_model=JobResponse)
def job_status(job_id: str) -> JobResponse:
    job = jobs.manager.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Unknown job")
    return job.response(jobs.manager.queue_position(job))


@app.delete("/v1/jobs/{job_id}")
def cancel_job(job_id: str) -> JSONResponse:
    ok = jobs.manager.cancel(job_id)
    return JSONResponse({"cancelled": ok})


@app.get("/v1/jobs")
def recent_jobs() -> JSONResponse:
    return JSONResponse(
        {
            "jobs": [
                {
                    "id": job.id,
                    "kind": job.kind,
                    "status": job.status,
                    "progress": round(job.progress, 3),
                    "stage": job.stage,
                    "engine": job.engine,
                    "error": job.error,
                }
                for job in jobs.manager.all_jobs()[:50]
            ]
        }
    )


# --------------------------------------------------------------------- lyrics


@app.post("/v1/lyrics", response_model=LyricsResponse, dependencies=[Depends(require_key)])
def write_lyrics(request: LyricsRequest) -> LyricsResponse:
    if len(request.prompt.strip()) < 3:
        raise HTTPException(status_code=422, detail="Describe the song first")
    return lyrics.write(request)


# ---------------------------------------------------------------------- media


@app.get("/v1/audio/{clip_id}.mp3")
def audio(clip_id: str) -> FileResponse:
    path = store.audio_path(clip_id)
    if path is None:
        raise HTTPException(status_code=404, detail="Unknown clip")
    return FileResponse(path, media_type="audio/mpeg", filename=f"{clip_id}.mp3")


@app.get("/v1/cover/{clip_id}.jpg")
def cover_art(clip_id: str) -> FileResponse:
    path = store.cover_path(clip_id)
    if path is None:
        raise HTTPException(status_code=404, detail="No cover for this clip")
    return FileResponse(path, media_type="image/jpeg")


@app.get("/v1/clips")
def clips() -> JSONResponse:
    return JSONResponse({"clips": [clip.model_dump() for clip in store.all_clips()]})


@app.post("/v1/upload", response_model=UploadResponse, dependencies=[Depends(require_key)])
async def upload(file: UploadFile = File(...)) -> UploadResponse:
    settings.ensure_dirs()
    reference_id = uuid.uuid4().hex
    suffix = Path(file.filename or "clip.mp3").suffix or ".mp3"
    target = settings.upload_dir / f"{reference_id}{suffix}"
    with open(target, "wb") as handle:
        shutil.copyfileobj(file.file, handle)
    return UploadResponse(
        reference_audio_id=reference_id,
        duration_seconds=audio_io.probe_duration(target),
    )


@app.get("/")
def root(request: Request) -> JSONResponse:
    return JSONResponse(
        {
            "name": "Sonara server",
            "version": VERSION,
            "docs": str(request.base_url) + "docs",
            "engines": [engine.name for engine in engines.available_engines()],
        }
    )

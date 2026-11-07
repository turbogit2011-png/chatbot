"""Job queue.

Rendering is CPU- or GPU-bound and single-tenant, so a thread pool with a
configurable width is the right size of machinery here: jobs survive the request
that created them, progress is observable, and the Android client polls.
"""
from __future__ import annotations

import threading
import time
import traceback
import uuid
from concurrent.futures import Future, ThreadPoolExecutor
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Dict, List, Optional

from . import engines, store
from .config import settings
from .models import Clip, JobResponse


@dataclass
class Job:
    id: str
    kind: str
    status: str = "queued"
    progress: float = 0.0
    stage: Optional[str] = "queued"
    clips: List[Clip] = field(default_factory=list)
    error: Optional[str] = None
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)
    engine: str = ""
    future: Optional[Future] = None

    def response(self, queue_position: Optional[int] = None) -> JobResponse:
        return JobResponse(
            id=self.id,
            status=self.status,  # type: ignore[arg-type]
            progress=round(self.progress, 4),
            stage=self.stage,
            clips=self.clips,
            error=self.error,
            queue_position=queue_position,
        )


class JobManager:
    def __init__(self) -> None:
        self._jobs: Dict[str, Job] = {}
        self._lock = threading.Lock()
        self._pool = ThreadPoolExecutor(
            max_workers=max(1, settings.max_concurrency),
            thread_name_prefix="sonara-render",
        )

    # ------------------------------------------------------------------ public

    def submit(
        self,
        kind: str,
        engine_name: str,
        work: Callable[[Job], List[Clip]],
    ) -> Job:
        job = Job(id=uuid.uuid4().hex, kind=kind, engine=engine_name)
        with self._lock:
            self._jobs[job.id] = job
        job.future = self._pool.submit(self._run, job, work)
        return job

    def get(self, job_id: str) -> Optional[Job]:
        with self._lock:
            return self._jobs.get(job_id)

    def queue_depth(self) -> int:
        with self._lock:
            return sum(1 for job in self._jobs.values() if job.status in {"queued", "running"})

    def queue_position(self, job: Job) -> Optional[int]:
        if job.status != "queued":
            return None
        with self._lock:
            waiting = sorted(
                (j for j in self._jobs.values() if j.status == "queued"),
                key=lambda j: j.created_at,
            )
        for index, candidate in enumerate(waiting):
            if candidate.id == job.id:
                return index + 1
        return None

    def cancel(self, job_id: str) -> bool:
        job = self.get(job_id)
        if not job or not job.future:
            return False
        cancelled = job.future.cancel()
        if cancelled:
            job.status = "cancelled"
            job.stage = "cancelled"
            job.updated_at = time.time()
        return cancelled

    def prune(self) -> None:
        cutoff = time.time() - settings.keep_jobs_hours * 3600
        with self._lock:
            stale = [
                job_id
                for job_id, job in self._jobs.items()
                if job.updated_at < cutoff and job.status in {"succeeded", "failed", "cancelled"}
            ]
            for job_id in stale:
                self._jobs.pop(job_id, None)

    def all_jobs(self) -> List[Job]:
        with self._lock:
            return sorted(self._jobs.values(), key=lambda j: -j.created_at)

    # ----------------------------------------------------------------- runner

    def _run(self, job: Job, work: Callable[[Job], List[Clip]]) -> None:
        job.status = "running"
        job.stage = "starting"
        job.updated_at = time.time()
        try:
            clips = work(job)
            job.clips = clips
            job.progress = 1.0
            job.stage = "done"
            job.status = "succeeded"
        except Exception as exc:  # noqa: BLE001 - surfaced to the client verbatim
            job.status = "failed"
            job.stage = "failed"
            job.error = f"{type(exc).__name__}: {exc}"
            traceback.print_exc()
        finally:
            job.updated_at = time.time()


manager = JobManager()


def make_progress(job: Job):
    """Progress callback handed to engines."""

    def progress(value: float, stage: str = "") -> None:
        job.progress = max(0.0, min(1.0, float(value)))
        if stage:
            job.stage = stage
        job.updated_at = time.time()

    return progress


def register_clips(job: Job, rendered, prefix: str = "") -> List[Clip]:
    """Moves engine output into the audio directory and records it."""
    settings.ensure_dirs()
    clips: List[Clip] = []
    for index, item in enumerate(rendered):
        clip_id = f"{job.id[:12]}-{index + 1}" if not prefix else f"{prefix}-{job.id[:8]}-{index + 1}"
        target = settings.audio_dir / f"{clip_id}.mp3"
        source = Path(item.path)
        if source.resolve() != target.resolve():
            target.parent.mkdir(parents=True, exist_ok=True)
            # Cover art is written next to the engine's own file name, so it has to
            # follow the audio when the clip is given its public id.
            engine_cover = settings.cover_dir / f"{source.stem}.jpg"
            if engine_cover.exists():
                engine_cover.replace(settings.cover_dir / f"{clip_id}.jpg")
            # Engine-rendered stem buses follow too, so /v1/stems can reuse them.
            for bus in source.parent.glob(source.stem + "-*.wav"):
                bus.replace(bus.with_name(bus.name.replace(source.stem, clip_id, 1)))
            if source.parent == target.parent:
                source.replace(target)
            else:
                _copy(source, target)
            item.path = target
        clips.append(store.record(clip_id, item, job.id))
    return clips


def _copy(source: Path, target: Path) -> None:
    import shutil

    shutil.copy2(source, target)
    source.unlink(missing_ok=True)

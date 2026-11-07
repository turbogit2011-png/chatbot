"""Engine contract.

An engine turns a request into one or more rendered audio files. Everything else in
the server (queueing, HTTP, storage, the Android client) is engine-agnostic, so adding
a new model means adding one module here and registering it.
"""
from __future__ import annotations

import abc
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, List, Optional

from ..models import CoverRequest, ExtendRequest, GenerateRequest, ModelInfo

ProgressFn = Callable[[float, str], None]


@dataclass
class RenderedClip:
    path: Path
    title: str
    duration_seconds: float
    lyrics: Optional[str] = None
    style: Optional[str] = None
    style_tags: List[str] = field(default_factory=list)
    instrumental: bool = False
    variant: int = 1
    seed: Optional[int] = None
    role: str = "song"
    model: Optional[str] = None


class Engine(abc.ABC):
    """Base class for every generation backend."""

    name: str = "engine"
    description: str = ""
    supports_vocals: bool = True
    supports_extend: bool = False
    supports_cover: bool = False
    supports_stems: bool = False
    max_duration_seconds: int = 240

    @abc.abstractmethod
    def available(self) -> bool:
        """True when this engine can actually render on this machine right now."""

    @abc.abstractmethod
    def models(self) -> List[ModelInfo]:
        """Model identifiers the client may ask for."""

    @abc.abstractmethod
    def generate(
        self,
        request: GenerateRequest,
        out_dir: Path,
        progress: ProgressFn,
    ) -> List[RenderedClip]:
        """Render a brand new song."""

    def extend(
        self,
        request: ExtendRequest,
        source_audio: Optional[Path],
        out_dir: Path,
        progress: ProgressFn,
    ) -> List[RenderedClip]:
        raise NotImplementedError(f"{self.name} cannot extend tracks")

    def cover(
        self,
        request: CoverRequest,
        source_audio: Optional[Path],
        out_dir: Path,
        progress: ProgressFn,
    ) -> List[RenderedClip]:
        raise NotImplementedError(f"{self.name} cannot create covers")

    def device(self) -> str:
        return "cpu"

    def warmup(self) -> None:
        """Optional: load weights ahead of the first request."""

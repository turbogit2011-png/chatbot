"""Engine registry and selection."""
from __future__ import annotations

from typing import Dict, List, Optional

from ..config import settings
from ..models import ModelInfo
from .base import Engine, RenderedClip

_REGISTRY: Dict[str, Engine] = {}
_ORDER: List[str] = []


def _register(engine: Engine) -> None:
    _REGISTRY[engine.name] = engine
    _ORDER.append(engine.name)


def _bootstrap() -> None:
    if _REGISTRY:
        return
    # Order matters: the first available engine wins when SONARA_ENGINE=auto.
    from .ace_step import AceStepEngine
    from .musicgen import MusicGenEngine
    from .offline import OfflineEngine
    from .remote import RemoteEngine

    _register(RemoteEngine())
    _register(AceStepEngine())
    _register(MusicGenEngine())
    _register(OfflineEngine())


def all_engines() -> List[Engine]:
    _bootstrap()
    return [_REGISTRY[name] for name in _ORDER]


def available_engines() -> List[Engine]:
    return [engine for engine in all_engines() if engine.available()]


def get(name: str) -> Optional[Engine]:
    _bootstrap()
    return _REGISTRY.get(name)


def select(preferred: str = "", model: str = "") -> Engine:
    """Picks the engine to use for a request.

    Resolution order: explicit per-request engine header, then the model id the
    client asked for, then SONARA_ENGINE, then the first available engine.
    """
    _bootstrap()
    for candidate in (preferred, settings.engine):
        if candidate and candidate not in ("", "auto"):
            engine = _REGISTRY.get(candidate)
            if engine is None:
                raise ValueError(f"Unknown engine '{candidate}'")
            if not engine.available():
                raise RuntimeError(f"Engine '{candidate}' is not usable on this machine")
            return engine
    if model:
        for engine in all_engines():
            if any(info.id == model for info in engine.models()) and engine.available():
                return engine
    usable = available_engines()
    if not usable:
        raise RuntimeError("No generation engine is available on this machine")
    return usable[0]


def models() -> List[ModelInfo]:
    out: List[ModelInfo] = []
    for engine in available_engines():
        out.extend(engine.models())
    return out


__all__ = [
    "Engine",
    "RenderedClip",
    "all_engines",
    "available_engines",
    "get",
    "select",
    "models",
]

"""Wire format shared with the Android client."""
from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class GenerateRequest(BaseModel):
    prompt: Optional[str] = None
    lyrics: Optional[str] = None
    title: Optional[str] = None
    style: Optional[str] = None
    negative_style: Optional[str] = None
    instrumental: bool = False
    model: str = "sonara-v1"
    duration_seconds: int = Field(default=180, ge=10, le=600)
    style_weight: float = Field(default=0.6, ge=0.0, le=1.0)
    weirdness: float = Field(default=0.35, ge=0.0, le=1.0)
    lyrics_weight: float = Field(default=0.6, ge=0.0, le=1.0)
    language: Optional[str] = None
    vocal_gender: Optional[str] = None
    tempo_bpm: Optional[int] = Field(default=None, ge=40, le=240)
    key_signature: Optional[str] = None
    seed: Optional[int] = None
    num_variations: int = Field(default=2, ge=1, le=4)
    reference_audio_id: Optional[str] = None
    persona_id: Optional[str] = None


class ExtendRequest(BaseModel):
    clip_id: str
    continue_at_seconds: float = 0.0
    lyrics: Optional[str] = None
    style: Optional[str] = None
    duration_seconds: int = Field(default=120, ge=10, le=600)
    model: str = "sonara-v1"
    num_variations: int = Field(default=1, ge=1, le=4)


class CoverRequest(BaseModel):
    clip_id: Optional[str] = None
    reference_audio_id: Optional[str] = None
    style: str
    lyrics: Optional[str] = None
    keep_vocals: bool = False
    model: str = "sonara-v1"
    num_variations: int = Field(default=2, ge=1, le=4)


class StemsRequest(BaseModel):
    clip_id: str
    mode: Literal["two_stem", "four_stem"] = "two_stem"


class LyricsRequest(BaseModel):
    prompt: str
    language: str = "auto"
    style: Optional[str] = None
    structure_tags: bool = True


class LyricsResponse(BaseModel):
    title: str
    lyrics: str
    style_tags: List[str] = []


class Clip(BaseModel):
    id: str
    title: str = "Untitled"
    audio_url: Optional[str] = None
    stream_url: Optional[str] = None
    image_url: Optional[str] = None
    duration_seconds: float = 0.0
    lyrics: Optional[str] = None
    style_tags: List[str] = []
    style: Optional[str] = None
    model: Optional[str] = None
    instrumental: bool = False
    variant: int = 1
    role: str = "song"
    seed: Optional[int] = None
    created_at: Optional[str] = None


class JobResponse(BaseModel):
    id: str
    status: Literal["queued", "running", "succeeded", "failed", "cancelled"]
    progress: float = 0.0
    stage: Optional[str] = None
    clips: List[Clip] = []
    error: Optional[str] = None
    queue_position: Optional[int] = None


class ModelInfo(BaseModel):
    id: str
    name: str
    description: str = ""
    max_duration_seconds: int = 240
    supports_vocals: bool = True
    supports_extend: bool = True
    supports_stems: bool = False
    engine: str = ""


class ModelsResponse(BaseModel):
    models: List[ModelInfo] = []


class HealthResponse(BaseModel):
    status: str = "ok"
    engine: str = ""
    version: str = ""
    device: str = ""
    queue_depth: int = 0


class UploadResponse(BaseModel):
    reference_audio_id: str
    duration_seconds: float = 0.0

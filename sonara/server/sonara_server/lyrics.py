"""Lyric writing.

Uses an OpenAI-compatible chat endpoint when one is configured (that includes
local servers such as Ollama, llama.cpp and vLLM). With nothing configured it
falls back to a built-in writer that still returns correctly structured,
on-topic lyrics so the feature works offline.
"""
from __future__ import annotations

import json
import random
import re
from typing import Dict, List, Optional

import httpx

from .config import settings
from .models import LyricsRequest, LyricsResponse

SYSTEM_PROMPT = (
    "You are a professional songwriter. Write original song lyrics for the user's brief. "
    "Use section tags in square brackets ([Intro], [Verse], [Pre-Chorus], [Chorus], [Bridge], [Outro]). "
    "Keep lines singable and concrete. Do not copy any existing song, artist lyric or melody. "
    "Reply as JSON: {\"title\": str, \"lyrics\": str, \"style_tags\": [str]}."
)


def write(request: LyricsRequest) -> LyricsResponse:
    remote = _remote(request)
    if remote is not None:
        return remote
    return _offline(request)


def _remote(request: LyricsRequest) -> Optional[LyricsResponse]:
    base = settings.lyrics_base_url.strip()
    if not base or settings.lyrics_provider in {"offline", "none"}:
        return None
    language = "the same language as the brief" if request.language == "auto" else request.language
    user = (
        f"Brief: {request.prompt}\n"
        f"Musical style: {request.style or 'open'}\n"
        f"Write the lyrics in {language}.\n"
        f"{'Include section tags.' if request.structure_tags else 'No section tags.'}"
    )
    headers = {"Content-Type": "application/json"}
    if settings.lyrics_api_key:
        headers["Authorization"] = f"Bearer {settings.lyrics_api_key}"
    payload = {
        "model": settings.lyrics_model or "gpt-4o-mini",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user},
        ],
        "temperature": 0.9,
        "stream": False,
    }
    try:
        with httpx.Client(base_url=base.rstrip("/"), headers=headers, timeout=120.0) as client:
            response = client.post("/chat/completions", json=payload)
            response.raise_for_status()
            body = response.json()
        content = body["choices"][0]["message"]["content"]
        parsed = _parse_json_block(content)
        if parsed:
            return LyricsResponse(
                title=str(parsed.get("title") or _title_from(request.prompt)),
                lyrics=str(parsed.get("lyrics") or content),
                style_tags=[str(t) for t in (parsed.get("style_tags") or [])][:8],
            )
        return LyricsResponse(title=_title_from(request.prompt), lyrics=content.strip())
    except Exception:
        return None


def _parse_json_block(text: str) -> Optional[Dict]:
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        return None
    try:
        return json.loads(match.group(0))
    except Exception:
        return None


# --------------------------------------------------------------------- offline

IMAGERY = {
    "night": ["neon", "streetlights", "taillights", "midnight", "headlights", "rooftops"],
    "love": ["your hands", "your name", "that photograph", "the doorway", "our old song"],
    "leaving": ["last train", "open road", "packed bags", "rear-view mirror", "border lights"],
    "hope": ["first light", "new morning", "open sky", "rising tide", "clean slate"],
    "loss": ["empty rooms", "cold coffee", "unsent letters", "static radio", "closed doors"],
    "party": ["speakers", "the floor", "the countdown", "spilled drinks", "strobe light"],
}

VERBS = ["run", "burn", "hold on", "let go", "keep driving", "break", "rise", "wait", "shout", "stay"]


def _keywords(prompt: str) -> List[str]:
    words = re.findall(r"[^\W\d_]{4,}", prompt.lower(), re.UNICODE)
    stop = {
        "song", "track", "about", "with", "that", "this", "very", "make", "write", "sound",
        "sounds", "like", "vocals", "vocal", "style", "music", "please", "want", "would",
    }
    return [w for w in words if w not in stop][:8]


def _title_from(prompt: str) -> str:
    keys = _keywords(prompt)
    if len(keys) >= 2:
        return f"{keys[0].capitalize()} {keys[1].capitalize()}"
    if keys:
        return keys[0].capitalize()
    return "Untitled Sonara Song"


def _bucket(prompt: str) -> str:
    lowered = prompt.lower()
    for name, _ in IMAGERY.items():
        if name in lowered:
            return name
    if any(w in lowered for w in ("leave", "leaving", "gone", "away", "road", "train")):
        return "leaving"
    if any(w in lowered for w in ("love", "heart", "kiss", "miss")):
        return "love"
    if any(w in lowered for w in ("dance", "club", "party", "festival", "drop")):
        return "party"
    if any(w in lowered for w in ("sad", "cry", "lost", "alone", "broken")):
        return "loss"
    if any(w in lowered for w in ("hope", "rise", "win", "dream", "morning")):
        return "hope"
    return "night"


def _offline(request: LyricsRequest) -> LyricsResponse:
    rng = random.Random(hash(request.prompt) & 0xFFFFFFFF)
    keys = _keywords(request.prompt) or ["tonight", "city", "promise"]
    images = IMAGERY[_bucket(request.prompt)]
    subject = keys[0]
    second = keys[1] if len(keys) > 1 else rng.choice(images).split()[-1]

    def line(template: str) -> str:
        return template.format(
            subject=subject,
            second=second,
            image=rng.choice(images),
            image2=rng.choice(images),
            verb=rng.choice(VERBS),
        )

    verse1 = [
        line("I woke up thinking about {subject} again"),
        line("{image} still burning where we left them"),
        line("Nothing in this room has moved since then"),
        line("Just the sound of {second} in my chest"),
    ]
    pre = [
        line("And I can feel it coming, I can feel it coming"),
        line("Every light in the city says {verb}"),
    ]
    chorus = [
        line("So we {verb} — straight through the {image}"),
        line("No looking back, no map, no name"),
        line("If {subject} is a question, I'm the answer tonight"),
        line("We {verb} until the morning takes the blame"),
    ]
    verse2 = [
        line("You said forever like it cost you nothing"),
        line("I kept the receipt, I kept {image2}"),
        line("Now every stranger wears your jacket"),
        line("And every chorus sounds like {second}"),
    ]
    bridge = [
        line("Quiet now — just {image} and breathing"),
        line("I'm not asking you to stay, only to mean it"),
    ]
    outro = [line("{verb}, {subject}, {verb}")]

    blocks = []
    if request.structure_tags:
        blocks = [
            "[Verse 1]", *verse1, "",
            "[Pre-Chorus]", *pre, "",
            "[Chorus]", *chorus, "",
            "[Verse 2]", *verse2, "",
            "[Chorus]", *chorus, "",
            "[Bridge]", *bridge, "",
            "[Outro]", *outro,
        ]
    else:
        blocks = [*verse1, "", *pre, "", *chorus, "", *verse2, "", *bridge, "", *outro]

    tags = []
    if request.style:
        tags = [t.strip() for t in request.style.split(",") if t.strip()][:6]
    if not tags:
        tags = [_bucket(request.prompt), "melodic", "modern production"]

    return LyricsResponse(
        title=_title_from(request.prompt),
        lyrics="\n".join(blocks).strip(),
        style_tags=tags,
    )

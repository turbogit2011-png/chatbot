"""Procedural composer used by the offline engine.

This is a real arranger, not a noise generator: it picks a key, a tempo and a chord
progression from the requested style, lays out song sections, then performs drums,
bass, chords, lead and a formant-synth vocal line, and mixes the result.
"""
from __future__ import annotations

import math
import random
import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Sequence, Tuple

import numpy as np

from . import dsp

SR = dsp.SR

midi_to_hz = dsp.midi_to_hz

MAJOR = [0, 2, 4, 5, 7, 9, 11]
MINOR = [0, 2, 3, 5, 7, 8, 10]
DORIAN = [0, 2, 3, 5, 7, 9, 10]
PHRYGIAN = [0, 1, 3, 5, 7, 8, 10]
PENTA_MINOR = [0, 3, 5, 7, 10]
PENTA_MAJOR = [0, 2, 4, 7, 9]

PROGRESSIONS: Dict[str, List[List[int]]] = {
    "pop": [[0, 5, 3, 4], [0, 4, 5, 3], [5, 3, 0, 4]],
    "sad": [[5, 3, 0, 4], [0, 3, 5, 4], [5, 2, 3, 4]],
    "epic": [[0, 5, 1, 4], [5, 3, 4, 0], [0, 4, 1, 5]],
    "jazz": [[1, 4, 0, 5], [2, 5, 0, 3], [1, 4, 0, 0]],
    "edm": [[5, 3, 0, 4], [0, 4, 5, 3], [3, 4, 0, 5]],
    "trap": [[5, 5, 3, 4], [5, 3, 5, 4], [0, 5, 3, 3]],
    "blues": [[0, 0, 3, 0], [3, 0, 4, 0]],
    "folk": [[0, 4, 5, 3], [0, 3, 4, 4]],
    "gospel": [[0, 3, 4, 0], [0, 5, 3, 4]],
    "cinematic": [[5, 3, 0, 4], [0, 5, 4, 4]],
}

GENRE_TABLE: Dict[str, Dict[str, object]] = {
    "pop": dict(bpm=112, scale=MAJOR, prog="pop", kit="acoustic", lead="pluck", pad="warm"),
    "synthwave": dict(bpm=108, scale=MINOR, prog="sad", kit="electronic", lead="supersaw", pad="analog"),
    "edm": dict(bpm=128, scale=MINOR, prog="edm", kit="electronic", lead="supersaw", pad="analog"),
    "house": dict(bpm=124, scale=MINOR, prog="edm", kit="fourfloor", lead="stab", pad="analog"),
    "deep house": dict(bpm=122, scale=DORIAN, prog="edm", kit="fourfloor", lead="stab", pad="warm"),
    "techno": dict(bpm=132, scale=PHRYGIAN, prog="trap", kit="fourfloor", lead="stab", pad="dark"),
    "trance": dict(bpm=138, scale=MINOR, prog="edm", kit="fourfloor", lead="supersaw", pad="analog"),
    "dnb": dict(bpm=174, scale=MINOR, prog="edm", kit="breaks", lead="supersaw", pad="dark"),
    "dubstep": dict(bpm=140, scale=PHRYGIAN, prog="trap", kit="electronic", lead="growl", pad="dark"),
    "trap": dict(bpm=142, scale=PENTA_MINOR, prog="trap", kit="trap", lead="bell", pad="dark"),
    "drill": dict(bpm=144, scale=PHRYGIAN, prog="trap", kit="trap", lead="bell", pad="dark"),
    "phonk": dict(bpm=130, scale=PHRYGIAN, prog="trap", kit="trap", lead="bell", pad="dark"),
    "hip hop": dict(bpm=92, scale=PENTA_MINOR, prog="trap", kit="boombap", lead="pluck", pad="warm"),
    "lo-fi": dict(bpm=82, scale=DORIAN, prog="jazz", kit="boombap", lead="piano", pad="warm"),
    "jazz": dict(bpm=104, scale=DORIAN, prog="jazz", kit="brushes", lead="piano", pad="warm"),
    "swing": dict(bpm=150, scale=MAJOR, prog="jazz", kit="brushes", lead="piano", pad="warm"),
    "blues": dict(bpm=88, scale=PENTA_MINOR, prog="blues", kit="brushes", lead="guitar", pad="warm"),
    "soul": dict(bpm=96, scale=MAJOR, prog="gospel", kit="acoustic", lead="piano", pad="warm"),
    "funk": dict(bpm=108, scale=DORIAN, prog="jazz", kit="acoustic", lead="stab", pad="warm"),
    "r&b": dict(bpm=88, scale=MINOR, prog="sad", kit="boombap", lead="piano", pad="warm"),
    "disco": dict(bpm=120, scale=MAJOR, prog="pop", kit="fourfloor", lead="stab", pad="analog"),
    "disco polo": dict(bpm=128, scale=MAJOR, prog="pop", kit="fourfloor", lead="supersaw", pad="analog"),
    "reggae": dict(bpm=76, scale=MINOR, prog="pop", kit="acoustic", lead="stab", pad="warm"),
    "reggaeton": dict(bpm=94, scale=MINOR, prog="trap", kit="dembow", lead="stab", pad="warm"),
    "afrobeats": dict(bpm=104, scale=MAJOR, prog="pop", kit="dembow", lead="pluck", pad="warm"),
    "latin": dict(bpm=100, scale=MINOR, prog="pop", kit="dembow", lead="guitar", pad="warm"),
    "rock": dict(bpm=132, scale=MAJOR, prog="pop", kit="rock", lead="guitar", pad="none"),
    "indie rock": dict(bpm=124, scale=MAJOR, prog="pop", kit="rock", lead="guitar", pad="warm"),
    "punk": dict(bpm=168, scale=MAJOR, prog="pop", kit="rock", lead="guitar", pad="none"),
    "metal": dict(bpm=150, scale=PHRYGIAN, prog="trap", kit="rock", lead="guitar", pad="dark"),
    "metalcore": dict(bpm=160, scale=PHRYGIAN, prog="trap", kit="rock", lead="guitar", pad="dark"),
    "grunge": dict(bpm=118, scale=MINOR, prog="sad", kit="rock", lead="guitar", pad="none"),
    "country": dict(bpm=110, scale=MAJOR, prog="folk", kit="acoustic", lead="guitar", pad="none"),
    "folk": dict(bpm=96, scale=MAJOR, prog="folk", kit="brushes", lead="guitar", pad="none"),
    "bluegrass": dict(bpm=140, scale=MAJOR, prog="folk", kit="brushes", lead="pluck", pad="none"),
    "gospel": dict(bpm=88, scale=MAJOR, prog="gospel", kit="acoustic", lead="piano", pad="warm"),
    "classical": dict(bpm=84, scale=MAJOR, prog="epic", kit="none", lead="strings", pad="strings"),
    "orchestral": dict(bpm=90, scale=MINOR, prog="epic", kit="cinematic", lead="strings", pad="strings"),
    "cinematic": dict(bpm=86, scale=MINOR, prog="cinematic", kit="cinematic", lead="strings", pad="strings"),
    "ambient": dict(bpm=68, scale=DORIAN, prog="sad", kit="none", lead="bell", pad="analog"),
    "chillout": dict(bpm=92, scale=DORIAN, prog="jazz", kit="electronic", lead="bell", pad="warm"),
    "k-pop": dict(bpm=120, scale=MAJOR, prog="pop", kit="electronic", lead="supersaw", pad="analog"),
    "j-pop": dict(bpm=126, scale=MAJOR, prog="pop", kit="electronic", lead="pluck", pad="analog"),
    "hyperpop": dict(bpm=160, scale=MAJOR, prog="edm", kit="electronic", lead="supersaw", pad="analog"),
    "chiptune": dict(bpm=150, scale=MAJOR, prog="pop", kit="electronic", lead="square", pad="none"),
    "opera": dict(bpm=78, scale=MINOR, prog="epic", kit="none", lead="strings", pad="strings"),
    "musical theatre": dict(bpm=104, scale=MAJOR, prog="epic", kit="acoustic", lead="piano", pad="strings"),
}

MOOD_HINTS = {
    "dark": dict(scale=PHRYGIAN, bpm_delta=-4, reverb=0.3, bright=0.8),
    "melancholic": dict(scale=MINOR, bpm_delta=-8, reverb=0.34, bright=0.85),
    "sad": dict(scale=MINOR, bpm_delta=-10, reverb=0.35, bright=0.8),
    "euphoric": dict(scale=MAJOR, bpm_delta=6, reverb=0.26, bright=1.15),
    "epic": dict(bpm_delta=2, reverb=0.4, bright=1.1),
    "aggressive": dict(scale=PHRYGIAN, bpm_delta=10, reverb=0.16, bright=1.2),
    "dreamy": dict(bpm_delta=-6, reverb=0.45, bright=0.95),
    "nostalgic": dict(bpm_delta=-4, reverb=0.38, bright=0.9),
    "romantic": dict(scale=MAJOR, bpm_delta=-6, reverb=0.34, bright=1.0),
    "anthemic": dict(bpm_delta=4, reverb=0.3, bright=1.12),
    "hypnotic": dict(bpm_delta=0, reverb=0.32, bright=0.95),
    "triumphant": dict(scale=MAJOR, bpm_delta=4, reverb=0.35, bright=1.15),
    "haunting": dict(scale=PHRYGIAN, bpm_delta=-10, reverb=0.5, bright=0.8),
    "intimate": dict(bpm_delta=-10, reverb=0.22, bright=0.9),
    "uplifting": dict(scale=MAJOR, bpm_delta=5, reverb=0.3, bright=1.12),
    "playful": dict(scale=PENTA_MAJOR, bpm_delta=6, reverb=0.24, bright=1.1),
    "gritty": dict(bpm_delta=2, reverb=0.18, bright=1.05),
    "cold": dict(bpm_delta=-2, reverb=0.4, bright=0.85),
    "warm": dict(bpm_delta=-2, reverb=0.28, bright=0.95),
}

SECTION_ORDER_LONG = [
    ("intro", 8), ("verse", 16), ("pre", 8), ("chorus", 16),
    ("verse", 16), ("pre", 8), ("chorus", 16), ("bridge", 8),
    ("chorus", 16), ("outro", 8),
]
SECTION_ORDER_MID = [
    ("intro", 4), ("verse", 16), ("chorus", 16), ("verse", 16), ("chorus", 16), ("outro", 8),
]
SECTION_ORDER_SHORT = [("intro", 4), ("verse", 8), ("chorus", 16), ("outro", 4)]


@dataclass
class StyleProfile:
    bpm: int = 112
    scale: Sequence[int] = field(default_factory=lambda: MAJOR)
    root: int = 57  # A3
    progression: List[int] = field(default_factory=lambda: [0, 5, 3, 4])
    kit: str = "acoustic"
    lead: str = "pluck"
    pad: str = "warm"
    reverb: float = 0.3
    bright: float = 1.0
    swing: float = 0.0
    density: float = 0.6
    tags: List[str] = field(default_factory=list)
    vocal_octave: int = 0
    instrumental: bool = False


def _tokens(text: str) -> List[str]:
    return re.findall(r"[a-z0-9&'\-]+(?: [a-z0-9&'\-]+)?", (text or "").lower())


def build_profile(
    style: str,
    prompt: str,
    seed: int,
    tempo_bpm: Optional[int] = None,
    weirdness: float = 0.35,
    instrumental: bool = False,
    vocal_gender: Optional[str] = None,
) -> StyleProfile:
    rng = random.Random(seed)
    text = f"{style or ''} {prompt or ''}".lower()
    profile = StyleProfile()
    profile.instrumental = instrumental

    matched: Optional[Dict[str, object]] = None
    matched_name = ""
    for genre, conf in sorted(GENRE_TABLE.items(), key=lambda kv: -len(kv[0])):
        if genre in text:
            matched, matched_name = conf, genre
            break
    if matched is None:
        matched, matched_name = GENRE_TABLE["pop"], "pop"

    profile.bpm = int(matched["bpm"])  # type: ignore[index]
    profile.scale = matched["scale"]  # type: ignore[index]
    profile.kit = str(matched["kit"])  # type: ignore[index]
    profile.lead = str(matched["lead"])  # type: ignore[index]
    profile.pad = str(matched["pad"])  # type: ignore[index]
    prog_pool = PROGRESSIONS[str(matched["prog"])]  # type: ignore[index]
    profile.progression = list(rng.choice(prog_pool))
    profile.tags = [matched_name]

    for mood, hint in MOOD_HINTS.items():
        if mood in text:
            profile.tags.append(mood)
            if "scale" in hint:
                profile.scale = hint["scale"]  # type: ignore[assignment]
            profile.bpm += int(hint.get("bpm_delta", 0))  # type: ignore[arg-type]
            profile.reverb = float(hint.get("reverb", profile.reverb))
            profile.bright = float(hint.get("bright", profile.bright))

    if tempo_bpm:
        profile.bpm = int(tempo_bpm)
    profile.bpm = max(48, min(200, profile.bpm))

    if matched_name in {"jazz", "swing", "blues", "lo-fi"}:
        profile.swing = 0.22
    if "half time" in text or "halftime" in text:
        profile.bpm = max(60, profile.bpm // 2 * 2)

    # Weirdness nudges the key, the progression and the amount of motion.
    profile.root = 52 + rng.randrange(0, 12)
    if weirdness > 0.6:
        profile.progression = [rng.randrange(0, 6) for _ in range(4)]
    profile.density = 0.45 + 0.45 * min(1.0, weirdness + 0.3)
    profile.reverb = max(0.08, min(0.55, profile.reverb + (weirdness - 0.35) * 0.2))

    if vocal_gender == "male":
        profile.vocal_octave = -1
    elif vocal_gender == "female":
        profile.vocal_octave = 0
    elif vocal_gender == "duet":
        profile.vocal_octave = 0

    for token in _tokens(style):
        if token not in profile.tags and len(profile.tags) < 8 and token.strip():
            profile.tags.append(token.strip())
    return profile


def chord_notes(profile: StyleProfile, degree: int, extended: bool = False) -> List[int]:
    scale = list(profile.scale)
    n = len(scale)
    picks = [0, 2, 4] + ([6] if extended else [])
    notes = []
    for p in picks:
        idx = degree + p
        octave = idx // n
        notes.append(profile.root + scale[idx % n] + 12 * octave)
    return notes


def scale_note(profile: StyleProfile, step: int) -> int:
    scale = list(profile.scale)
    n = len(scale)
    octave = step // n
    return profile.root + scale[step % n] + 12 * octave


# --------------------------------------------------------------------------- sections

@dataclass
class Section:
    name: str
    bars: int
    start_bar: int
    energy: float


def plan_sections(duration_seconds: int, profile: StyleProfile) -> List[Section]:
    beats_per_bar = 4
    seconds_per_bar = beats_per_bar * 60.0 / profile.bpm
    target_bars = max(8, int(round(duration_seconds / seconds_per_bar)))
    if target_bars >= 72:
        template = SECTION_ORDER_LONG
    elif target_bars >= 40:
        template = SECTION_ORDER_MID
    else:
        template = SECTION_ORDER_SHORT

    total_template = sum(b for _, b in template)
    scale_factor = target_bars / total_template
    sections: List[Section] = []
    cursor = 0
    energies = {
        "intro": 0.35, "verse": 0.6, "pre": 0.72, "chorus": 1.0,
        "bridge": 0.55, "outro": 0.4,
    }
    for name, bars in template:
        scaled = max(2, int(round(bars * scale_factor / 2) * 2))
        sections.append(Section(name, scaled, cursor, energies.get(name, 0.6)))
        cursor += scaled
    return sections


# --------------------------------------------------------------------------- lyrics

SYLLABLE_RE = re.compile(r"[aeiouyąęóAEIOUY]+", re.IGNORECASE)
VOWELS = {
    "a": (730, 1090, 2440),
    "e": (530, 1840, 2480),
    "i": (270, 2290, 3010),
    "o": (570, 840, 2410),
    "u": (300, 870, 2240),
    "y": (440, 1020, 2240),
}


def parse_lyric_sections(lyrics: str) -> Dict[str, List[str]]:
    """Splits tagged lyrics ([Verse], [Chorus], …) into blocks of lines."""
    blocks: Dict[str, List[str]] = {}
    current = "verse"
    for raw in (lyrics or "").splitlines():
        line = raw.strip()
        if not line:
            continue
        tag = re.match(r"^\[([^\]]+)\]", line)
        if tag:
            label = tag.group(1).lower()
            for key in ("chorus", "verse", "bridge", "pre", "intro", "outro", "hook", "drop"):
                if key in label:
                    current = "pre" if key == "pre" else ("chorus" if key in ("hook", "drop") else key)
                    break
            else:
                current = "verse"
            blocks.setdefault(current, [])
            rest = line[tag.end():].strip()
            if rest:
                blocks[current].append(rest)
            continue
        blocks.setdefault(current, []).append(line)
    return blocks


def syllables(line: str) -> List[str]:
    words = re.findall(r"[^\W\d_]+", line, re.UNICODE)
    out: List[str] = []
    for word in words:
        found = SYLLABLE_RE.findall(word)
        if not found:
            out.append("a")
        else:
            out.extend(v[0].lower() for v in found)
    return out[:48]


def sing(
    note_hz: float,
    length: int,
    vowel: str,
    bright: float = 1.0,
    vibrato: float = 4.5,
    breath: float = 0.12,
) -> np.ndarray:
    """Formant-based singing synth: a glottal-ish source through three resonances."""
    t = np.arange(length, dtype=np.float32) / SR
    vib = 1.0 + 0.012 * np.sin(2 * np.pi * vibrato * t) * np.minimum(1.0, t * 3)
    glide = 1.0 + 0.03 * np.exp(-14.0 * t)
    f0 = note_hz * vib * glide
    ph = 2 * np.pi * np.cumsum(f0) / SR
    source = (
        np.sin(ph)
        + 0.5 * np.sin(2 * ph)
        + 0.33 * np.sin(3 * ph)
        + 0.22 * np.sin(4 * ph)
        + 0.15 * np.sin(5 * ph)
    ).astype(np.float32)
    source += dsp.noise(length, int(note_hz) % 999) * breath
    f1, f2, f3 = VOWELS.get(vowel, VOWELS["a"])
    voiced = (
        dsp.filt(source, "bandpass", f1 * bright, q=4.0) * 1.0
        + dsp.filt(source, "bandpass", f2 * bright, q=6.0) * 0.55
        + dsp.filt(source, "bandpass", f3 * bright, q=8.0) * 0.28
    )
    env = dsp.adsr(length, attack=0.035, decay=0.09, sustain=0.78, release=0.14)
    return (voiced * env).astype(np.float32)

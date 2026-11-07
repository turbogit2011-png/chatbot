"""The offline engine: a complete procedural studio that runs on any CPU.

It arranges and performs a full song — drums, bass, harmony, lead and a
formant-synth vocal that follows the lyrics — then mixes and masters it.
No model weights, no GPU, no network. It is what makes the app usable before
you plug in a GPU engine, and it is also the reference implementation of the
Engine contract.
"""
from __future__ import annotations

import random
import re
import time
from pathlib import Path
from typing import Dict, List, Optional, Sequence, Tuple

import numpy as np

from .. import audio_io, covers, dsp, music
from ..config import settings
from ..models import CoverRequest, ExtendRequest, GenerateRequest, ModelInfo
from .base import Engine, ProgressFn, RenderedClip

SR = dsp.SR
STEPS = 16

# step grids are 16th notes over one bar
DRUM_KITS: Dict[str, Dict[str, Sequence[float]]] = {
    "acoustic": {
        "kick": [1, 0, 0, 0, 0, 0, .6, 0, 0, 0, 1, 0, 0, 0, 0, 0],
        "snare": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, .5],
        "hat": [.6, .3, .7, .3, .6, .3, .7, .3, .6, .3, .7, .3, .6, .3, .7, .45],
    },
    "rock": {
        "kick": [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, .7, 0, 0, 0, 0, 0],
        "snare": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, .6],
        "hat": [.8, 0, .5, 0, .8, 0, .5, 0, .8, 0, .5, 0, .8, 0, .5, .4],
        "tom": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, .5, .7],
    },
    "fourfloor": {
        "kick": [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
        "clap": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        "hat": [0, 0, .8, 0, 0, 0, .8, 0, 0, 0, .8, 0, 0, 0, .8, 0],
        "ohat": [0, 0, 0, 0, 0, 0, 0, .5, 0, 0, 0, 0, 0, 0, 0, .6],
    },
    "electronic": {
        "kick": [1, 0, 0, 0, 0, 0, .5, 0, 1, 0, 0, 0, 0, 0, .4, 0],
        "clap": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        "hat": [.5, .4, .7, .4, .5, .4, .7, .4, .5, .4, .7, .4, .5, .4, .7, .5],
    },
    "trap": {
        "kick": [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, .8, 0, 0, 1, 0, 0],
        "snare": [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
        "clap": [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
        "hat": [.7, .5, .7, .5, .7, .5, .7, .5, .7, .5, .7, .5, .7, .5, .7, .5],
    },
    "boombap": {
        "kick": [1, 0, 0, .5, 0, 0, 1, 0, 0, 0, .6, 0, 0, 0, 0, 0],
        "snare": [0, 0, 0, 0, 1, 0, 0, 0, 0, .4, 0, 0, 1, 0, 0, 0],
        "hat": [.6, 0, .5, 0, .6, 0, .5, 0, .6, 0, .5, 0, .6, 0, .5, .4],
    },
    "breaks": {
        "kick": [1, 0, 0, 0, 0, 0, .7, 0, 0, .6, 0, 0, 0, 0, 0, 0],
        "snare": [0, 0, 0, 0, 1, 0, 0, .4, 0, 0, 1, 0, 0, 0, .5, 0],
        "hat": [.5, .4, .6, .4, .5, .4, .6, .4, .5, .4, .6, .4, .5, .4, .6, .4],
    },
    "brushes": {
        "kick": [.7, 0, 0, 0, 0, 0, .4, 0, .6, 0, 0, 0, 0, 0, 0, 0],
        "snare": [.3, .2, .5, .2, .3, .2, .5, .2, .3, .2, .5, .2, .3, .2, .5, .3],
        "hat": [.4, 0, 0, 0, .5, 0, 0, 0, .4, 0, 0, 0, .5, 0, 0, .3],
    },
    "dembow": {
        "kick": [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0],
        "snare": [0, 0, 0, .6, 0, 0, 1, 0, 0, 0, 0, .6, 0, 0, 1, 0],
        "hat": [.5, .3, .5, .3, .5, .3, .5, .3, .5, .3, .5, .3, .5, .3, .5, .3],
    },
    "cinematic": {
        "kick": [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
        "tom": [0, 0, 1, 0, 0, 0, .7, 0, 0, 0, 1, 0, 0, .6, 0, .8],
    },
    "none": {},
}

BASS_PATTERNS: Dict[str, Sequence[float]] = {
    "fourfloor": [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    "trap": [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, .8, 0, 0, 1, 0, 0],
    "rock": [1, 0, .6, 0, 1, 0, .6, 0, 1, 0, .6, 0, 1, 0, .6, .5],
    "boombap": [1, 0, 0, 0, 0, .6, 0, 0, 1, 0, 0, 0, 0, .6, 0, 0],
    "acoustic": [1, 0, 0, 0, .7, 0, 0, 0, 1, 0, 0, 0, .7, 0, 0, .4],
    "brushes": [1, 0, 0, 0, .6, 0, 0, 0, 1, 0, 0, 0, .6, 0, 0, 0],
    "electronic": [1, 0, 0, .5, 1, 0, 0, .5, 1, 0, 0, .5, 1, 0, 0, .5],
    "breaks": [1, 0, 0, .6, 0, 0, 1, 0, 0, .6, 0, 0, 1, 0, 0, 0],
    "dembow": [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0],
    "cinematic": [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    "none": [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
}


class _VoiceCache:
    """Synth voices are reused heavily inside one song; memoise by rounded params."""

    def __init__(self) -> None:
        self._store: Dict[Tuple, np.ndarray] = {}

    def get(self, key: Tuple, factory) -> np.ndarray:
        cached = self._store.get(key)
        if cached is None:
            cached = factory()
            self._store[key] = cached
        return cached


class OfflineEngine(Engine):
    name = "sonara-offline"
    description = (
        "Procedural studio that arranges, performs and masters a full song on CPU. "
        "Always available; use a GPU engine for sung, model-generated audio."
    )
    supports_vocals = True
    supports_extend = True
    supports_cover = True
    supports_stems = True
    max_duration_seconds = 600

    def available(self) -> bool:
        return audio_io.have_ffmpeg()

    def device(self) -> str:
        return "cpu"

    def models(self) -> List[ModelInfo]:
        return [
            ModelInfo(
                id="sonara-offline-v1",
                name="Sonara Offline v1",
                description="CPU arranger: drums, bass, harmony, lead and formant vocals",
                max_duration_seconds=self.max_duration_seconds,
                supports_vocals=True,
                supports_extend=True,
                supports_stems=True,
                engine=self.name,
            )
        ]

    # ------------------------------------------------------------------ public

    def generate(self, request: GenerateRequest, out_dir: Path, progress: ProgressFn) -> List[RenderedClip]:
        clips: List[RenderedClip] = []
        base_seed = request.seed or random.randrange(1, 2**31)
        total = max(1, request.num_variations)
        lyric_blocks = music.parse_lyric_sections(request.lyrics or "")
        for index in range(total):
            seed = base_seed + index * 7919
            share_start = index / total
            share_end = (index + 1) / total

            def scoped(value: float, stage: str, _s=share_start, _e=share_end) -> None:
                progress(_s + (_e - _s) * value, stage)

            clip = self._render_clip(
                seed=seed,
                style=request.style or "",
                prompt=request.prompt or "",
                lyrics=request.lyrics or "",
                lyric_blocks=lyric_blocks,
                duration=request.duration_seconds,
                instrumental=request.instrumental,
                weirdness=request.weirdness,
                vocal_gender=request.vocal_gender,
                tempo_bpm=request.tempo_bpm,
                title=request.title,
                out_dir=out_dir,
                variant=index + 1,
                progress=scoped,
                model=request.model,
            )
            clips.append(clip)
        return clips

    def extend(
        self,
        request: ExtendRequest,
        source_audio: Optional[Path],
        out_dir: Path,
        progress: ProgressFn,
    ) -> List[RenderedClip]:
        seed = random.randrange(1, 2**31)
        progress(0.05, "analysing source")
        head = np.zeros((0, 2), dtype=np.float32)
        if source_audio and source_audio.exists():
            decoded, _ = audio_io.decode_to_numpy(source_audio, SR)
            cut = int(max(0.0, request.continue_at_seconds) * SR)
            head = decoded[:cut] if cut else decoded
        clip = self._render_clip(
            seed=seed,
            style=request.style or "",
            prompt="",
            lyrics=request.lyrics or "",
            lyric_blocks=music.parse_lyric_sections(request.lyrics or ""),
            duration=request.duration_seconds,
            instrumental=not bool(request.lyrics),
            weirdness=0.3,
            vocal_gender=None,
            tempo_bpm=None,
            title="Extension",
            out_dir=out_dir,
            variant=1,
            progress=lambda v, s: progress(0.1 + 0.75 * v, s),
            model=request.model,
            role="extension",
        )
        if head.size:
            progress(0.9, "joining sections")
            tail, _ = audio_io.decode_to_numpy(clip.path, SR)
            joined = audio_io.crossfade(head, tail, seconds=1.8, sample_rate=SR)
            wav = clip.path.with_suffix(".joined.wav")
            audio_io.write_wav(wav, joined, SR)
            audio_io.encode_mp3(wav, clip.path)
            wav.unlink(missing_ok=True)
            clip.duration_seconds = joined.shape[0] / SR
        progress(1.0, "done")
        return [clip]

    def cover(
        self,
        request: CoverRequest,
        source_audio: Optional[Path],
        out_dir: Path,
        progress: ProgressFn,
    ) -> List[RenderedClip]:
        base_seed = random.randrange(1, 2**31)
        clips: List[RenderedClip] = []
        total = max(1, request.num_variations)
        for index in range(total):
            share_start, share_end = index / total, (index + 1) / total
            clips.append(
                self._render_clip(
                    seed=base_seed + index * 104729,
                    style=request.style,
                    prompt="",
                    lyrics=request.lyrics or "",
                    lyric_blocks=music.parse_lyric_sections(request.lyrics or ""),
                    duration=180,
                    instrumental=not bool(request.lyrics),
                    weirdness=0.35,
                    vocal_gender=None,
                    tempo_bpm=None,
                    title="Cover",
                    out_dir=out_dir,
                    variant=index + 1,
                    progress=lambda v, s, _s=share_start, _e=share_end: progress(_s + (_e - _s) * v, s),
                    model=request.model,
                )
            )
        return clips

    # ----------------------------------------------------------------- render

    def _render_clip(
        self,
        seed: int,
        style: str,
        prompt: str,
        lyrics: str,
        lyric_blocks: Dict[str, List[str]],
        duration: int,
        instrumental: bool,
        weirdness: float,
        vocal_gender: Optional[str],
        tempo_bpm: Optional[int],
        title: Optional[str],
        out_dir: Path,
        variant: int,
        progress: ProgressFn,
        model: str,
        role: str = "song",
    ) -> RenderedClip:
        profile = music.build_profile(
            style=style,
            prompt=prompt,
            seed=seed,
            tempo_bpm=tempo_bpm,
            weirdness=weirdness,
            instrumental=instrumental,
            vocal_gender=vocal_gender,
        )
        duration = max(20, min(duration, self.max_duration_seconds))
        sections = music.plan_sections(duration, profile)
        progress(0.04, "arranging")

        stereo, stems = self._perform(profile, sections, lyric_blocks, seed, progress)
        progress(0.9, "encoding")

        out_dir.mkdir(parents=True, exist_ok=True)
        stem_id = f"{seed}-{variant}"
        wav_path = out_dir / f"{stem_id}.wav"
        mp3_path = out_dir / f"{stem_id}.mp3"
        audio_io.write_wav(wav_path, stereo, SR)
        audio_io.encode_mp3(wav_path, mp3_path)
        wav_path.unlink(missing_ok=True)

        final_title = (title or "").strip() or self._title_from(profile, prompt, lyrics, seed)
        cover_path: Optional[Path] = None
        if settings.covers:
            cover_path = covers.render_cover(
                settings.cover_dir / f"{stem_id}.jpg",
                final_title,
                stem_id,
                profile.tags,
            )
        audio_io.tag_mp3(mp3_path, final_title, "Sonara Studio", "Sonara generations", cover_path)

        if role == "song":
            for name, buffer in stems.items():
                stem_file = out_dir / f"{stem_id}-{name}.wav"
                audio_io.write_wav(stem_file, dsp.haas(buffer, 10.0, 0.4), SR)

        progress(1.0, "done")
        return RenderedClip(
            path=mp3_path,
            title=final_title,
            duration_seconds=stereo.shape[0] / SR,
            lyrics=None if profile.instrumental else (lyrics or None),
            style=style or None,
            style_tags=profile.tags[:8],
            instrumental=profile.instrumental,
            variant=variant,
            seed=seed,
            role=role,
            model=model,
        )

    def _perform(
        self,
        profile: music.StyleProfile,
        sections: List[music.Section],
        lyric_blocks: Dict[str, List[str]],
        seed: int,
        progress: ProgressFn,
    ) -> Tuple[np.ndarray, Dict[str, np.ndarray]]:
        rng = random.Random(seed)
        cache = _VoiceCache()
        spb = 60.0 / profile.bpm
        bar_samples = int(round(spb * 4 * SR))
        step_samples = bar_samples / STEPS
        total_bars = sum(s.bars for s in sections)
        total_samples = total_bars * bar_samples + int(SR * 2.5)

        drums = np.zeros(total_samples, dtype=np.float32)
        bass = np.zeros(total_samples, dtype=np.float32)
        harmony = np.zeros(total_samples, dtype=np.float32)
        lead = np.zeros(total_samples, dtype=np.float32)
        vocals = np.zeros(total_samples, dtype=np.float32)

        kit = DRUM_KITS.get(profile.kit, DRUM_KITS["acoustic"])
        bass_pattern = BASS_PATTERNS.get(profile.kit, BASS_PATTERNS["acoustic"])
        lyric_cursor: Dict[str, int] = {}

        for index, section in enumerate(sections):
            progress(0.05 + 0.8 * index / max(1, len(sections)), f"performing {section.name}")
            energy = section.energy
            for bar in range(section.bars):
                absolute_bar = section.start_bar + bar
                bar_start = absolute_bar * bar_samples
                degree = profile.progression[absolute_bar % len(profile.progression)]
                chord = music.chord_notes(profile, degree, extended=profile.kit in {"brushes", "boombap"})

                self._play_drums(
                    drums, kit, bar_start, step_samples, energy, profile, rng, absolute_bar, cache
                )
                self._play_bass(
                    bass, bass_pattern, bar_start, step_samples, chord, energy, profile, cache
                )
                self._play_harmony(
                    harmony, bar_start, bar_samples, chord, energy, profile, cache, absolute_bar
                )
                if energy >= 0.6 or section.name in {"chorus", "bridge", "intro"}:
                    self._play_lead(
                        lead, bar_start, step_samples, chord, energy, profile, rng, cache, absolute_bar
                    )

            if not profile.instrumental:
                self._sing_section(
                    vocals, section, lyric_blocks, lyric_cursor, profile, bar_samples, rng, cache
                )

        progress(0.86, "mixing")
        return self._mix(drums, bass, harmony, lead, vocals, profile)

    # -------------------------------------------------------------- performers

    def _play_drums(
        self,
        bus: np.ndarray,
        kit: Dict[str, Sequence[float]],
        bar_start: int,
        step_samples: float,
        energy: float,
        profile: music.StyleProfile,
        rng: random.Random,
        bar_index: int,
        cache: _VoiceCache,
    ) -> None:
        if not kit:
            return
        swing = profile.swing
        hat_sub = 2 if profile.kit == "trap" and energy > 0.7 else 1
        for voice, pattern in kit.items():
            for step, velocity in enumerate(pattern):
                if velocity <= 0:
                    continue
                offset = step * step_samples
                if swing and step % 2 == 1:
                    offset += step_samples * swing
                pos = int(bar_start + offset)
                gain = float(velocity) * (0.55 + 0.5 * energy)
                sample = self._drum_sample(voice, cache, profile)
                dsp.add_at(bus, sample, pos, gain)
                if voice == "hat" and hat_sub == 2:
                    dsp.add_at(bus, sample, int(pos + step_samples / 2), gain * 0.55)
        # fills at the end of every 8th bar
        if energy >= 0.6 and (bar_index + 1) % 8 == 0:
            for i in range(4):
                pos = int(bar_start + (12 + i) * step_samples)
                dsp.add_at(bus, self._drum_sample("tom", cache, profile), pos, 0.5 + 0.12 * i)
        if energy >= 0.9 and bar_index % 16 == 0:
            dsp.add_at(bus, self._drum_sample("crash", cache, profile), bar_start, 0.6)

    def _drum_sample(self, voice: str, cache: _VoiceCache, profile: music.StyleProfile) -> np.ndarray:
        bright = profile.bright

        def build() -> np.ndarray:
            if voice == "kick":
                # ~44 Hz for trap, ~55 Hz otherwise: a kick's fundamental belongs in
                # the sub, not two octaves above it.
                tune = 29.0 if profile.kit == "trap" else 33.0
                length = int(SR * (0.75 if profile.kit == "trap" else 0.42))
                return dsp.kick(length, tune=tune, punch=1.0)
            if voice == "snare":
                return dsp.snare(int(SR * 0.3), bright=bright)
            if voice == "clap":
                return dsp.clap(int(SR * 0.3))
            if voice == "hat":
                return dsp.hat(int(SR * 0.08))
            if voice == "ohat":
                return dsp.hat(int(SR * 0.3), open_hat=True)
            if voice == "tom":
                return dsp.tom(int(SR * 0.3), tune=66.0)
            if voice == "crash":
                base = dsp.filt(dsp.noise(int(SR * 1.6), 23), "highpass", 4200)
                env = np.exp(-2.6 * np.arange(base.size, dtype=np.float32) / SR)
                return (base * env * 0.7).astype(np.float32)
            return np.zeros(1, dtype=np.float32)

        return cache.get(("drum", voice, profile.kit, round(bright, 2)), build)

    def _play_bass(
        self,
        bus: np.ndarray,
        pattern: Sequence[float],
        bar_start: int,
        step_samples: float,
        chord: List[int],
        energy: float,
        profile: music.StyleProfile,
        cache: _VoiceCache,
    ) -> None:
        root = chord[0] - 24
        sub = profile.kit in {"trap", "electronic", "fourfloor", "dembow"}
        for step, velocity in enumerate(pattern):
            if velocity <= 0:
                continue
            length = int(step_samples * (3.4 if sub else 2.2))
            note = root if step % 8 == 0 else root + (0 if not sub else 0)
            freq = music.midi_to_hz(note)

            def build(freq=freq, length=length) -> np.ndarray:
                if sub:
                    tone = dsp.osc_sine(freq, length) * 0.9 + dsp.osc_saw(freq, length) * 0.18
                    tone = dsp.filt(tone, "lowpass", 180.0, q=0.9)
                    env = dsp.adsr(length, 0.004, 0.05, 0.85, 0.28)
                else:
                    # Acoustic-style basses still need a sine under the harmonics,
                    # otherwise the mix has no weight below 80 Hz.
                    tone = (
                        dsp.osc_saw(freq, length) * 0.5
                        + dsp.osc_square(freq, length, 0.45) * 0.22
                        + dsp.osc_sine(freq, length) * 0.55
                    )
                    tone = dsp.filt(tone, "lowpass", 520.0, q=1.1)
                    env = dsp.adsr(length, 0.006, 0.08, 0.6, 0.12)
                return (tone * env).astype(np.float32)

            sample = cache.get(("bass", round(freq, 1), length, sub), build)
            dsp.add_at(bus, sample, int(bar_start + step * step_samples), float(velocity) * (0.5 + 0.5 * energy))

    def _play_harmony(
        self,
        bus: np.ndarray,
        bar_start: int,
        bar_samples: int,
        chord: List[int],
        energy: float,
        profile: music.StyleProfile,
        cache: _VoiceCache,
        bar_index: int,
    ) -> None:
        if profile.pad == "none" and profile.kit == "rock":
            stabs = [0, 4, 8, 12]
            for step in stabs:
                for note in chord:
                    freq = music.midi_to_hz(note)
                    length = int(bar_samples / 8)

                    def build(freq=freq, length=length) -> np.ndarray:
                        tone = dsp.osc_saw(freq, length) * 0.5 + dsp.osc_square(freq, length) * 0.2
                        tone = dsp.filt(tone, "lowpass", 2600 * profile.bright, q=0.9)
                        tone = np.tanh(tone * 2.2) * 0.6
                        return (tone * dsp.adsr(length, 0.005, 0.05, 0.4, 0.12)).astype(np.float32)

                    sample = cache.get(("stab", round(freq, 1), length), build)
                    dsp.add_at(bus, sample, int(bar_start + step * bar_samples / STEPS), 0.22 * (0.5 + energy))
            return

        length = int(bar_samples * 1.05)
        for note in chord:
            freq = music.midi_to_hz(note)

            def build(freq=freq, length=length) -> np.ndarray:
                if profile.pad == "analog":
                    tone = dsp.supersaw(freq, length, voices=7, spread=0.016)
                    cutoff = 1500 * profile.bright
                elif profile.pad == "strings":
                    tone = (
                        dsp.osc_saw(freq, length) * 0.4
                        + dsp.osc_saw(freq, length, detune=0.004) * 0.35
                        + dsp.osc_triangle(freq * 2, length) * 0.15
                    )
                    cutoff = 2400 * profile.bright
                elif profile.pad == "dark":
                    tone = dsp.osc_saw(freq / 2, length) * 0.5 + dsp.osc_sine(freq, length) * 0.3
                    cutoff = 900 * profile.bright
                else:  # warm
                    tone = (
                        dsp.fm_bell(freq, length, ratio=1.0, index=1.4) * 0.5
                        + dsp.osc_triangle(freq, length) * 0.35
                    )
                    cutoff = 1900 * profile.bright
                tone = dsp.filt(tone, "lowpass", cutoff, q=0.8)
                env = dsp.adsr(length, 0.18, 0.3, 0.75, 0.5)
                return (tone * env).astype(np.float32)

            sample = cache.get(("pad", profile.pad, round(freq, 1), length, round(profile.bright, 2)), build)
            dsp.add_at(bus, sample, bar_start, 0.26 * (0.45 + 0.6 * energy))

        if profile.kit in {"fourfloor", "electronic"} and energy > 0.6:
            for step in (2, 6, 10, 14):
                for note in chord[1:]:
                    freq = music.midi_to_hz(note + 12)
                    length = int(bar_samples / 10)

                    def build(freq=freq, length=length) -> np.ndarray:
                        tone = dsp.supersaw(freq, length, voices=5, spread=0.01)
                        tone = dsp.filt(tone, "lowpass", 3200, q=1.0)
                        return (tone * dsp.adsr(length, 0.004, 0.04, 0.3, 0.08)).astype(np.float32)

                    sample = cache.get(("pluckstab", round(freq, 1), length), build)
                    dsp.add_at(bus, sample, int(bar_start + step * bar_samples / STEPS), 0.14 * energy)

    def _play_lead(
        self,
        bus: np.ndarray,
        bar_start: int,
        step_samples: float,
        chord: List[int],
        energy: float,
        profile: music.StyleProfile,
        rng: random.Random,
        cache: _VoiceCache,
        bar_index: int,
    ) -> None:
        arpeggio = profile.lead in {"supersaw", "bell", "square"} or profile.kit in {"fourfloor", "electronic"}
        notes = [n + 12 for n in chord] + [chord[0] + 24]
        if arpeggio:
            pattern = [0, 1, 2, 1, 3, 2, 1, 0] * 2
            step_len = int(step_samples * 1.1)
            for step in range(STEPS):
                note = notes[pattern[step % len(pattern)] % len(notes)]
                freq = music.midi_to_hz(note)
                sample = cache.get(
                    ("lead", profile.lead, round(freq, 1), step_len),
                    lambda freq=freq, step_len=step_len: self._lead_voice(profile, freq, step_len),
                )
                dsp.add_at(bus, sample, int(bar_start + step * step_samples), 0.2 * energy)
        else:
            motif_rng = random.Random(bar_index * 31 + int(profile.bpm))
            cursor = 0
            step = 0
            while step < STEPS:
                duration_steps = motif_rng.choice([2, 2, 4, 3])
                degree = motif_rng.choice([0, 2, 4, 5, 7])
                note = music.scale_note(profile, degree + 7)
                freq = music.midi_to_hz(note)
                length = int(step_samples * duration_steps * 0.95)
                sample = cache.get(
                    ("lead", profile.lead, round(freq, 1), length),
                    lambda freq=freq, length=length: self._lead_voice(profile, freq, length),
                )
                dsp.add_at(bus, sample, int(bar_start + step * step_samples), 0.22 * energy)
                step += duration_steps
                cursor += 1

    def _lead_voice(self, profile: music.StyleProfile, freq: float, length: int) -> np.ndarray:
        kind = profile.lead
        if kind == "supersaw":
            tone = dsp.supersaw(freq, length, voices=7, spread=0.014)
            tone = dsp.filt(tone, "lowpass", 4200 * profile.bright, q=1.1)
            env = dsp.adsr(length, 0.01, 0.08, 0.65, 0.2)
        elif kind == "bell":
            tone = dsp.fm_bell(freq, length, ratio=3.0, index=4.0)
            env = dsp.adsr(length, 0.002, 0.12, 0.3, 0.3)
        elif kind == "square":
            tone = dsp.osc_square(freq, length, duty=0.35)
            env = dsp.adsr(length, 0.004, 0.05, 0.6, 0.1)
        elif kind == "piano":
            tone = (
                dsp.fm_bell(freq, length, ratio=1.0, index=2.2) * 0.6
                + dsp.osc_triangle(freq, length) * 0.3
            )
            env = dsp.adsr(length, 0.004, 0.25, 0.35, 0.35)
        elif kind == "guitar":
            tone = dsp.pluck(freq, length, damping=0.9955)
            tone = np.tanh(dsp.filt(tone, "lowpass", 3600 * profile.bright) * 2.0) * 0.7
            env = dsp.adsr(length, 0.004, 0.1, 0.6, 0.2)
        elif kind == "strings":
            tone = dsp.osc_saw(freq, length) * 0.4 + dsp.osc_saw(freq, length, detune=0.005) * 0.4
            tone = dsp.filt(tone, "lowpass", 3000 * profile.bright, q=0.8)
            env = dsp.adsr(length, 0.12, 0.2, 0.8, 0.4)
        elif kind == "growl":
            tone = dsp.osc_saw(freq, length)
            lfo = 1.0 + 0.6 * np.sin(2 * np.pi * 5.5 * np.arange(length, dtype=np.float32) / SR)
            tone = np.tanh(tone * lfo * 3.0) * 0.6
            tone = dsp.filt(tone, "lowpass", 2200, q=2.0)
            env = dsp.adsr(length, 0.01, 0.06, 0.8, 0.12)
        elif kind == "stab":
            tone = dsp.osc_saw(freq, length) * 0.5 + dsp.osc_square(freq, length) * 0.3
            tone = dsp.filt(tone, "lowpass", 2800, q=1.4)
            env = dsp.adsr(length, 0.003, 0.04, 0.25, 0.1)
        else:  # pluck
            tone = dsp.pluck(freq, length)
            env = dsp.adsr(length, 0.003, 0.1, 0.5, 0.2)
        return (tone * env).astype(np.float32)

    def _sing_section(
        self,
        bus: np.ndarray,
        section: music.Section,
        lyric_blocks: Dict[str, List[str]],
        cursor: Dict[str, int],
        profile: music.StyleProfile,
        bar_samples: int,
        rng: random.Random,
        cache: _VoiceCache,
    ) -> None:
        key = section.name if section.name in lyric_blocks else ("verse" if "verse" in lyric_blocks else "")
        if section.name in {"intro", "outro"} and section.name not in lyric_blocks:
            return
        if not key:
            return
        lines = lyric_blocks.get(key) or []
        if not lines:
            return

        start_line = cursor.get(key, 0)
        singable_bars = max(1, section.bars - 1)
        lines_to_sing = max(1, min(len(lines), singable_bars // 2))
        chosen = [lines[(start_line + i) % len(lines)] for i in range(lines_to_sing)]
        cursor[key] = (start_line + lines_to_sing) % max(1, len(lines))

        melody_rng = random.Random(hash((section.name, profile.root, profile.bpm)) & 0xFFFFFFFF)
        contour = [0, 2, 4, 2, 5, 4, 2, 0]
        bars_per_line = max(1, singable_bars // len(chosen))

        for line_index, line in enumerate(chosen):
            sylls = music.syllables(line)
            if not sylls:
                continue
            line_start = (section.start_bar + line_index * bars_per_line) * bar_samples
            span = bars_per_line * bar_samples
            note_len = max(int(SR * 0.16), int(span / max(1, len(sylls))))
            for i, vowel in enumerate(sylls):
                degree = contour[(i + line_index) % len(contour)] + (7 if section.name == "chorus" else 0)
                if melody_rng.random() < 0.22:
                    degree += melody_rng.choice([-2, -1, 1, 2])
                note = music.scale_note(profile, degree + 7) + 12 * (1 + profile.vocal_octave)
                freq = music.midi_to_hz(note)
                length = int(note_len * (1.25 if i == len(sylls) - 1 else 0.96))
                sample = cache.get(
                    ("voice", vowel, round(freq, 1), length, round(profile.bright, 2)),
                    lambda freq=freq, length=length, vowel=vowel: music.sing(
                        freq, length, vowel, bright=profile.bright
                    ),
                )
                position = int(line_start + i * note_len)
                gain = 0.5 if section.name == "chorus" else 0.42
                dsp.add_at(bus, sample, position, gain)
                if section.name == "chorus":
                    harmony_note = music.midi_to_hz(note + 4)
                    harm = cache.get(
                        ("voice", vowel, round(harmony_note, 1), length, round(profile.bright, 2)),
                        lambda freq=harmony_note, length=length, vowel=vowel: music.sing(
                            freq, length, vowel, bright=profile.bright
                        ),
                    )
                    dsp.add_at(bus, harm, position, gain * 0.45)

    # ------------------------------------------------------------------- mix

    def _mix(
        self,
        drums: np.ndarray,
        bass: np.ndarray,
        harmony: np.ndarray,
        lead: np.ndarray,
        vocals: np.ndarray,
        profile: music.StyleProfile,
    ) -> Tuple[np.ndarray, Dict[str, np.ndarray]]:
        drums = dsp.compress(dsp.normalize(drums, 0.82), threshold=0.4, ratio=3.0)
        drums = dsp.filt(drums, "peak", 5200.0, q=0.8, gain_db=2.5)

        # The bass bus is deliberately kept out of the deep sub: a 1/f-ish balance
        # needs body around 90-220 Hz far more than energy below 50 Hz.
        bass = dsp.normalize(bass, 0.62)
        bass = dsp.filt(bass, "highpass", 38.0, q=0.7)
        bass = dsp.filt(bass, "lowpass", 2600.0)
        bass = dsp.filt(bass, "peak", 130.0, q=0.8, gain_db=3.0)
        bass = dsp.compress(bass, threshold=0.3, ratio=4.0, attack_ms=12, release_ms=160)

        harmony = dsp.normalize(harmony, 0.72)
        harmony = dsp.filt(harmony, "highpass", 180.0)
        harmony = dsp.filt(harmony, "peak", 2600.0, q=0.9, gain_db=2.0)
        harmony = dsp.reverb(harmony, amount=profile.reverb * 0.9, size=0.6)

        lead = dsp.normalize(lead, 0.68)
        lead = dsp.filt(lead, "highpass", 220.0)
        lead = dsp.reverb(lead, amount=profile.reverb * 0.7, size=0.5)

        has_vocals = float(np.max(np.abs(vocals))) > 1e-4
        if has_vocals:
            vocals = dsp.normalize(vocals, 0.85)
            vocals = dsp.filt(vocals, "highpass", 120.0)
            vocals = dsp.filt(vocals, "peak", 3200.0, q=0.9, gain_db=4.0)
            vocals = dsp.filt(vocals, "peak", 8000.0, q=0.8, gain_db=2.5)
            vocals = dsp.compress(vocals, threshold=0.22, ratio=4.5, attack_ms=6, release_ms=120)
            vocals = dsp.reverb(vocals, amount=min(0.32, profile.reverb), size=0.45)
            # Duck the music slightly under the vocal so the line always sits on top.
            env = np.abs(vocals)
            step = 512
            pad = (-env.size) % step
            if pad:
                env = np.pad(env, (0, pad))
            coarse = env.reshape(-1, step).max(axis=1)
            duck = 1.0 - 0.22 * np.clip(coarse / (coarse.max() or 1.0), 0, 1)
            duck = np.interp(
                np.arange(harmony.size),
                np.arange(coarse.size) * step + step / 2,
                duck,
            ).astype(np.float32)
            harmony = harmony * duck
            lead = lead * duck

        stems = {
            "drums": drums,
            "bass": bass,
            "harmony": harmony + lead,
        }
        if has_vocals:
            stems["vocals"] = vocals

        mono = (
            drums * 0.92
            + bass * 0.80
            + harmony * 0.80
            + lead * 0.62
            + (vocals * 1.0 if has_vocals else 0.0)
        ).astype(np.float32)

        # Master chain: trim the inaudible sub, open the mids, add air, then glue.
        mono = dsp.filt(mono, "highpass", 32.0, q=0.7)
        mono = dsp.filt(mono, "peak", 60.0, q=0.7, gain_db=1.5)
        mono = dsp.filt(mono, "peak", 150.0, q=0.55, gain_db=1.5)
        mono = dsp.filt(mono, "peak", 2800.0, q=0.7, gain_db=0.5)
        mono = dsp.filt(mono, "peak", 9000.0, q=0.55, gain_db=7.0)
        mono = dsp.filt(mono, "peak", 14000.0, q=0.6, gain_db=6.0)
        mono = dsp.compress(mono, threshold=0.42, ratio=2.6, attack_ms=14, release_ms=180)
        stereo = dsp.haas(mono, width_ms=11.0, spread=0.45)
        # Push into the limiter for a competitive level, then land just under 0 dBFS.
        stereo = dsp.soft_limit(dsp.normalize(stereo, 1.25), 0.95)
        # ~-1 dBFS: lossy encoders overshoot sample peaks, and a decoded file that
        # exceeds full scale clips on playback.
        stereo = dsp.normalize(stereo, 0.89)
        stereo = dsp.fade(stereo, fade_in=0.05, fade_out=2.2)
        return stereo.astype(np.float32), stems

    def _title_from(self, profile: music.StyleProfile, prompt: str, lyrics: str, seed: int) -> str:
        for line in (lyrics or "").splitlines():
            clean = re.sub(r"^\[[^\]]*\]\s*", "", line).strip(" ,.-!?")
            if 8 <= len(clean) <= 44:
                return clean.title()
        words = [w for w in re.findall(r"[^\W\d_]{4,}", prompt or "", re.UNICODE)][:4]
        if words:
            return " ".join(w.capitalize() for w in words[:3])
        rng = random.Random(seed)
        left = ["Neon", "Midnight", "Paper", "Glass", "Velvet", "Static", "Golden", "Hollow", "Silver", "Wild"]
        right = ["Hours", "Signal", "Avenue", "Echoes", "Daylight", "Machines", "Weather", "Mirrors", "Rivers", "Fever"]
        return f"{rng.choice(left)} {rng.choice(right)}"

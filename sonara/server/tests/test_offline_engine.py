"""Unit coverage for the arranger and the DSP it leans on."""
from __future__ import annotations

import numpy as np
import pytest

from sonara_server import dsp, music
from sonara_server.engines.offline import OfflineEngine
from sonara_server.models import GenerateRequest


def test_style_profile_follows_the_prompt():
    trap = music.build_profile("trap, dark, 808 bass", "", seed=1)
    jazz = music.build_profile("smoky jazz club", "", seed=1)
    assert trap.kit == "trap"
    assert jazz.kit == "brushes"
    assert jazz.swing > 0
    assert trap.bpm > jazz.bpm


def test_explicit_tempo_wins():
    profile = music.build_profile("pop", "", seed=3, tempo_bpm=96)
    assert profile.bpm == 96


def test_sections_fill_the_requested_duration():
    profile = music.build_profile("pop", "", seed=2, tempo_bpm=120)
    sections = music.plan_sections(180, profile)
    bars = sum(s.bars for s in sections)
    seconds = bars * 4 * 60 / profile.bpm
    assert 150 <= seconds <= 215
    assert {s.name for s in sections} >= {"verse", "chorus"}


def test_lyrics_are_split_by_tag():
    blocks = music.parse_lyric_sections("[Verse]\nline one\n[Chorus]\nhook line\nhook two")
    assert blocks["verse"] == ["line one"]
    assert blocks["chorus"] == ["hook line", "hook two"]


def test_syllables_handle_accented_languages():
    assert music.syllables("Zostań ze mną") == ["o", "a", "e", "ą"]


def test_filters_are_stable_and_finite():
    x = dsp.noise(44100, 5)
    for kind, freq in (("lowpass", 800.0), ("highpass", 200.0), ("bandpass", 1000.0)):
        y = dsp.filt(x, kind, freq)
        assert np.all(np.isfinite(y))
        assert np.max(np.abs(y)) < 50


def test_reverb_adds_a_tail_without_blowing_up():
    impulse = np.zeros(44100, dtype=np.float32)
    impulse[100] = 1.0
    wet = dsp.reverb(impulse, amount=0.6, size=0.6)
    assert np.all(np.isfinite(wet))
    assert np.abs(wet[20000:]).sum() > 0.0


def test_compressor_evens_out_loud_and_quiet_sections():
    quiet = dsp.noise(44100, 1) * 0.05
    loud = dsp.noise(44100, 2) * 0.9
    signal = np.concatenate([quiet, loud]).astype(np.float32)

    def rms(x):
        return float(np.sqrt((x**2).mean()))

    before = rms(loud) / rms(quiet)
    out = dsp.compress(signal, threshold=0.1, ratio=8.0)
    after = rms(out[44100:]) / rms(out[:44100])
    assert after < before * 0.6, f"section ratio barely moved: {before:.1f} -> {after:.1f}"


@pytest.mark.slow
def test_render_is_musical(tmp_path):
    engine = OfflineEngine()
    assert engine.available()
    request = GenerateRequest(
        prompt="anthemic pop about sunrise",
        style="pop, anthemic, female vocals",
        lyrics="[Verse]\nStreetlights blur into the rain\n[Chorus]\nRun with me until the morning breaks",
        duration_seconds=30,
        num_variations=1,
        seed=99,
        tempo_bpm=120,
    )
    clips = engine.generate(request, tmp_path, lambda value, stage: None)
    assert len(clips) == 1
    clip = clips[0]
    assert clip.path.exists() and clip.path.stat().st_size > 50_000
    assert 24 <= clip.duration_seconds <= 40

    from sonara_server import audio_io

    audio, sr = audio_io.decode_to_numpy(clip.path)
    mono = audio.mean(axis=1)
    rms = float(np.sqrt((mono**2).mean()))
    peak = float(np.abs(mono).max())
    assert rms > 0.02, "track is effectively silent"
    assert peak <= 1.0, "track clips"
    assert 20 * np.log10(peak / rms) > 6, "no dynamics at all"

    # a beat grid should be detectable at roughly the requested tempo
    hop = 512
    frames = mono[: len(mono) // hop * hop].reshape(-1, hop)
    energy = np.sqrt((frames**2).mean(axis=1))
    onset = np.clip(np.diff(energy, prepend=energy[0]), 0, None)
    onset -= onset.mean()
    ac = np.correlate(onset, onset, mode="full")[len(onset) - 1 :]
    fps = sr / hop
    lo, hi = int(fps * 60 / 200), int(fps * 60 / 50)
    lag = int(np.argmax(ac[lo:hi]) + lo)
    bpm = 60 * fps / lag
    assert any(abs(bpm * m - 120) < 12 for m in (0.5, 1, 2)), f"no beat near 120 bpm (got {bpm:.1f})"

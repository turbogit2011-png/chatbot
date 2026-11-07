"""A small, dependency-light DSP toolbox used by the offline engine.

Everything here is plain numpy: oscillators, envelopes, filters, drum synthesis,
a bus compressor and a limiter. It exists so the server can render a complete,
musical arrangement on any machine, with no model weights and no GPU.
"""
from __future__ import annotations

import math
from typing import Iterable, List, Sequence, Tuple

import numpy as np

try:  # scipy gives us C-speed filtering; the pure-numpy path below is the fallback
    from scipy.signal import lfilter as _lfilter  # type: ignore

    HAVE_SCIPY = True
except Exception:  # pragma: no cover - scipy is optional
    _lfilter = None
    HAVE_SCIPY = False

SR = 44100


def midi_to_hz(note: float) -> float:
    return 440.0 * (2.0 ** ((note - 69.0) / 12.0))


def adsr(
    length: int,
    attack: float = 0.01,
    decay: float = 0.1,
    sustain: float = 0.7,
    release: float = 0.2,
    sr: int = SR,
) -> np.ndarray:
    a = max(1, int(attack * sr))
    d = max(1, int(decay * sr))
    r = max(1, int(release * sr))
    s = max(0, length - a - d - r)
    env = np.concatenate(
        [
            np.linspace(0.0, 1.0, a, endpoint=False),
            np.linspace(1.0, sustain, d, endpoint=False),
            np.full(s, sustain),
            np.linspace(sustain, 0.0, r),
        ]
    )
    if env.size < length:
        env = np.pad(env, (0, length - env.size))
    return env[:length].astype(np.float32)


def phase(freq: float, length: int, sr: int = SR, detune: float = 0.0) -> np.ndarray:
    t = np.arange(length, dtype=np.float32) / sr
    f = freq * (1.0 + detune)
    return 2.0 * np.pi * f * t


def osc_sine(freq: float, length: int, detune: float = 0.0) -> np.ndarray:
    return np.sin(phase(freq, length, detune=detune)).astype(np.float32)


def osc_saw(freq: float, length: int, detune: float = 0.0) -> np.ndarray:
    p = phase(freq, length, detune=detune)
    return (2.0 * (p / (2 * np.pi) % 1.0) - 1.0).astype(np.float32)


def osc_square(freq: float, length: int, duty: float = 0.5, detune: float = 0.0) -> np.ndarray:
    p = (phase(freq, length, detune=detune) / (2 * np.pi)) % 1.0
    return np.where(p < duty, 1.0, -1.0).astype(np.float32)


def osc_triangle(freq: float, length: int, detune: float = 0.0) -> np.ndarray:
    p = (phase(freq, length, detune=detune) / (2 * np.pi)) % 1.0
    return (4.0 * np.abs(p - 0.5) - 1.0).astype(np.float32)


def supersaw(freq: float, length: int, voices: int = 5, spread: float = 0.012) -> np.ndarray:
    out = np.zeros(length, dtype=np.float32)
    for i in range(voices):
        offset = (i - (voices - 1) / 2) * spread / max(1, (voices - 1) / 2)
        out += osc_saw(freq, length, detune=offset)
    return out / voices


def fm_bell(freq: float, length: int, ratio: float = 2.0, index: float = 3.0) -> np.ndarray:
    t = np.arange(length, dtype=np.float32) / SR
    mod = np.sin(2 * np.pi * freq * ratio * t) * index * np.exp(-3.0 * t)
    return np.sin(2 * np.pi * freq * t + mod).astype(np.float32)


def pluck(freq: float, length: int, damping: float = 0.996) -> np.ndarray:
    """Karplus-Strong string, vectorised one delay-line period at a time."""
    period = max(2, int(SR / max(1.0, freq)))
    rng = np.random.default_rng(int(freq * 100) % 2**31)
    buf = rng.uniform(-1.0, 1.0, period).astype(np.float32)
    blocks = []
    written = 0
    while written < length:
        blocks.append(buf)
        written += period
        buf = (damping * 0.5 * (buf + np.roll(buf, -1))).astype(np.float32)
    return np.concatenate(blocks)[:length].astype(np.float32)


def _apply_iir(b: Sequence[float], a: Sequence[float], x: np.ndarray) -> np.ndarray:
    if HAVE_SCIPY:
        return _lfilter(np.asarray(b, dtype=np.float64), np.asarray(a, dtype=np.float64), x).astype(np.float32)
    # Fallback: direct form I, kept simple because scipy is normally present.
    y = np.zeros_like(x, dtype=np.float32)
    x1 = x2 = y1 = y2 = 0.0
    b0, b1, b2 = (list(b) + [0.0, 0.0])[:3]
    a1, a2 = (list(a) + [0.0, 0.0])[1:3]
    for i in range(x.size):
        xi = float(x[i])
        yi = b0 * xi + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
        y[i] = yi
        x2, x1 = x1, xi
        y2, y1 = y1, yi
    return y


def onepole_lp(x: np.ndarray, cutoff: float, sr: int = SR) -> np.ndarray:
    cutoff = max(20.0, min(cutoff, sr / 2 - 100))
    a = math.exp(-2.0 * math.pi * cutoff / sr)
    return _apply_iir([1 - a], [1.0, -a], x)


def biquad(x: np.ndarray, b: Sequence[float], a: Sequence[float]) -> np.ndarray:
    return _apply_iir(b, a, x)


def _biquad_coeffs(kind: str, freq: float, q: float, sr: int = SR, gain_db: float = 0.0):
    w0 = 2 * math.pi * max(20.0, min(freq, sr / 2 - 100)) / sr
    alpha = math.sin(w0) / (2 * q)
    cosw = math.cos(w0)
    if kind == "lowpass":
        b = [(1 - cosw) / 2, 1 - cosw, (1 - cosw) / 2]
        a = [1 + alpha, -2 * cosw, 1 - alpha]
    elif kind == "highpass":
        b = [(1 + cosw) / 2, -(1 + cosw), (1 + cosw) / 2]
        a = [1 + alpha, -2 * cosw, 1 - alpha]
    elif kind == "bandpass":
        b = [alpha, 0.0, -alpha]
        a = [1 + alpha, -2 * cosw, 1 - alpha]
    elif kind == "peak":
        amp = 10 ** (gain_db / 40)
        b = [1 + alpha * amp, -2 * cosw, 1 - alpha * amp]
        a = [1 + alpha / amp, -2 * cosw, 1 - alpha / amp]
    else:
        raise ValueError(kind)
    norm = a[0]
    return [v / norm for v in b], [1.0, a[1] / norm, a[2] / norm]


def filt(x: np.ndarray, kind: str, freq: float, q: float = 0.707, gain_db: float = 0.0) -> np.ndarray:
    b, a = _biquad_coeffs(kind, freq, q, gain_db=gain_db)
    return biquad(x, b, a)


def noise(length: int, seed: int = 0) -> np.ndarray:
    rng = np.random.default_rng(seed)
    return rng.standard_normal(length).astype(np.float32)


def kick(length: int, tune: float = 33.0, punch: float = 1.0) -> np.ndarray:
    t = np.arange(length, dtype=np.float32) / SR
    pitch = midi_to_hz(tune) * (1.0 + 6.0 * np.exp(-55.0 * t))
    body = np.sin(2 * np.pi * np.cumsum(pitch) / SR)
    env = np.exp(-11.0 * t) * punch
    click = noise(length, 7) * np.exp(-260.0 * t) * 0.35
    return ((body * env) + click).astype(np.float32)


def snare(length: int, bright: float = 1.0) -> np.ndarray:
    t = np.arange(length, dtype=np.float32) / SR
    n = filt(noise(length, 11), "highpass", 950 * bright)
    tone = np.sin(2 * np.pi * 185 * t) * 0.6 + np.sin(2 * np.pi * 278 * t) * 0.4
    env = np.exp(-24.0 * t)
    return ((n * 0.85 + tone * 0.35) * env).astype(np.float32)


def clap(length: int) -> np.ndarray:
    t = np.arange(length, dtype=np.float32) / SR
    n = filt(noise(length, 13), "bandpass", 1600, q=0.8)
    env = np.zeros_like(t)
    for offset, amp in ((0.0, 1.0), (0.008, 0.8), (0.016, 0.6), (0.025, 0.45)):
        start = int(offset * SR)
        if start >= length:
            break
        seg = np.exp(-55.0 * (t[: length - start])) * amp
        env[start:] += seg
    return (n * env * 0.9).astype(np.float32)


def hat(length: int, open_hat: bool = False) -> np.ndarray:
    t = np.arange(length, dtype=np.float32) / SR
    n = filt(noise(length, 17), "highpass", 7200)
    env = np.exp(-(14.0 if open_hat else 70.0) * t)
    return (n * env * 0.5).astype(np.float32)


def tom(length: int, tune: float = 72.0) -> np.ndarray:
    t = np.arange(length, dtype=np.float32) / SR
    pitch = midi_to_hz(tune) * (1.0 + 1.6 * np.exp(-30.0 * t))
    return (np.sin(2 * np.pi * np.cumsum(pitch) / SR) * np.exp(-13.0 * t)).astype(np.float32)


def add_at(buffer: np.ndarray, sample: np.ndarray, start: int, gain: float = 1.0) -> None:
    if start >= buffer.size or gain == 0.0:
        return
    end = min(buffer.size, start + sample.size)
    buffer[start:end] += sample[: end - start] * gain


def compress(x: np.ndarray, threshold: float = 0.35, ratio: float = 3.5, attack_ms: float = 8.0,
             release_ms: float = 140.0) -> np.ndarray:
    """Straightforward feed-forward compressor with smoothed gain."""
    env = np.abs(x)
    # Envelope following is done on a decimated signal: asymmetric attack/release
    # needs a sequential pass, and 1/64 rate keeps that pass cheap without
    # audibly changing the gain curve.
    step = 64
    pad = (-env.size) % step
    if pad:
        env = np.pad(env, (0, pad))
    coarse = env.reshape(-1, step).max(axis=1)
    a = math.exp(-step / (SR * max(attack_ms, 0.1) / 1000.0))
    r = math.exp(-step / (SR * max(release_ms, 0.1) / 1000.0))
    follower = np.empty_like(coarse)
    acc = 0.0
    for i in range(coarse.size):
        coeff = a if coarse[i] > acc else r
        acc = coeff * acc + (1 - coeff) * coarse[i]
        follower[i] = acc
    centres = np.arange(coarse.size) * step + step / 2
    follower = np.interp(np.arange(x.size), centres, follower).astype(np.float32)
    over = np.maximum(follower, 1e-9) / threshold
    gain = np.where(over > 1.0, over ** (1.0 / ratio - 1.0), 1.0)
    return (x * gain).astype(np.float32)


def soft_limit(x: np.ndarray, ceiling: float = 0.97) -> np.ndarray:
    return (np.tanh(x / max(ceiling, 1e-6)) * ceiling).astype(np.float32)


def _comb(x: np.ndarray, delay: int, feedback: float) -> np.ndarray:
    """y[n] = x[n] + fb*y[n-delay], computed one delay-length block at a time."""
    if delay <= 0 or delay >= x.size:
        return x.copy()
    pad = (-x.size) % delay
    buf = np.pad(x, (0, pad)).reshape(-1, delay).astype(np.float32)
    out = np.empty_like(buf)
    prev = np.zeros(delay, dtype=np.float32)
    for i in range(buf.shape[0]):
        prev = buf[i] + feedback * prev
        out[i] = prev
    return out.reshape(-1)[: x.size]


def _allpass(x: np.ndarray, delay: int, gain: float) -> np.ndarray:
    """y[n] = -g*x[n] + x[n-delay] + g*y[n-delay], same block trick."""
    if delay <= 0 or delay >= x.size:
        return x.copy()
    pad = (-x.size) % delay
    buf = np.pad(x, (0, pad)).reshape(-1, delay).astype(np.float32)
    out = np.empty_like(buf)
    prev_in = np.zeros(delay, dtype=np.float32)
    prev_out = np.zeros(delay, dtype=np.float32)
    for i in range(buf.shape[0]):
        prev_out = -gain * buf[i] + prev_in + gain * prev_out
        prev_in = buf[i]
        out[i] = prev_out
    return out.reshape(-1)[: x.size]


def reverb(x: np.ndarray, amount: float = 0.25, size: float = 0.6) -> np.ndarray:
    """Four parallel feedback combs into two allpass stages (Schroeder layout)."""
    if amount <= 0.0:
        return x
    wet = np.zeros_like(x, dtype=np.float32)
    for seconds, gain in ((0.0297, 0.805), (0.0371, 0.827), (0.0411, 0.783), (0.0437, 0.764)):
        delay = max(1, int(SR * seconds * (0.5 + size)))
        wet += _comb(x, delay, gain * (0.55 + 0.4 * size)) / 4.0
    for seconds in (0.0053, 0.0017):
        wet = _allpass(wet, max(1, int(SR * seconds)), 0.7)
    wet = filt(wet, "lowpass", 6500.0)
    return (x * (1 - amount) + wet * amount * 1.4).astype(np.float32)


def haas(mono: np.ndarray, width_ms: float = 12.0, spread: float = 0.5) -> np.ndarray:
    """Turn a mono bus into a wide stereo pair."""
    delay = int(SR * width_ms / 1000.0)
    left = mono.copy()
    right = np.zeros_like(mono)
    if 0 < delay < mono.size:
        right[delay:] = mono[:-delay]
    else:
        right = mono.copy()
    mid = (left + right) / 2
    side = (left - right) / 2 * spread
    return np.stack([mid + side, mid - side], axis=1).astype(np.float32)


def fade(x: np.ndarray, fade_in: float = 0.02, fade_out: float = 2.0, sr: int = SR) -> np.ndarray:
    n_in = min(int(fade_in * sr), x.shape[0])
    n_out = min(int(fade_out * sr), x.shape[0])
    y = x.copy()
    if n_in > 0:
        ramp = np.linspace(0.0, 1.0, n_in, dtype=np.float32)
        y[:n_in] = (y[:n_in].T * ramp).T
    if n_out > 0:
        ramp = np.linspace(1.0, 0.0, n_out, dtype=np.float32)
        y[-n_out:] = (y[-n_out:].T * ramp).T
    return y


def normalize(x: np.ndarray, peak: float = 0.95) -> np.ndarray:
    m = float(np.max(np.abs(x))) or 1.0
    return (x / m * peak).astype(np.float32)

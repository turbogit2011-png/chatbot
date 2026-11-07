"""Generates cover art for every rendered track."""
from __future__ import annotations

import colorsys
import hashlib
import math
from pathlib import Path
from typing import List, Optional, Tuple

try:
    from PIL import Image, ImageDraw, ImageFilter, ImageFont  # type: ignore

    HAVE_PIL = True
except Exception:  # pragma: no cover
    HAVE_PIL = False

SIZE = 1024


def _palette(seed: str) -> List[Tuple[int, int, int]]:
    digest = hashlib.sha256(seed.encode("utf-8")).digest()
    base = digest[0] / 255.0
    out = []
    for i in range(3):
        hue = (base + i * 0.11 + digest[i + 1] / 2550.0) % 1.0
        sat = 0.55 + (digest[i + 4] / 255.0) * 0.35
        val = 0.95 - i * 0.26
        r, g, b = colorsys.hsv_to_rgb(hue, sat, val)
        out.append((int(r * 255), int(g * 255), int(b * 255)))
    return out


def render_cover(path: Path, title: str, seed: str, tags: Optional[List[str]] = None) -> Optional[Path]:
    """Abstract gradient + waveform artwork. Returns None when Pillow is absent."""
    if not HAVE_PIL:
        return None
    colors = _palette(seed)
    image = Image.new("RGB", (SIZE, SIZE), colors[2])
    draw = ImageDraw.Draw(image)

    for y in range(SIZE):
        t = y / SIZE
        if t < 0.5:
            a, b, k = colors[0], colors[1], t * 2
        else:
            a, b, k = colors[1], colors[2], (t - 0.5) * 2
        row = tuple(int(a[i] + (b[i] - a[i]) * k) for i in range(3))
        draw.line([(0, y), (SIZE, y)], fill=row)

    digest = hashlib.sha256(seed.encode("utf-8")).digest()
    for i in range(5):
        radius = SIZE * (0.18 + (digest[i] / 255.0) * 0.3)
        cx = SIZE * (digest[(i * 3) % 32] / 255.0)
        cy = SIZE * (digest[(i * 5 + 1) % 32] / 255.0)
        overlay = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
        ImageDraw.Draw(overlay).ellipse(
            [cx - radius, cy - radius, cx + radius, cy + radius],
            fill=colors[i % 3] + (60,),
        )
        image = Image.alpha_composite(image.convert("RGBA"), overlay).convert("RGB")

    image = image.filter(ImageFilter.GaussianBlur(radius=SIZE * 0.02))
    draw = ImageDraw.Draw(image, "RGBA")

    bars = 48
    mid = SIZE * 0.62
    width = SIZE / (bars * 1.6)
    for i in range(bars):
        amp = (
            math.sin(i * 0.42 + digest[i % 32] / 40.0) * 0.5
            + math.sin(i * 0.17 + digest[(i + 7) % 32] / 60.0) * 0.3
            + 0.6
        )
        height = max(SIZE * 0.02, SIZE * 0.22 * abs(amp))
        x = SIZE * 0.08 + i * (SIZE * 0.84 / bars)
        draw.rounded_rectangle(
            [x, mid - height / 2, x + width, mid + height / 2],
            radius=width / 2,
            fill=(255, 255, 255, 190),
        )

    label = (title or "Sonara").strip()[:34]
    try:
        font = ImageFont.truetype("DejaVuSans-Bold.ttf", int(SIZE * 0.065))
    except Exception:
        font = ImageFont.load_default()
    draw.rectangle([0, SIZE * 0.80, SIZE, SIZE], fill=(0, 0, 0, 110))
    draw.text((SIZE * 0.08, SIZE * 0.845), label, font=font, fill=(255, 255, 255, 235))
    if tags:
        try:
            small = ImageFont.truetype("DejaVuSans.ttf", int(SIZE * 0.032))
        except Exception:
            small = ImageFont.load_default()
        draw.text(
            (SIZE * 0.08, SIZE * 0.925),
            " · ".join(tags[:4])[:52],
            font=small,
            fill=(255, 255, 255, 190),
        )

    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, format="JPEG", quality=88)
    return path

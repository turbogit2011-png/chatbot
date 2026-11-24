package com.pulse.studio.fx

import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow

/** How hard each stage of the finishing chain is pushed, 0 = off. */
data class FxSettings(
    val bloom: Float = 0.5f,
    val bloomThreshold: Float = 0.62f,
    val aberration: Float = 0.35f,
    val grain: Float = 0.25f,
    val scanlines: Float = 0f,
    val glitch: Float = 0f,
    val trails: Float = 0f,
    val vignette: Float = 0.35f,
    val contrast: Float = 1.06f,
    val saturation: Float = 1.08f,
    val lift: Int = 0,
    val halation: Float = 0f,
) {
    companion object {
        val None = FxSettings(bloom = 0f, aberration = 0f, grain = 0f, vignette = 0f, contrast = 1f, saturation = 1f)
        val Clean = FxSettings(bloom = 0.35f, aberration = 0.12f, grain = 0.10f, vignette = 0.3f)
        val Film = FxSettings(bloom = 0.42f, aberration = 0.22f, grain = 0.26f, vignette = 0.45f, halation = 0.3f, contrast = 1.1f)
        val Vhs = FxSettings(bloom = 0.3f, aberration = 0.5f, grain = 0.3f, scanlines = 0.45f, vignette = 0.5f, saturation = 1.2f, lift = 10)
        val Hard = FxSettings(bloom = 0.55f, bloomThreshold = 0.7f, aberration = 0.38f, grain = 0.14f, glitch = 0.6f, vignette = 0.32f, contrast = 1.15f, saturation = 1.15f)
        val Dream = FxSettings(bloom = 0.5f, bloomThreshold = 0.68f, aberration = 0.18f, grain = 0.12f, trails = 0.3f, vignette = 0.42f, saturation = 1.12f)
    }
}

/**
 * The finishing chain that runs over every rendered frame.
 *
 * This is the difference between "an audio visualiser" and "a video": bloom, lens
 * aberration, halation, grain and grading are what the eye reads as produced footage.
 * It all works on a packed ARGB buffer in plain Kotlin so it can be measured and
 * looked at off-device, and so both backends get identical results.
 *
 * Buffers are allocated once and reused; at thirty frames a second nothing here may
 * allocate.
 */
class PostFx(private val width: Int, private val height: Int) {

    private val bloomFactor = 4
    private val bloomWidth = (width + bloomFactor - 1) / bloomFactor
    private val bloomHeight = (height + bloomFactor - 1) / bloomFactor

    private val bright = IntArray(bloomWidth * bloomHeight)
    private val bloomScratch = IntArray(bloomWidth * bloomHeight)
    private val source = IntArray(width * height)
    private val previous = IntArray(width * height)
    private var hasPrevious = false

    /**
     * Vignette weight per pixel as a 0..256 multiplier, computed once.
     *
     * Everything in the grading pass is integer maths against tables like this one:
     * at a million pixels a frame, a float multiply and a pow() per pixel is the
     * difference between a clip rendering in two minutes and in six.
     */
    private val vignetteMask = IntArray(width * height).also { mask ->
        val cx = width * 0.5f
        val cy = height * 0.5f
        val maxDistance = kotlin.math.sqrt(cx * cx + cy * cy)
        for (y in 0 until height) {
            for (x in 0 until width) {
                val dx = (x - cx) / maxDistance
                val dy = (y - cy) / maxDistance
                val d = kotlin.math.sqrt(dx * dx + dy * dy)
                mask[y * width + x] = ((d * 1.25f).coerceIn(0f, 1f).pow(2.2f) * 256f).toInt()
            }
        }
    }

    /** Contrast and lift folded into one lookup, rebuilt only when they change. */
    private val toneLut = IntArray(256)
    private var toneContrast = Float.NaN
    private var toneLift = Int.MIN_VALUE

    private val grainWidth = (width + 1) / 2
    private val grainHeight = (height + 1) / 2
    private val grainField = IntArray(grainWidth * grainHeight)

    private val redX = IntArray(width)
    private val redY = IntArray(height)
    private val blueX = IntArray(width)
    private val blueY = IntArray(height)
    private var offsetsFor = Float.NaN

    private val workers = max(1, min(8, Runtime.getRuntime().availableProcessors()))
    private val pool = if (workers > 1) Executors.newFixedThreadPool(workers) { task ->
        Thread(task, "pulse-fx").apply { isDaemon = true }
    } else {
        null
    }

    /** Splits the frame into horizontal strips and runs [block] on each in parallel. */
    private fun parallelRows(block: (Int, Int) -> Unit) {
        val pool = this.pool
        if (pool == null || height < workers * 8) {
            block(0, height)
            return
        }
        val strip = (height + workers - 1) / workers
        val latch = java.util.concurrent.CountDownLatch(workers)
        for (i in 0 until workers) {
            val from = i * strip
            val to = min(height, from + strip)
            if (from >= to) {
                latch.countDown()
                continue
            }
            pool.execute {
                try {
                    block(from, to)
                } finally {
                    latch.countDown()
                }
            }
        }
        latch.await(10, TimeUnit.SECONDS)
    }

    /** Same split as [parallelRows], but over the quarter-resolution bloom buffer. */
    private fun parallelBloomRows(block: (Int, Int) -> Unit) {
        val pool = this.pool
        if (pool == null || bloomHeight < workers * 4) {
            block(0, bloomHeight)
            return
        }
        val strip = (bloomHeight + workers - 1) / workers
        val latch = java.util.concurrent.CountDownLatch(workers)
        for (i in 0 until workers) {
            val from = i * strip
            val to = min(bloomHeight, from + strip)
            if (from >= to) {
                latch.countDown()
                continue
            }
            pool.execute {
                try {
                    block(from, to)
                } finally {
                    latch.countDown()
                }
            }
        }
        latch.await(10, TimeUnit.SECONDS)
    }

    fun release() {
        pool?.shutdownNow()
    }

    fun reset() {
        hasPrevious = false
    }

    /**
     * Applies the chain to [frame] in place.
     *
     * @param beat 0..1 transient strength, used by glitch and aberration so the
     *   lens reacts to the music instead of wobbling on a timer
     */
    fun apply(frame: IntArray, settings: FxSettings, time: Float, beat: Float, seed: Int) {
        if (settings.trails > 0f && hasPrevious) {
            applyTrails(frame, settings.trails)
        }

        if (settings.glitch > 0f && beat > 0.25f) {
            frame.copyInto(source)
            applySliceGlitch(frame, settings.glitch * beat, time, seed)
        }

        if (settings.aberration > 0.002f) {
            frame.copyInto(source)
            applyAberration(frame, source, settings.aberration * (0.6f + 0.9f * beat))
        }

        // Bloom is built at quarter resolution here and composited inside the grading
        // pass below: adding glow, halation, tone, vignette and grain in one sweep
        // over the pixels instead of four roughly halves the cost of the chain.
        val hasBloom = settings.bloom > 0f
        if (hasBloom) buildBloom(frame, settings)

        finish(frame, settings, hasBloom, time, seed)

        if (settings.trails > 0f) {
            frame.copyInto(previous)
            hasPrevious = true
        }
    }

    // ------------------------------------------------------------------ stages

    private fun applyTrails(frame: IntArray, amount: Float) {
        val keep = (amount.coerceIn(0f, 0.92f) * 256).toInt()
        val fresh = 256 - keep
        parallelRows { from, to ->
        for (i in from * width until to * width) {
            val a = frame[i]
            val b = previous[i]
            val r = (((a ushr 16) and 0xFF) * fresh + ((b ushr 16) and 0xFF) * keep) shr 8
            val g = (((a ushr 8) and 0xFF) * fresh + ((b ushr 8) and 0xFF) * keep) shr 8
            val bl = ((a and 0xFF) * fresh + (b and 0xFF) * keep) shr 8
            frame[i] = (0xFF shl 24) or (r shl 16) or (g shl 8) or bl
        }
        }
    }

    /**
     * Horizontal band displacement with an RGB tear, the thing people read as
     * "digital". Bands are chosen from a hash of the frame so they jump rather than
     * slide, which is what makes it feel like an error and not an animation.
     */
    private fun applySliceGlitch(frame: IntArray, amount: Float, time: Float, seed: Int) {
        val slices = 6 + (amount * 10).toInt()
        var state = (seed * 7919 + (time * 11f).toInt() * 104729).toInt()
        fun next(): Int {
            state = state * 1664525 + 1013904223
            return state ushr 8
        }
        repeat(slices) {
            val bandHeight = (height * (0.012f + (next() % 60) / 1000f)).toInt().coerceAtLeast(2)
            val top = next() % max(1, height - bandHeight)
            val shift = (((next() % 2000) - 1000) / 1000f * amount * width * 0.09f).toInt()
            if (shift == 0) return@repeat
            val channelSplit = (next() % 3)
            for (y in top until min(height, top + bandHeight)) {
                val row = y * width
                for (x in 0 until width) {
                    val from = (x - shift).coerceIn(0, width - 1)
                    val moved = source[row + from]
                    val original = source[row + x]
                    frame[row + x] = when (channelSplit) {
                        0 -> (0xFF shl 24) or (((moved ushr 16) and 0xFF) shl 16) or
                            (((original ushr 8) and 0xFF) shl 8) or (original and 0xFF)
                        1 -> (0xFF shl 24) or (((original ushr 16) and 0xFF) shl 16) or
                            (((moved ushr 8) and 0xFF) shl 8) or (moved and 0xFF)
                        else -> moved
                    }
                }
            }
        }
    }

    /** Radial RGB separation: red pushed out from centre, blue pulled in. */
    private fun applyAberration(frame: IntArray, src: IntArray, amount: Float) {
        if (amount <= 0.002f) return
        if (offsetsFor != amount) {
            offsetsFor = amount
            val cx = width * 0.5f
            val cy = height * 0.5f
            val strength = amount * 0.007f
            for (x in 0 until width) {
                val dx = (x - cx) / cx
                // a constant sideways split plus a radial term: the vertical component
                // is kept small because on text it reads as a double exposure
                val shift = dx * strength * width + strength * width * 0.35f
                redX[x] = (x + shift).toInt().coerceIn(0, width - 1)
                blueX[x] = (x - shift).toInt().coerceIn(0, width - 1)
            }
            for (y in 0 until height) {
                val dy = (y - cy) / cy
                val shift = dy * strength * height * 0.22f
                redY[y] = (y + shift).toInt().coerceIn(0, height - 1)
                blueY[y] = (y - shift).toInt().coerceIn(0, height - 1)
            }
        }
        parallelRows { from, to ->
            for (y in from until to) {
                val row = y * width
                val redRow = redY[y] * width
                val blueRow = blueY[y] * width
                for (x in 0 until width) {
                    val r = src[redRow + redX[x]] and 0x00FF0000
                    val g = src[row + x] and 0x0000FF00
                    val b = src[blueRow + blueX[x]] and 0x000000FF
                    frame[row + x] = (0xFF shl 24) or r or g or b
                }
            }
        }
    }

    /** Extracts highlights at quarter resolution and blurs them, ready to composite. */
    private fun buildBloom(frame: IntArray, settings: FxSettings) {
        val threshold = (settings.bloomThreshold * 255).toInt()
        val factor = bloomFactor
        parallelBloomRows { fromRow, toRow ->
        for (y in fromRow until toRow) {
            val y0 = y * factor
            val y1 = min(y0 + factor, height)
            for (x in 0 until bloomWidth) {
                val x0 = x * factor
                val x1 = min(x0 + factor, width)
                var r = 0
                var g = 0
                var b = 0
                var count = 0
                for (sy in y0 until y1) {
                    var index = sy * width + x0
                    for (sx in x0 until x1) {
                        val pixel = frame[index++]
                        r += (pixel ushr 16) and 0xFF
                        g += (pixel ushr 8) and 0xFF
                        b += pixel and 0xFF
                        count++
                    }
                }
                if (count == 0) count = 1
                r /= count; g /= count; b /= count
                val luma = (r * 77 + g * 151 + b * 28) shr 8
                bright[y * bloomWidth + x] = if (luma > threshold) {
                    val scale = (luma - threshold) * 255 / max(1, 255 - threshold)
                    ((r * scale / 255) shl 16) or ((g * scale / 255) shl 8) or (b * scale / 255)
                } else {
                    0
                }
            }
        }
        }
        Blur.blur(bright, bloomWidth, bloomHeight, max(2, bloomWidth / 36), bloomScratch)
    }

    /**
     * Fills the half-resolution grain field for this frame.
     *
     * Grain that changes every pixel is digital noise, not film, and it wrecks
     * inter-frame compression — a clip graded with it came out five times larger than
     * the same clip without. Sampling a coarser field looks closer to stock and
     * encodes sanely.
     */
    private fun buildGrain(seed: Int, time: Float) {
        var state = seed * 2654435761.toInt() + (time * 997f).toInt() * 1664525
        for (i in grainField.indices) {
            state = state * 1664525 + 1013904223
            grainField[i] = ((((state ushr 16) and 0xFF) - 128) * grainAmountScratch) shr 7
        }
    }

    private var grainAmountScratch = 0

    /** Bloom, halation, tone, saturation, vignette, scanlines and grain in one sweep. */
    private fun finish(
        frame: IntArray,
        settings: FxSettings,
        hasBloom: Boolean,
        time: Float,
        seed: Int,
    ) {
        val contrast = settings.contrast
        val lift = settings.lift
        if (contrast != toneContrast || lift != toneLift) {
            toneContrast = contrast
            toneLift = lift
            for (v in 0 until 256) {
                toneLut[v] = (((v - 128) * contrast) + 128 + lift).toInt().coerceIn(0, 255)
            }
        }

        val saturation = (settings.saturation * 256).toInt()
        val grain = (settings.grain * 52f).toInt()
        grainAmountScratch = grain
        if (grain != 0) buildGrain(seed, time)
        val vignette = (settings.vignette * 256).toInt()
        val scanlines = settings.scanlines > 0f
        val scanDark = 256 - (settings.scanlines * 87f).toInt()
        val bloomGain = if (hasBloom) (settings.bloom * 256).toInt() else 0
        val halationGain = if (hasBloom) (settings.halation * 200).toInt() else 0
        val baseSeed = seed * 2654435761.toInt() + (time * 1000f).toInt()
        val factor = bloomFactor

        parallelRows { from, to ->
            for (y in from until to) {
                val row = y * width
                val bloomRow = (y / factor) * bloomWidth
                val scan = if (scanlines && (y and 1) == 1) scanDark else 256
                for (x in 0 until width) {
                    val index = row + x
                    val pixel = frame[index]
                    var r = (pixel ushr 16) and 0xFF
                    var g = (pixel ushr 8) and 0xFF
                    var b = pixel and 0xFF

                    if (bloomGain != 0) {
                        val glow = bright[bloomRow + x / factor]
                        if (glow != 0) {
                            val gr = (glow ushr 16) and 0xFF
                            val gg = (glow ushr 8) and 0xFF
                            val gb = glow and 0xFF
                            r += (gr * bloomGain) shr 8
                            g += (gg * bloomGain) shr 8
                            b += (gb * bloomGain) shr 8
                            if (halationGain != 0) {
                                val warm = (gr * halationGain) shr 8
                                r += warm
                                g += warm shr 2
                                b += warm shr 3
                            }
                            if (r > 255) r = 255
                            if (g > 255) g = 255
                            if (b > 255) b = 255
                        }
                    }

                    r = toneLut[r]
                    g = toneLut[g]
                    b = toneLut[b]

                    if (saturation != 256) {
                        val luma = (r * 77 + g * 151 + b * 28) shr 8
                        r = luma + ((r - luma) * saturation shr 8)
                        g = luma + ((g - luma) * saturation shr 8)
                        b = luma + ((b - luma) * saturation shr 8)
                    }
                    if (vignette != 0) {
                        val weight = 256 - ((vignetteMask[index] * vignette) shr 8)
                        r = (r * weight) shr 8
                        g = (g * weight) shr 8
                        b = (b * weight) shr 8
                    }
                    if (scan != 256) {
                        r = (r * scan) shr 8
                        g = (g * scan) shr 8
                        b = (b * scan) shr 8
                    }
                    if (grain != 0) {
                        val noise = grainField[(y shr 1) * grainWidth + (x shr 1)]
                        r += noise; g += noise; b += noise
                    }

                    frame[index] = (0xFF shl 24) or
                        (r.coerceIn(0, 255) shl 16) or
                        (g.coerceIn(0, 255) shl 8) or
                        b.coerceIn(0, 255)
                }
            }
        }
    }
}

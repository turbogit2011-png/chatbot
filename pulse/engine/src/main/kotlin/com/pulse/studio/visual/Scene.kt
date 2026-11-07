package com.pulse.studio.visual

import com.pulse.studio.audio.AudioFeatures
import kotlin.math.min

/** Everything a scene needs to know about this instant of the track. */
class RenderContext(
    val features: AudioFeatures,
    val palette: Palette,
    val width: Int,
    val height: Int,
    val fps: Float,
    val title: String,
    val artist: String,
    val cover: ImageSource?,
    val seed: Long,
) {
    var time: Float = 0f
        private set
    var frameIndex: Int = 0
        private set

    val centreX: Float get() = width * 0.5f
    val centreY: Float get() = height * 0.5f
    val shortSide: Float get() = min(width, height).toFloat()
    val unit: Float get() = shortSide / 100f

    fun advanceTo(seconds: Float, frame: Int) {
        time = seconds
        frameIndex = frame
    }

    val level: Float get() = features.levelAt(time)
    val bass: Float get() = features.bass(time)
    val mid: Float get() = features.mid(time)
    val treble: Float get() = features.treble(time)
    val onset: Float get() = features.onsetAt(time)
    val progress: Float get() = features.progress(time)

    fun band(index: Int): Float = features.bandAt(index, time)

    /** The fine spectrum sampled across 0..1, which is what bar layouts want. */
    fun spectrum(position: Float): Float = features.spectrumAt(position, time)
    fun beatPulse(decay: Float = 7f): Float = features.beatPulse(time, decay)
    fun beatIndex(): Int = features.beatIndex(time)

    /** 0..1 position inside the current bar, assuming four beats to the bar. */
    fun barPhase(): Float {
        val beats = features.beats
        if (beats.isEmpty()) return (time % 2f) / 2f
        val index = features.beatIndex(time)
        val since = features.secondsSinceBeat(time) ?: 0f
        val period = if (index + 1 < beats.size) beats[index + 1] - beats[index] else 0.5f
        val withinBeat = if (period > 0f) (since / period).coerceIn(0f, 1f) else 0f
        return ((index % 4) + withinBeat) / 4f
    }
}

/** One visual style. Scenes keep their own state between frames. */
interface Scene {
    val id: String
    val displayName: String

    /** Called once before the first frame. */
    fun reset(ctx: RenderContext) {}

    fun render(canvas: FrameCanvas, ctx: RenderContext)

    /** True when the style wants the artwork drawn by the scene itself. */
    val usesCover: Boolean get() = false
}

/** Deterministic noise so renders are reproducible frame to frame. */
class Noise(private val seed: Long) {
    fun value(x: Float, y: Float): Float {
        var h = seed xor (x.toRawBits().toLong() * 374761393L) xor (y.toRawBits().toLong() * 668265263L)
        h = (h xor (h ushr 13)) * 1274126177L
        return ((h xor (h ushr 16)) and 0xFFFF).toFloat() / 65535f
    }

    fun smooth(t: Float, channel: Int = 0): Float {
        val i = kotlin.math.floor(t)
        val f = t - i
        val a = value(i, channel.toFloat())
        val b = value(i + 1f, channel.toFloat())
        val k = f * f * (3f - 2f * f)
        return a + (b - a) * k
    }
}

package com.pulse.studio.text

import com.pulse.studio.audio.AudioFeatures
import kotlin.math.max
import kotlin.math.min

/** One word with its own slot inside a line. */
data class TimedWord(val text: String, val start: Float, val end: Float)

/** A line of lyrics placed on the timeline. */
data class TimedLine(
    val text: String,
    val start: Float,
    val end: Float,
    val words: List<TimedWord>,
) {
    val duration: Float get() = (end - start).coerceAtLeast(0.01f)

    fun progress(time: Float): Float = ((time - start) / duration).coerceIn(0f, 1f)

    /** Index of the word being sung, or -1 before the line starts. */
    fun wordAt(time: Float): Int {
        if (time < start) return -1
        for (i in words.indices.reversed()) {
            if (time >= words[i].start) return i
        }
        return 0
    }
}

/**
 * Turns pasted lyrics into something that can be drawn in time with the music.
 *
 * Two routes. If the text carries LRC timestamps the timings are exact and used as
 * written. Otherwise lines are spread across the beat grid inside the parts of the
 * track that are actually playing, which is not transcription and is not pretending
 * to be — but it lands lines on downbeats, which is what makes typography feel cut to
 * the music rather than scrolled over it.
 */
object Lyrics {

    private val LRC = Regex("^\\s*\\[(\\d{1,2}):(\\d{2})(?:[.:](\\d{1,3}))?\\]\\s*(.*)$")
    private val SECTION_TAG = Regex("^\\s*\\[[^\\]]+\\]\\s*$")

    fun hasTimestamps(raw: String): Boolean =
        raw.lineSequence().count { LRC.matches(it) } >= 2

    /**
     * @param barsPerLine how many bars of four beats each line is given; 0 lets the
     *   spacing be worked out from how many lines there are
     */
    fun align(
        raw: String,
        features: AudioFeatures,
        offsetSeconds: Float = 0f,
        barsPerLine: Int = 0,
    ): List<TimedLine> {
        if (raw.isBlank()) return emptyList()
        return if (hasTimestamps(raw)) {
            fromLrc(raw, features, offsetSeconds)
        } else {
            spreadOverBeats(raw, features, offsetSeconds, barsPerLine)
        }
    }

    // ------------------------------------------------------------------ parsing

    private fun cleanLines(raw: String): List<String> = raw.lineSequence()
        .map { it.trim() }
        .filter { it.isNotEmpty() && !SECTION_TAG.matches(it) }
        .toList()

    private fun fromLrc(raw: String, features: AudioFeatures, offset: Float): List<TimedLine> {
        val stamped = ArrayList<Pair<Float, String>>()
        for (line in raw.lines()) {
            val match = LRC.find(line) ?: continue
            val minutes = match.groupValues[1].toInt()
            val seconds = match.groupValues[2].toInt()
            val fraction = match.groupValues[3]
            val hundredths = when (fraction.length) {
                0 -> 0f
                1 -> fraction.toInt() / 10f
                2 -> fraction.toInt() / 100f
                else -> fraction.toInt() / 1000f
            }
            val text = match.groupValues[4].trim()
            if (text.isEmpty()) continue
            stamped.add((minutes * 60 + seconds + hundredths + offset) to text)
        }
        stamped.sortBy { it.first }
        return stamped.mapIndexed { index, (start, text) ->
            val end = if (index + 1 < stamped.size) {
                stamped[index + 1].first
            } else {
                min(start + 6f, features.durationSeconds)
            }
            TimedLine(text, start, end, splitWords(text, start, end))
        }
    }

    /**
     * Places lines on the beat grid, skipping the stretches where the track is quiet
     * enough to be an intro, a breakdown or an outro.
     */
    private fun spreadOverBeats(
        raw: String,
        features: AudioFeatures,
        offset: Float,
        barsPerLine: Int,
    ): List<TimedLine> {
        val lines = cleanLines(raw)
        if (lines.isEmpty()) return emptyList()

        val anchors = singableDownbeats(features)
        if (anchors.size < 2) {
            // No usable beat grid: fall back to an even split of the whole track.
            val slot = features.durationSeconds / lines.size
            return lines.mapIndexed { index, text ->
                val start = index * slot + offset
                TimedLine(text, start, start + slot, splitWords(text, start, start + slot))
            }
        }

        val step = if (barsPerLine > 0) {
            barsPerLine
        } else {
            max(1, anchors.size / max(1, lines.size))
        }

        val out = ArrayList<TimedLine>(lines.size)
        for ((index, text) in lines.withIndex()) {
            val anchorIndex = index * step
            if (anchorIndex >= anchors.size) break
            val start = anchors[anchorIndex] + offset
            val endAnchor = anchors.getOrNull(anchorIndex + step)
            val end = (endAnchor ?: (start + 4f)) + offset
            out.add(TimedLine(text, start, end.coerceAtLeast(start + 0.6f), splitWords(text, start, end)))
        }
        return out
    }

    /** Downbeats inside the louder half of the track — where words tend to be. */
    private fun singableDownbeats(features: AudioFeatures): FloatArray {
        val source = if (features.downbeats.size >= 4) features.downbeats else features.beats
        if (source.isEmpty()) return FloatArray(0)
        val levels = source.map { features.levelAt(it) }.sorted()
        if (levels.isEmpty()) return source
        val floor = levels[(levels.size * 0.35f).toInt().coerceAtMost(levels.size - 1)] * 0.8f
        val kept = source.filter { features.levelAt(it) >= floor }
        return if (kept.size >= 4) kept.toFloatArray() else source
    }

    /** Spreads a line's words across its slot, weighted by how long each word is. */
    private fun splitWords(text: String, start: Float, end: Float): List<TimedWord> {
        val words = text.split(Regex("\\s+")).filter { it.isNotBlank() }
        if (words.isEmpty()) return emptyList()
        val weights = words.map { max(1, it.length).toFloat() }
        val total = weights.sum()
        // Words are sung a touch ahead of the next line, not right up against it.
        val span = (end - start) * 0.82f
        var cursor = start
        return words.mapIndexed { index, word ->
            val slice = span * weights[index] / total
            val wordStart = cursor
            cursor += slice
            TimedWord(word, wordStart, cursor)
        }
    }

    /** Wraps a line into at most [maxLines] rows that each fit [maxWidth]. */
    fun wrap(
        text: String,
        maxWidth: Float,
        maxLines: Int,
        measure: (String) -> Float,
    ): List<String> {
        val words = text.split(Regex("\\s+")).filter { it.isNotBlank() }
        if (words.isEmpty()) return emptyList()
        val rows = ArrayList<String>()
        var current = StringBuilder()
        for (word in words) {
            val candidate = if (current.isEmpty()) word else "$current $word"
            if (measure(candidate) <= maxWidth || current.isEmpty()) {
                current = StringBuilder(candidate)
            } else {
                rows.add(current.toString())
                current = StringBuilder(word)
                if (rows.size == maxLines) break
            }
        }
        if (rows.size < maxLines && current.isNotEmpty()) rows.add(current.toString())
        return rows
    }
}

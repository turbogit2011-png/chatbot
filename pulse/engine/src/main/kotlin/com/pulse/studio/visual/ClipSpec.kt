package com.pulse.studio.visual

import com.pulse.studio.fx.FxSettings
import kotlinx.serialization.Serializable

enum class AspectRatio(val id: String, val label: String, val widthRatio: Int, val heightRatio: Int) {
    Portrait("9:16", "9:16 · Reels, TikTok, Shorts", 9, 16),
    Square("1:1", "1:1 · Feed", 1, 1),
    Landscape("16:9", "16:9 · YouTube", 16, 9);

    fun sizeFor(shortSide: Int): Pair<Int, Int> {
        fun even(value: Int) = if (value % 2 == 0) value else value + 1
        return when (this) {
            Portrait -> even(shortSide) to even(shortSide * 16 / 9)
            Square -> even(shortSide) to even(shortSide)
            Landscape -> even(shortSide * 16 / 9) to even(shortSide)
        }
    }

    companion object {
        fun byId(id: String): AspectRatio = entries.firstOrNull { it.id == id } ?: Portrait
    }
}

enum class Quality(val id: String, val label: String, val shortSide: Int, val bitRate: Int) {
    Fast("540", "540p · fastest", 540, 3_000_000),
    Standard("720", "720p · recommended", 720, 6_000_000),
    High("1080", "1080p · sharpest", 1080, 12_000_000);

    companion object {
        fun byId(id: String): Quality = entries.firstOrNull { it.id == id } ?: Standard
    }
}

/** Named finishing looks the user can pick, over the template's own default. */
enum class Look(val id: String, val label: String, val settings: FxSettings?) {
    Auto("auto", "Match the template", null),
    Clean("clean", "Clean", FxSettings.Clean),
    Film("film", "Film", FxSettings.Film),
    Vhs("vhs", "VHS", FxSettings.Vhs),
    Hard("hard", "Hard", FxSettings.Hard),
    Dream("dream", "Dream", FxSettings.Dream),
    Flat("flat", "No effects", FxSettings.None);

    companion object {
        fun byId(id: String): Look = entries.firstOrNull { it.id == id } ?: Auto
    }
}

/** Everything the user chose for one clip. Stored so a clip can be re-rendered. */
@Serializable
data class ClipSpec(
    val styleId: String = "auto",
    val paletteId: String = "neon",
    val aspectId: String = "9:16",
    val qualityId: String = "720",
    val lookId: String = "auto",
    val lyricStyleId: String = "auto",
    val fps: Int = 30,
    val title: String = "",
    val artist: String = "",
    val lyrics: String = "",
    val lyricOffsetSeconds: Float = 0f,
    val showText: Boolean = true,
    val showProgress: Boolean = true,
    val useCover: Boolean = true,
    val mediaUris: List<String> = emptyList(),
    val startSeconds: Float = 0f,
    val endSeconds: Float = 0f,
    val seed: Long = 0L,
) {
    val aspect: AspectRatio get() = AspectRatio.byId(aspectId)
    val quality: Quality get() = Quality.byId(qualityId)
    val palette: Palette get() = Palette.byId(paletteId)
    val look: Look get() = Look.byId(lookId)
    val hasLyrics: Boolean get() = lyrics.isNotBlank()
}

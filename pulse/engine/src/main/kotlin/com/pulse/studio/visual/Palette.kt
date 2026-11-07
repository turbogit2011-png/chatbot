package com.pulse.studio.visual

/** A named set of colours a clip is painted with. */
data class Palette(
    val id: String,
    val name: String,
    val background: Int,
    val backgroundDeep: Int,
    val primary: Int,
    val secondary: Int,
    val accent: Int,
) {
    /** Picks a colour along primary → secondary → accent. */
    fun ramp(t: Float): Int {
        val k = t.coerceIn(0f, 1f)
        return if (k < 0.5f) Col.lerp(primary, secondary, k * 2f)
        else Col.lerp(secondary, accent, (k - 0.5f) * 2f)
    }

    companion object {
        val Sunset = Palette(
            "sunset", "Sunset",
            background = Col.argb(255, 18, 8, 24), backgroundDeep = Col.argb(255, 6, 3, 12),
            primary = Col.argb(255, 255, 94, 120),
            secondary = Col.argb(255, 255, 170, 70),
            accent = Col.argb(255, 255, 230, 140),
        )
        val Neon = Palette(
            "neon", "Neon",
            background = Col.argb(255, 8, 6, 26), backgroundDeep = Col.argb(255, 3, 2, 12),
            primary = Col.argb(255, 120, 90, 255),
            secondary = Col.argb(255, 255, 70, 200),
            accent = Col.argb(255, 70, 230, 255),
        )
        val Mint = Palette(
            "mint", "Mint",
            background = Col.argb(255, 4, 20, 20), backgroundDeep = Col.argb(255, 2, 10, 10),
            primary = Col.argb(255, 60, 240, 190),
            secondary = Col.argb(255, 120, 255, 120),
            accent = Col.argb(255, 230, 255, 210),
        )
        val Ember = Palette(
            "ember", "Ember",
            background = Col.argb(255, 22, 8, 4), backgroundDeep = Col.argb(255, 10, 3, 2),
            primary = Col.argb(255, 255, 110, 40),
            secondary = Col.argb(255, 255, 60, 60),
            accent = Col.argb(255, 255, 210, 120),
        )
        val Ice = Palette(
            "ice", "Ice",
            background = Col.argb(255, 6, 14, 28), backgroundDeep = Col.argb(255, 2, 6, 14),
            primary = Col.argb(255, 90, 180, 255),
            secondary = Col.argb(255, 150, 230, 255),
            accent = Col.argb(255, 235, 250, 255),
        )
        val Mono = Palette(
            "mono", "Mono",
            background = Col.argb(255, 10, 10, 10), backgroundDeep = Col.argb(255, 0, 0, 0),
            primary = Col.argb(255, 245, 245, 245),
            secondary = Col.argb(255, 170, 170, 170),
            accent = Col.argb(255, 255, 255, 255),
        )
        val Candy = Palette(
            "candy", "Candy",
            background = Col.argb(255, 20, 6, 26), backgroundDeep = Col.argb(255, 8, 2, 12),
            primary = Col.argb(255, 255, 90, 170),
            secondary = Col.argb(255, 160, 120, 255),
            accent = Col.argb(255, 120, 240, 255),
        )

        val all = listOf(Sunset, Neon, Mint, Ember, Ice, Mono, Candy)

        fun byId(id: String): Palette = all.firstOrNull { it.id == id } ?: Neon
    }
}

package com.sonara.studio.engine

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.Typeface
import java.io.File
import kotlin.math.abs
import kotlin.math.sin

/** Draws the cover art for a generated track, on device, with no network. */
object CoverArtist {

    private const val SIZE = 1024

    fun render(file: File, title: String, seed: String, tags: List<String>): File? = runCatching {
        val palette = palette(seed)
        val bitmap = Bitmap.createBitmap(SIZE, SIZE, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG)

        paint.shader = LinearGradient(
            0f, 0f, SIZE * 0.4f, SIZE.toFloat(),
            intArrayOf(palette[0], palette[1], palette[2]),
            floatArrayOf(0f, 0.55f, 1f),
            Shader.TileMode.CLAMP,
        )
        canvas.drawRect(0f, 0f, SIZE.toFloat(), SIZE.toFloat(), paint)
        paint.shader = null

        val hash = abs(seed.hashCode())
        for (i in 0 until 4) {
            val radius = SIZE * (0.2f + ((hash shr (i * 3)) and 0xFF) / 255f * 0.28f)
            val cx = SIZE * (((hash shr (i * 5)) and 0xFF) / 255f)
            val cy = SIZE * (((hash shr (i * 7)) and 0xFF) / 255f)
            paint.color = (palette[i % 3] and 0x00FFFFFF) or (0x33 shl 24)
            canvas.drawCircle(cx, cy, radius, paint)
        }

        paint.color = Color.argb(200, 255, 255, 255)
        val bars = 48
        val barWidth = SIZE / (bars * 1.6f)
        val mid = SIZE * 0.6f
        for (i in 0 until bars) {
            val amp = sin(i * 0.42f + hash % 7) * 0.5f + sin(i * 0.17f + hash % 13) * 0.3f + 0.6f
            val height = (SIZE * 0.22f * abs(amp)).coerceAtLeast(SIZE * 0.02f)
            val x = SIZE * 0.08f + i * (SIZE * 0.84f / bars)
            canvas.drawRoundRect(
                RectF(x, mid - height / 2, x + barWidth, mid + height / 2),
                barWidth / 2, barWidth / 2, paint,
            )
        }

        paint.color = Color.argb(120, 0, 0, 0)
        canvas.drawRect(0f, SIZE * 0.80f, SIZE.toFloat(), SIZE.toFloat(), paint)

        paint.color = Color.argb(240, 255, 255, 255)
        paint.typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
        paint.textSize = SIZE * 0.065f
        canvas.drawText(title.take(30), SIZE * 0.08f, SIZE * 0.885f, paint)

        if (tags.isNotEmpty()) {
            paint.typeface = Typeface.DEFAULT
            paint.color = Color.argb(190, 255, 255, 255)
            paint.textSize = SIZE * 0.032f
            canvas.drawText(tags.take(4).joinToString(" · ").take(52), SIZE * 0.08f, SIZE * 0.945f, paint)
        }

        file.parentFile?.mkdirs()
        file.outputStream().use { bitmap.compress(Bitmap.CompressFormat.JPEG, 88, it) }
        bitmap.recycle()
        file
    }.getOrNull()

    private fun palette(seed: String): IntArray {
        val hash = abs(seed.hashCode())
        val base = (hash % 360).toFloat()
        return intArrayOf(
            Color.HSVToColor(floatArrayOf(base % 360f, 0.72f, 0.92f)),
            Color.HSVToColor(floatArrayOf((base + 42f) % 360f, 0.78f, 0.62f)),
            Color.HSVToColor(floatArrayOf((base + 86f) % 360f, 0.72f, 0.38f)),
        )
    }
}

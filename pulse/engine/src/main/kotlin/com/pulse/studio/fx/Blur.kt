package com.pulse.studio.fx

/**
 * Separable box blur on a downsampled buffer.
 *
 * Three box passes approximate a Gaussian closely enough for bloom, and running them
 * at a quarter resolution makes a wide, soft glow cost about as much as a narrow one.
 */
object Blur {

    /** Averages [factor] x [factor] blocks of [src] into [dst]. */
    fun downsample(
        src: IntArray,
        srcWidth: Int,
        srcHeight: Int,
        dst: IntArray,
        factor: Int,
    ): Pair<Int, Int> {
        val dstWidth = (srcWidth + factor - 1) / factor
        val dstHeight = (srcHeight + factor - 1) / factor
        for (y in 0 until dstHeight) {
            val y0 = y * factor
            val y1 = minOf(y0 + factor, srcHeight)
            for (x in 0 until dstWidth) {
                val x0 = x * factor
                val x1 = minOf(x0 + factor, srcWidth)
                var r = 0
                var g = 0
                var b = 0
                var count = 0
                for (sy in y0 until y1) {
                    var index = sy * srcWidth + x0
                    for (sx in x0 until x1) {
                        val pixel = src[index++]
                        r += (pixel ushr 16) and 0xFF
                        g += (pixel ushr 8) and 0xFF
                        b += pixel and 0xFF
                        count++
                    }
                }
                if (count == 0) count = 1
                dst[y * dstWidth + x] =
                    ((r / count) shl 16) or ((g / count) shl 8) or (b / count)
            }
        }
        return dstWidth to dstHeight
    }

    /** Three horizontal + vertical box passes, in place. [scratch] must match [buffer]. */
    fun blur(buffer: IntArray, width: Int, height: Int, radius: Int, scratch: IntArray, passes: Int = 3) {
        if (radius < 1 || width < 2 || height < 2) return
        repeat(passes) {
            boxHorizontal(buffer, scratch, width, height, radius)
            boxVertical(scratch, buffer, width, height, radius)
        }
    }

    private fun boxHorizontal(src: IntArray, dst: IntArray, width: Int, height: Int, radius: Int) {
        val window = radius * 2 + 1
        for (y in 0 until height) {
            val row = y * width
            var r = 0
            var g = 0
            var b = 0
            // seed the running sum with the clamped left edge
            for (i in -radius..radius) {
                val pixel = src[row + i.coerceIn(0, width - 1)]
                r += (pixel ushr 16) and 0xFF
                g += (pixel ushr 8) and 0xFF
                b += pixel and 0xFF
            }
            for (x in 0 until width) {
                dst[row + x] = ((r / window) shl 16) or ((g / window) shl 8) or (b / window)
                val outPixel = src[row + (x - radius).coerceIn(0, width - 1)]
                val inPixel = src[row + (x + radius + 1).coerceIn(0, width - 1)]
                r += ((inPixel ushr 16) and 0xFF) - ((outPixel ushr 16) and 0xFF)
                g += ((inPixel ushr 8) and 0xFF) - ((outPixel ushr 8) and 0xFF)
                b += (inPixel and 0xFF) - (outPixel and 0xFF)
            }
        }
    }

    private fun boxVertical(src: IntArray, dst: IntArray, width: Int, height: Int, radius: Int) {
        val window = radius * 2 + 1
        for (x in 0 until width) {
            var r = 0
            var g = 0
            var b = 0
            for (i in -radius..radius) {
                val pixel = src[i.coerceIn(0, height - 1) * width + x]
                r += (pixel ushr 16) and 0xFF
                g += (pixel ushr 8) and 0xFF
                b += pixel and 0xFF
            }
            for (y in 0 until height) {
                dst[y * width + x] = ((r / window) shl 16) or ((g / window) shl 8) or (b / window)
                val outPixel = src[(y - radius).coerceIn(0, height - 1) * width + x]
                val inPixel = src[(y + radius + 1).coerceIn(0, height - 1) * width + x]
                r += ((inPixel ushr 16) and 0xFF) - ((outPixel ushr 16) and 0xFF)
                g += ((inPixel ushr 8) and 0xFF) - ((outPixel ushr 8) and 0xFF)
                b += (inPixel and 0xFF) - (outPixel and 0xFF)
            }
        }
    }
}

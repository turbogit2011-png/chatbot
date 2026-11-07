package com.pulse.studio.codec

import java.nio.ByteBuffer

/**
 * Converts packed ARGB pixels into the YUV 4:2:0 planes a video encoder expects.
 *
 * Written against plain ByteBuffers and explicit strides rather than Android types,
 * so the arithmetic — which is where this kind of code goes wrong — can be unit
 * tested on the JVM. BT.601 limited range, which is what H.264 in an MP4 implies.
 */
object YuvConverter {

    /**
     * @param argb packed pixels, row-major, [width] * [height] entries
     * @param yPlane destination for luma, [yRowStride] bytes per row
     * @param uPlane / [vPlane] destination for chroma at half resolution
     * @param uvPixelStride 1 for planar (I420), 2 for semi-planar (NV12/NV21)
     */
    fun argbToYuv420(
        argb: IntArray,
        width: Int,
        height: Int,
        yPlane: ByteBuffer,
        yRowStride: Int,
        uPlane: ByteBuffer,
        vPlane: ByteBuffer,
        uvRowStride: Int,
        uvPixelStride: Int,
    ) {
        require(argb.size >= width * height) { "pixel buffer too small" }

        for (y in 0 until height) {
            val rowStart = y * width
            var destination = y * yRowStride
            for (x in 0 until width) {
                val pixel = argb[rowStart + x]
                val r = (pixel ushr 16) and 0xFF
                val g = (pixel ushr 8) and 0xFF
                val b = pixel and 0xFF
                // 16..235 luma, matching BT.601 limited range
                val luma = (((66 * r + 129 * g + 25 * b + 128) shr 8) + 16).coerceIn(0, 255)
                yPlane.put(destination, luma.toByte())
                destination++
            }
        }

        val chromaHeight = (height + 1) / 2
        val chromaWidth = (width + 1) / 2
        for (cy in 0 until chromaHeight) {
            val y0 = cy * 2
            val y1 = (y0 + 1).coerceAtMost(height - 1)
            for (cx in 0 until chromaWidth) {
                val x0 = cx * 2
                val x1 = (x0 + 1).coerceAtMost(width - 1)

                // average the 2x2 block before converting, which is cheaper and
                // cleaner than converting four pixels and averaging afterwards
                var r = 0
                var g = 0
                var b = 0
                for (py in intArrayOf(y0, y1)) {
                    for (px in intArrayOf(x0, x1)) {
                        val pixel = argb[py * width + px]
                        r += (pixel ushr 16) and 0xFF
                        g += (pixel ushr 8) and 0xFF
                        b += pixel and 0xFF
                    }
                }
                r /= 4; g /= 4; b /= 4

                val u = (((-38 * r - 74 * g + 112 * b + 128) shr 8) + 128).coerceIn(0, 255)
                val v = (((112 * r - 94 * g - 18 * b + 128) shr 8) + 128).coerceIn(0, 255)
                val offset = cy * uvRowStride + cx * uvPixelStride
                uPlane.put(offset, u.toByte())
                vPlane.put(offset, v.toByte())
            }
        }
    }
}

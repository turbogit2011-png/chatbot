package com.pulse.studio

import com.pulse.studio.codec.YuvConverter
import java.nio.ByteBuffer
import kotlin.math.abs
import kotlin.test.Test
import kotlin.test.assertTrue

/** Colour conversion is pure arithmetic, and the strides are where it goes wrong. */
class YuvConverterTest {

    private class Planes(width: Int, height: Int, val uvPixelStride: Int, padding: Int = 0) {
        val yRowStride = width + padding
        val uvRowStride = (width + 1) / 2 * uvPixelStride + padding
        val y: ByteBuffer = ByteBuffer.allocate(yRowStride * height)
        val u: ByteBuffer = ByteBuffer.allocate(uvRowStride * ((height + 1) / 2) + uvPixelStride)
        val v: ByteBuffer = ByteBuffer.allocate(uvRowStride * ((height + 1) / 2) + uvPixelStride)
    }

    private fun convert(argb: IntArray, width: Int, height: Int, planes: Planes) {
        YuvConverter.argbToYuv420(
            argb, width, height,
            planes.y, planes.yRowStride,
            planes.u, planes.v, planes.uvRowStride, planes.uvPixelStride,
        )
    }

    private fun luma(planes: Planes, x: Int, y: Int) = planes.y.get(y * planes.yRowStride + x).toInt() and 0xFF
    private fun chromaU(planes: Planes, x: Int, y: Int) =
        planes.u.get(y * planes.uvRowStride + x * planes.uvPixelStride).toInt() and 0xFF
    private fun chromaV(planes: Planes, x: Int, y: Int) =
        planes.v.get(y * planes.uvRowStride + x * planes.uvPixelStride).toInt() and 0xFF

    @Test
    fun `black and white map to the limited range`() {
        val width = 4
        val height = 4
        val black = IntArray(width * height) { 0xFF000000.toInt() }
        val white = IntArray(width * height) { 0xFFFFFFFF.toInt() }

        val blackPlanes = Planes(width, height, 1)
        convert(black, width, height, blackPlanes)
        assertTrue(luma(blackPlanes, 0, 0) == 16, "black luma was ${luma(blackPlanes, 0, 0)}")
        assertTrue(abs(chromaU(blackPlanes, 0, 0) - 128) <= 1)

        val whitePlanes = Planes(width, height, 1)
        convert(white, width, height, whitePlanes)
        assertTrue(abs(luma(whitePlanes, 0, 0) - 235) <= 1, "white luma was ${luma(whitePlanes, 0, 0)}")
        assertTrue(abs(chromaU(whitePlanes, 0, 0) - 128) <= 1)
    }

    @Test
    fun `primary colours land on the expected chroma`() {
        val width = 2
        val height = 2
        fun single(colour: Int): Planes {
            val planes = Planes(width, height, 1)
            convert(IntArray(width * height) { colour }, width, height, planes)
            return planes
        }
        // red: V well above neutral, U below
        val red = single(0xFFFF0000.toInt())
        assertTrue(chromaV(red, 0, 0) > 200, "red V was ${chromaV(red, 0, 0)}")
        assertTrue(chromaU(red, 0, 0) < 110, "red U was ${chromaU(red, 0, 0)}")
        // blue: U well above neutral
        val blue = single(0xFF0000FF.toInt())
        assertTrue(chromaU(blue, 0, 0) > 200, "blue U was ${chromaU(blue, 0, 0)}")
        assertTrue(chromaV(blue, 0, 0) < 130, "blue V was ${chromaV(blue, 0, 0)}")
        // green: both below neutral
        val green = single(0xFF00FF00.toInt())
        assertTrue(chromaU(green, 0, 0) < 70 && chromaV(green, 0, 0) < 70)
    }

    @Test
    fun `row padding is respected`() {
        val width = 6
        val height = 4
        val argb = IntArray(width * height) { if (it % width < 3) 0xFF000000.toInt() else 0xFFFFFFFF.toInt() }
        val planes = Planes(width, height, 1, padding = 7)
        convert(argb, width, height, planes)
        for (y in 0 until height) {
            assertTrue(luma(planes, 0, y) == 16, "left half should be black on row $y")
            assertTrue(abs(luma(planes, 5, y) - 235) <= 1, "right half should be white on row $y")
        }
    }

    @Test
    fun `semi planar layout interleaves chroma`() {
        val width = 4
        val height = 4
        val argb = IntArray(width * height) { 0xFFFF0000.toInt() }
        val planes = Planes(width, height, uvPixelStride = 2)
        convert(argb, width, height, planes)
        // u and v buffers are the same memory in NV12; here they are separate, but the
        // offsets must still step by two bytes per chroma sample
        assertTrue(chromaV(planes, 1, 1) > 200)
        assertTrue(chromaU(planes, 1, 1) < 110)
    }

    @Test
    fun `odd dimensions do not overflow`() {
        val width = 5
        val height = 3
        val argb = IntArray(width * height) { 0xFF123456.toInt() }
        val planes = Planes(width, height, 1)
        convert(argb, width, height, planes)
        assertTrue(luma(planes, 4, 2) > 0)
    }

    @Test
    fun `a gradient keeps its ordering`() {
        val width = 16
        val height = 2
        val argb = IntArray(width * height) { index ->
            val value = (index % width) * 255 / (width - 1)
            0xFF000000.toInt() or (value shl 16) or (value shl 8) or value
        }
        val planes = Planes(width, height, 1)
        convert(argb, width, height, planes)
        for (x in 1 until width) {
            assertTrue(luma(planes, x, 0) >= luma(planes, x - 1, 0), "luma dipped at $x")
        }
    }
}

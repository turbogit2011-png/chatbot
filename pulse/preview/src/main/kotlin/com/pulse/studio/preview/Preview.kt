package com.pulse.studio.preview

import com.pulse.studio.TestAudio
import com.pulse.studio.audio.AudioAnalyzer
import com.pulse.studio.visual.AspectRatio
import com.pulse.studio.visual.ClipSpec
import com.pulse.studio.visual.Director
import java.io.BufferedOutputStream
import java.io.File
import javax.imageio.ImageIO

/**
 * Development harness: renders the real visual engine on a desktop JVM.
 *
 * It exists so the exact frames the Android app will produce can be looked at and
 * turned into a video without a device. Frames are piped straight into ffmpeg as raw
 * RGB, which is both faster and lighter than writing a PNG sequence.
 *
 * Usage:
 *   ./gradlew :preview:run --args="--audio song.wav --out clip.mp4 --style auto --palette neon"
 *   ./gradlew :preview:run --args="--stills build/stills"
 */
object Preview {

    @JvmStatic
    fun main(args: Array<String>) {
        val options = parse(args)
        val audioPath = options["audio"]
        val stills = options["stills"]

        val (mono, sampleRate, title) = if (audioPath != null) {
            val file = File(audioPath)
            require(file.exists()) { "no such audio file: $audioPath" }
            val (samples, rate) = TestAudio.readWavMono(file)
            Triple(samples, rate, file.nameWithoutExtension)
        } else {
            Triple(TestAudio.drumLoop(124f, 30f, seed = 11), TestAudio.SR, "Test Loop")
        }

        print("analysing ${"%.1f".format(mono.size.toFloat() / sampleRate)}s of audio... ")
        val started = System.currentTimeMillis()
        val features = AudioAnalyzer.analyze(mono, sampleRate, title)
        println(
            "done in ${System.currentTimeMillis() - started} ms — " +
                "tempo ${"%.1f".format(features.tempo)}, ${features.beats.size} beats, " +
                "${features.sections.size} sections",
        )

        val spec = ClipSpec(
            styleId = options["style"] ?: "auto",
            paletteId = options["palette"] ?: "neon",
            aspectId = options["aspect"] ?: "9:16",
            qualityId = options["quality"] ?: "540",
            fps = options["fps"]?.toIntOrNull() ?: 30,
            title = options["title"] ?: title,
            artist = options["artist"] ?: "Pulse Studio",
            seed = options["seed"]?.toLongOrNull() ?: 7L,
            endSeconds = options["seconds"]?.toFloatOrNull() ?: 0f,
        )
        val (width, height) = spec.aspect.sizeFor(spec.quality.shortSide)
        val cover = options["cover"]?.let { AwtImage(ImageIO.read(File(it))) }

        if (stills != null) {
            writeStills(features, spec, width, height, cover, File(stills))
            return
        }

        val director = Director(features, spec, width, height, cover)
        val out = options["out"] ?: "build/preview.mp4"
        File(out).parentFile?.mkdirs()

        val command = mutableListOf(
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
            "-f", "rawvideo", "-pix_fmt", "rgb24",
            "-s", "${width}x$height", "-r", spec.fps.toString(), "-i", "-",
        )
        if (audioPath != null) command += listOf("-i", audioPath)
        command += listOf(
            "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
        )
        if (audioPath != null) command += listOf("-c:a", "aac", "-b:a", "192k", "-shortest")
        command += out

        val process = ProcessBuilder(command).redirectErrorStream(false).start()
        val sink = BufferedOutputStream(process.outputStream, 1 shl 20)
        val canvas = AwtCanvas(width, height)
        val row = IntArray(width)
        val bytes = ByteArray(width * height * 3)

        val renderStart = System.currentTimeMillis()
        for (frame in 0 until director.frameCount) {
            director.renderFrame(canvas, frame)
            var index = 0
            for (y in 0 until height) {
                canvas.image.getRGB(0, y, width, 1, row, 0, width)
                for (x in 0 until width) {
                    val pixel = row[x]
                    bytes[index++] = ((pixel ushr 16) and 0xFF).toByte()
                    bytes[index++] = ((pixel ushr 8) and 0xFF).toByte()
                    bytes[index++] = (pixel and 0xFF).toByte()
                }
            }
            sink.write(bytes)
            if (frame % 60 == 0) {
                print("\rrendering ${frame * 100 / director.frameCount}%")
                System.out.flush()
            }
        }
        sink.flush()
        sink.close()
        val code = process.waitFor()
        canvas.dispose()
        val elapsed = (System.currentTimeMillis() - renderStart) / 1000.0
        println(
            "\rrendered ${director.frameCount} frames (${width}x$height) in " +
                "${"%.1f".format(elapsed)}s → $out (ffmpeg exit $code)",
        )
    }

    private fun writeStills(
        features: com.pulse.studio.audio.AudioFeatures,
        spec: ClipSpec,
        width: Int,
        height: Int,
        cover: AwtImage?,
        dir: File,
    ) {
        dir.mkdirs()
        for (scene in Director.available()) {
            val styled = spec.copy(styleId = scene.id)
            val director = Director(features, styled, width, height, cover)
            val canvas = AwtCanvas(width, height)
            for (frame in 0 until 150) director.renderFrame(canvas, frame)
            canvas.save(File(dir, "${scene.id}.png"))
            canvas.dispose()
            println("still ${scene.id} → ${File(dir, "${scene.id}.png")}")
        }
    }

    private fun parse(args: Array<String>): Map<String, String> {
        val out = HashMap<String, String>()
        var i = 0
        while (i < args.size) {
            val key = args[i]
            if (key.startsWith("--") && i + 1 < args.size) {
                out[key.removePrefix("--")] = args[i + 1]
                i += 2
            } else {
                i++
            }
        }
        return out
    }
}

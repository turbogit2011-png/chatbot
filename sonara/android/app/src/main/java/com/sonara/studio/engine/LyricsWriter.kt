package com.sonara.studio.engine

import kotlin.random.Random

/**
 * On-device lyric writer.
 *
 * It is a structured template engine, not a language model: it reads the brief for
 * subject matter, picks matching imagery, and returns correctly tagged verses, a
 * pre-chorus, a hook and a bridge. Original lines only — it never reproduces existing
 * songs. When the app is pointed at a server with a language model configured, that
 * writer is used instead.
 */
object LyricsWriter {

    data class Result(val title: String, val lyrics: String, val styleTags: List<String>)

    private val IMAGERY = mapOf(
        "night" to listOf("neon", "streetlights", "taillights", "midnight", "headlights", "rooftops"),
        "love" to listOf("your hands", "your name", "that photograph", "the doorway", "our old song"),
        "leaving" to listOf("the last train", "the open road", "packed bags", "the rear-view mirror", "border lights"),
        "hope" to listOf("first light", "a new morning", "open sky", "the rising tide", "a clean slate"),
        "loss" to listOf("empty rooms", "cold coffee", "unsent letters", "static radio", "closed doors"),
        "party" to listOf("the speakers", "the floor", "the countdown", "spilled drinks", "strobe light"),
    )

    private val VERBS = listOf(
        "run", "burn", "hold on", "let go", "keep driving", "break", "rise", "wait", "shout", "stay",
    )

    private val STOP = setOf(
        "song", "track", "about", "with", "that", "this", "very", "make", "write", "sound",
        "sounds", "like", "vocals", "vocal", "style", "music", "please", "want", "would",
        "piosenka", "utwor", "utwór", "tekst", "zrob", "zrób",
    )

    fun write(prompt: String, style: String?, language: String, structureTags: Boolean = true): Result {
        val random = Random(prompt.hashCode().toLong())
        val keys = keywords(prompt).ifEmpty { listOf("tonight", "city", "promise") }
        val images = IMAGERY.getValue(bucket(prompt))
        val subject = keys[0]
        val second = keys.getOrElse(1) { images.random(random).split(" ").last() }

        fun line(template: String): String = template
            .replace("{subject}", subject)
            .replace("{second}", second)
            .replace("{image}", images[random.nextInt(images.size)])
            .replace("{image2}", images[random.nextInt(images.size)])
            .replace("{verb}", VERBS[random.nextInt(VERBS.size)])

        val verse1 = listOf(
            line("I woke up thinking about {subject} again"),
            line("{image} still burning where we left them"),
            line("Nothing in this room has moved since then"),
            line("Just the sound of {second} in my chest"),
        )
        val pre = listOf(
            line("And I can feel it coming, I can feel it coming"),
            line("Every light in the city says {verb}"),
        )
        val chorus = listOf(
            line("So we {verb} — straight through the {image}"),
            line("No looking back, no map, no name"),
            line("If {subject} is a question, I'm the answer tonight"),
            line("We {verb} until the morning takes the blame"),
        )
        val verse2 = listOf(
            line("You said forever like it cost you nothing"),
            line("I kept the receipt, I kept {image2}"),
            line("Now every stranger wears your jacket"),
            line("And every chorus sounds like {second}"),
        )
        val bridge = listOf(
            line("Quiet now — just {image} and breathing"),
            line("I'm not asking you to stay, only to mean it"),
        )
        val outro = listOf(line("{verb}, {subject}, {verb}"))

        val body = if (structureTags) {
            buildList {
                add("[Verse 1]"); addAll(verse1); add("")
                add("[Pre-Chorus]"); addAll(pre); add("")
                add("[Chorus]"); addAll(chorus); add("")
                add("[Verse 2]"); addAll(verse2); add("")
                add("[Chorus]"); addAll(chorus); add("")
                add("[Bridge]"); addAll(bridge); add("")
                add("[Outro]"); addAll(outro)
            }
        } else {
            verse1 + "" + pre + "" + chorus + "" + verse2 + "" + bridge + "" + outro
        }

        val tags = style?.split(",")?.map { it.trim() }?.filter { it.isNotEmpty() }?.take(6)
            ?: listOf(bucket(prompt), "melodic", "modern production")

        return Result(titleFrom(prompt), body.joinToString("\n").trim(), tags)
    }

    private fun keywords(prompt: String): List<String> =
        Regex("[\\p{L}]{4,}").findAll(prompt.lowercase())
            .map { it.value }
            .filter { it !in STOP }
            .take(8)
            .toList()

    private fun titleFrom(prompt: String): String {
        val keys = keywords(prompt)
        return when {
            keys.size >= 2 -> "${keys[0].replaceFirstChar { it.uppercase() }} ${keys[1].replaceFirstChar { it.uppercase() }}"
            keys.size == 1 -> keys[0].replaceFirstChar { it.uppercase() }
            else -> "Untitled Sonara Song"
        }
    }

    private fun bucket(prompt: String): String {
        val lowered = prompt.lowercase()
        IMAGERY.keys.firstOrNull { lowered.contains(it) }?.let { return it }
        return when {
            listOf("leave", "leaving", "gone", "away", "road", "train").any { lowered.contains(it) } -> "leaving"
            listOf("love", "heart", "kiss", "miss").any { lowered.contains(it) } -> "love"
            listOf("dance", "club", "party", "festival", "drop", "house").any { lowered.contains(it) } -> "party"
            listOf("sad", "cry", "lost", "alone", "broken").any { lowered.contains(it) } -> "loss"
            listOf("hope", "rise", "win", "dream", "morning").any { lowered.contains(it) } -> "hope"
            else -> "night"
        }
    }
}

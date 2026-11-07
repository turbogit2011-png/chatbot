package com.sonara.studio.data.remote

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class GenerateRequest(
    val prompt: String? = null,
    val lyrics: String? = null,
    val title: String? = null,
    val style: String? = null,
    @SerialName("negative_style") val negativeStyle: String? = null,
    val instrumental: Boolean = false,
    val model: String = "sonara-v1",
    @SerialName("duration_seconds") val durationSeconds: Int = 180,
    @SerialName("style_weight") val styleWeight: Float = 0.6f,
    @SerialName("weirdness") val weirdness: Float = 0.35f,
    @SerialName("lyrics_weight") val lyricsWeight: Float = 0.6f,
    val language: String? = null,
    @SerialName("vocal_gender") val vocalGender: String? = null,
    @SerialName("tempo_bpm") val tempoBpm: Int? = null,
    @SerialName("key_signature") val keySignature: String? = null,
    val seed: Long? = null,
    @SerialName("num_variations") val numVariations: Int = 2,
    @SerialName("reference_audio_id") val referenceAudioId: String? = null,
    @SerialName("persona_id") val personaId: String? = null,
)

@Serializable
data class ExtendRequest(
    @SerialName("clip_id") val clipId: String,
    @SerialName("continue_at_seconds") val continueAtSeconds: Float,
    val lyrics: String? = null,
    val style: String? = null,
    @SerialName("duration_seconds") val durationSeconds: Int = 120,
    val model: String = "sonara-v1",
    @SerialName("num_variations") val numVariations: Int = 1,
)

@Serializable
data class CoverRequest(
    @SerialName("clip_id") val clipId: String? = null,
    @SerialName("reference_audio_id") val referenceAudioId: String? = null,
    val style: String,
    val lyrics: String? = null,
    @SerialName("keep_vocals") val keepVocals: Boolean = false,
    val model: String = "sonara-v1",
    @SerialName("num_variations") val numVariations: Int = 2,
)

@Serializable
data class StemsRequest(
    @SerialName("clip_id") val clipId: String,
    val mode: String = "two_stem",
)

@Serializable
data class LyricsRequest(
    val prompt: String,
    val language: String = "auto",
    val style: String? = null,
    @SerialName("structure_tags") val structureTags: Boolean = true,
)

@Serializable
data class LyricsResponse(
    val title: String,
    val lyrics: String,
    @SerialName("style_tags") val styleTags: List<String> = emptyList(),
)

@Serializable
data class ClipDto(
    val id: String,
    val title: String = "Untitled",
    @SerialName("audio_url") val audioUrl: String? = null,
    @SerialName("stream_url") val streamUrl: String? = null,
    @SerialName("image_url") val imageUrl: String? = null,
    @SerialName("duration_seconds") val durationSeconds: Float = 0f,
    val lyrics: String? = null,
    @SerialName("style_tags") val styleTags: List<String> = emptyList(),
    val style: String? = null,
    val model: String? = null,
    val instrumental: Boolean = false,
    val variant: Int = 1,
    val role: String = "song",
    val seed: Long? = null,
    @SerialName("created_at") val createdAt: String? = null,
)

@Serializable
data class JobResponse(
    val id: String,
    val status: String,
    val progress: Float = 0f,
    val stage: String? = null,
    val clips: List<ClipDto> = emptyList(),
    val error: String? = null,
    @SerialName("queue_position") val queuePosition: Int? = null,
)

@Serializable
data class ModelDto(
    val id: String,
    val name: String,
    val description: String = "",
    @SerialName("max_duration_seconds") val maxDurationSeconds: Int = 240,
    @SerialName("supports_vocals") val supportsVocals: Boolean = true,
    @SerialName("supports_extend") val supportsExtend: Boolean = true,
    @SerialName("supports_stems") val supportsStems: Boolean = false,
    val engine: String = "",
)

@Serializable
data class ModelsResponse(val models: List<ModelDto> = emptyList())

@Serializable
data class HealthResponse(
    val status: String = "unknown",
    val engine: String = "",
    val version: String = "",
    val device: String = "",
    @SerialName("queue_depth") val queueDepth: Int = 0,
)

@Serializable
data class UploadResponse(
    @SerialName("reference_audio_id") val referenceAudioId: String,
    @SerialName("duration_seconds") val durationSeconds: Float = 0f,
)

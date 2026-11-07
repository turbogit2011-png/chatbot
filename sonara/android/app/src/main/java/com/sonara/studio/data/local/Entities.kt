package com.sonara.studio.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.TypeConverter

@Entity(tableName = "songs")
data class SongEntity(
    @PrimaryKey val id: String,
    val jobId: String?,
    val title: String,
    val prompt: String?,
    val lyrics: String?,
    val style: String?,
    val styleTags: List<String> = emptyList(),
    val model: String?,
    val durationSeconds: Float = 0f,
    val instrumental: Boolean = false,
    val variant: Int = 1,
    val role: String = "song",
    val parentId: String? = null,
    val remoteAudioUrl: String? = null,
    val localPath: String? = null,
    val coverUrl: String? = null,
    val localCoverPath: String? = null,
    val seed: Long? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val favorite: Boolean = false,
    val playCount: Int = 0,
    val lastPlayedAt: Long? = null,
) {
    val isDownloaded: Boolean get() = !localPath.isNullOrBlank()
    val playbackUri: String? get() = localPath ?: remoteAudioUrl
    val tagLine: String
        get() = if (styleTags.isNotEmpty()) styleTags.joinToString(" · ") else (style ?: "")
}

@Entity(tableName = "jobs")
data class JobEntity(
    @PrimaryKey val id: String,
    val status: String,
    val progress: Float = 0f,
    val stage: String? = null,
    val title: String? = null,
    val prompt: String? = null,
    val style: String? = null,
    val lyrics: String? = null,
    val instrumental: Boolean = false,
    val model: String? = null,
    val kind: String = "generate",
    val error: String? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
) {
    val isTerminal: Boolean get() = status == "succeeded" || status == "failed" || status == "cancelled"
}

class Converters {
    @TypeConverter
    fun fromList(value: List<String>?): String = value?.joinToString("\u001F") ?: ""

    @TypeConverter
    fun toList(value: String?): List<String> =
        value?.split("\u001F")?.filter { it.isNotBlank() } ?: emptyList()
}

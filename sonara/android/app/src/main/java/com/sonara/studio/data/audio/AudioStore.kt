package com.sonara.studio.data.audio

import android.content.ContentValues
import android.content.Context
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import com.sonara.studio.data.local.SongEntity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File

/** Owns everything on disk: downloaded audio, cover art and exports to the user's Music folder. */
class AudioStore(
    private val context: Context,
    private val client: OkHttpClient,
) {
    private val songsDir: File by lazy { File(context.filesDir, "songs").apply { mkdirs() } }
    private val coversDir: File by lazy { File(context.filesDir, "covers").apply { mkdirs() } }

    fun songFile(id: String): File = File(songsDir, "$id.mp3")
    fun coverFile(id: String): File = File(coversDir, "$id.jpg")

    suspend fun downloadAudio(url: String, id: String): File? = download(url, songFile(id))

    suspend fun downloadCover(url: String, id: String): File? = download(url, coverFile(id))

    private suspend fun download(url: String, target: File): File? = withContext(Dispatchers.IO) {
        if (target.exists() && target.length() > 0) return@withContext target
        val tmp = File(target.parentFile, target.name + ".part")
        runCatching {
            client.newCall(Request.Builder().url(url).build()).execute().use { response ->
                if (!response.isSuccessful) return@withContext null
                val body = response.body ?: return@withContext null
                tmp.outputStream().use { out -> body.byteStream().copyTo(out, DEFAULT_BUFFER_SIZE) }
            }
            if (tmp.length() <= 0L) {
                tmp.delete()
                return@withContext null
            }
            if (target.exists()) target.delete()
            tmp.renameTo(target)
            target
        }.getOrElse {
            tmp.delete()
            null
        }
    }

    fun deleteLocal(song: SongEntity) {
        song.localPath?.let { runCatching { File(it).delete() } }
        song.localCoverPath?.let { runCatching { File(it).delete() } }
    }

    fun cacheBytes(): Long = (songsDir.walkTopDown() + coversDir.walkTopDown())
        .filter { it.isFile }
        .sumOf { it.length() }

    fun clearCache() {
        songsDir.listFiles()?.forEach { it.delete() }
        coversDir.listFiles()?.forEach { it.delete() }
    }

    /** Copies a finished song into shared storage so other music apps can see it. */
    suspend fun exportToMusic(song: SongEntity): Uri? = withContext(Dispatchers.IO) {
        val source = song.localPath?.let(::File)?.takeIf { it.exists() } ?: return@withContext null
        val safeTitle = song.title.replace(Regex("[^\\p{L}\\p{N} _.-]"), "").trim().ifBlank { "Sonara track" }
        val values = ContentValues().apply {
            put(MediaStore.Audio.Media.DISPLAY_NAME, "$safeTitle.mp3")
            put(MediaStore.Audio.Media.MIME_TYPE, "audio/mpeg")
            put(MediaStore.Audio.Media.TITLE, song.title)
            put(MediaStore.Audio.Media.ARTIST, "Sonara Studio")
            put(MediaStore.Audio.Media.ALBUM, "Sonara generations")
            put(MediaStore.Audio.Media.IS_MUSIC, 1)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                put(MediaStore.Audio.Media.RELATIVE_PATH, Environment.DIRECTORY_MUSIC + "/Sonara")
                put(MediaStore.Audio.Media.IS_PENDING, 1)
            }
        }
        val collection = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            MediaStore.Audio.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
        } else {
            MediaStore.Audio.Media.EXTERNAL_CONTENT_URI
        }
        val resolver = context.contentResolver
        val uri = resolver.insert(collection, values) ?: return@withContext null
        runCatching {
            resolver.openOutputStream(uri)?.use { out -> source.inputStream().use { it.copyTo(out) } }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                values.clear()
                values.put(MediaStore.Audio.Media.IS_PENDING, 0)
                resolver.update(uri, values, null, null)
            }
            uri
        }.getOrElse {
            runCatching { resolver.delete(uri, null, null) }
            null
        }
    }
}

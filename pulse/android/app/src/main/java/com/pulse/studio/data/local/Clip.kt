package com.pulse.studio.data.local

import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.Upsert
import android.content.Context
import kotlinx.coroutines.flow.Flow

/**
 * One clip, from the moment it is queued to the moment it is playable.
 *
 * Renders and finished videos share a table on purpose: the library can then show a
 * clip filling up in place, and a render survives the app being killed because its
 * state is already on disk.
 */
@Entity(tableName = "clips")
data class ClipEntity(
    @PrimaryKey val id: String,
    val title: String,
    val artist: String,
    val sourceUri: String,
    val specJson: String,
    val filePath: String? = null,
    val thumbPath: String? = null,
    val coverPath: String? = null,
    val width: Int = 0,
    val height: Int = 0,
    val durationSeconds: Float = 0f,
    val tempo: Float = 0f,
    val beats: Int = 0,
    val sections: Int = 0,
    val status: String = STATUS_QUEUED,
    val stage: String = "queued",
    val progress: Float = 0f,
    val error: String? = null,
    val favorite: Boolean = false,
    val createdAt: Long = System.currentTimeMillis(),
) {
    val isReady: Boolean get() = status == STATUS_READY && !filePath.isNullOrBlank()
    val isWorking: Boolean get() = status == STATUS_QUEUED || status == STATUS_RENDERING

    companion object {
        const val STATUS_QUEUED = "queued"
        const val STATUS_RENDERING = "rendering"
        const val STATUS_READY = "ready"
        const val STATUS_FAILED = "failed"
    }
}

@Dao
interface ClipDao {
    @Upsert
    suspend fun upsert(clip: ClipEntity)

    @Query("SELECT * FROM clips ORDER BY createdAt DESC")
    fun observeAll(): Flow<List<ClipEntity>>

    @Query("SELECT * FROM clips WHERE favorite = 1 ORDER BY createdAt DESC")
    fun observeFavorites(): Flow<List<ClipEntity>>

    @Query("SELECT * FROM clips WHERE status != 'ready' ORDER BY createdAt DESC")
    fun observeWorking(): Flow<List<ClipEntity>>

    @Query("SELECT * FROM clips WHERE id = :id")
    fun observeById(id: String): Flow<ClipEntity?>

    @Query("SELECT * FROM clips WHERE id = :id")
    suspend fun byId(id: String): ClipEntity?

    @Query("SELECT * FROM clips")
    suspend fun all(): List<ClipEntity>

    @Query("UPDATE clips SET status = :status, stage = :stage, progress = :progress, error = :error WHERE id = :id")
    suspend fun updateProgress(id: String, status: String, stage: String, progress: Float, error: String?)

    @Query("UPDATE clips SET favorite = :favorite WHERE id = :id")
    suspend fun setFavorite(id: String, favorite: Boolean)

    @Query("UPDATE clips SET title = :title WHERE id = :id")
    suspend fun rename(id: String, title: String)

    @Query("DELETE FROM clips WHERE id = :id")
    suspend fun delete(id: String)

    @Query("SELECT COUNT(*) FROM clips WHERE status = 'ready'")
    fun readyCount(): Flow<Int>
}

@Database(entities = [ClipEntity::class], version = 1, exportSchema = true)
abstract class PulseDatabase : RoomDatabase() {
    abstract fun clipDao(): ClipDao

    companion object {
        fun build(context: Context): PulseDatabase =
            Room.databaseBuilder(context, PulseDatabase::class.java, "pulse.db")
                .fallbackToDestructiveMigration()
                .build()
    }
}

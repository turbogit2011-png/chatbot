package com.sonara.studio.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

@Dao
interface SongDao {
    @Upsert
    suspend fun upsert(songs: List<SongEntity>)

    @Upsert
    suspend fun upsert(song: SongEntity)

    @Query("SELECT * FROM songs WHERE role = 'song' OR role = 'extension' ORDER BY createdAt DESC")
    fun observeAll(): Flow<List<SongEntity>>

    @Query("SELECT * FROM songs WHERE favorite = 1 ORDER BY createdAt DESC")
    fun observeFavorites(): Flow<List<SongEntity>>

    @Query("SELECT * FROM songs WHERE localPath IS NOT NULL ORDER BY createdAt DESC")
    fun observeDownloaded(): Flow<List<SongEntity>>

    @Query(
        "SELECT * FROM songs WHERE title LIKE '%' || :q || '%' OR style LIKE '%' || :q || '%' " +
            "OR styleTags LIKE '%' || :q || '%' OR lyrics LIKE '%' || :q || '%' ORDER BY createdAt DESC"
    )
    fun search(q: String): Flow<List<SongEntity>>

    @Query("SELECT * FROM songs WHERE id = :id")
    fun observeById(id: String): Flow<SongEntity?>

    @Query("SELECT * FROM songs WHERE id = :id")
    suspend fun byId(id: String): SongEntity?

    @Query("SELECT * FROM songs")
    suspend fun all(): List<SongEntity>

    @Query("SELECT * FROM songs WHERE jobId = :jobId ORDER BY variant ASC")
    fun observeByJob(jobId: String): Flow<List<SongEntity>>

    @Query("SELECT * FROM songs WHERE parentId = :parentId ORDER BY createdAt ASC")
    fun observeStems(parentId: String): Flow<List<SongEntity>>

    @Query("UPDATE songs SET favorite = :favorite WHERE id = :id")
    suspend fun setFavorite(id: String, favorite: Boolean)

    @Query("UPDATE songs SET title = :title WHERE id = :id")
    suspend fun rename(id: String, title: String)

    @Query("UPDATE songs SET localPath = :path WHERE id = :id")
    suspend fun setLocalPath(id: String, path: String?)

    @Query("UPDATE songs SET localCoverPath = :path WHERE id = :id")
    suspend fun setLocalCover(id: String, path: String?)

    @Query("UPDATE songs SET playCount = playCount + 1, lastPlayedAt = :now WHERE id = :id")
    suspend fun markPlayed(id: String, now: Long = System.currentTimeMillis())

    @Query("UPDATE songs SET specJson = :spec WHERE id = :id")
    suspend fun setSpec(id: String, spec: String?)

    @Query("DELETE FROM songs WHERE id = :id")
    suspend fun delete(id: String)

    @Query("SELECT COUNT(*) FROM songs WHERE role = 'song' OR role = 'extension'")
    fun count(): Flow<Int>
}

@Dao
interface JobDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(job: JobEntity)

    @Upsert
    suspend fun upsert(job: JobEntity)

    @Query("SELECT * FROM jobs ORDER BY createdAt DESC LIMIT 50")
    fun observeRecent(): Flow<List<JobEntity>>

    @Query("SELECT * FROM jobs WHERE status NOT IN ('succeeded','failed','cancelled') ORDER BY createdAt DESC")
    fun observeActive(): Flow<List<JobEntity>>

    @Query("SELECT * FROM jobs WHERE status NOT IN ('succeeded','failed','cancelled')")
    suspend fun activeNow(): List<JobEntity>

    @Query("SELECT * FROM jobs WHERE id = :id")
    suspend fun byId(id: String): JobEntity?

    @Query("UPDATE jobs SET status = :status, progress = :progress, stage = :stage, error = :error, updatedAt = :now WHERE id = :id")
    suspend fun updateProgress(
        id: String,
        status: String,
        progress: Float,
        stage: String?,
        error: String?,
        now: Long = System.currentTimeMillis(),
    )

    @Query("DELETE FROM jobs WHERE id = :id")
    suspend fun delete(id: String)

    @Query("DELETE FROM jobs WHERE status IN ('succeeded','failed','cancelled') AND updatedAt < :before")
    suspend fun pruneOlderThan(before: Long)
}

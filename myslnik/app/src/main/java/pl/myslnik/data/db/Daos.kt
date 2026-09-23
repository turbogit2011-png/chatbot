package pl.myslnik.data.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

@Dao
interface EntryDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(entry: EntryEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(entries: List<EntryEntity>)

    @Update
    suspend fun update(entry: EntryEntity)

    @Query("SELECT * FROM entries WHERE id = :id")
    suspend fun byId(id: String): EntryEntity?

    @Query("SELECT * FROM entries WHERE id = :id")
    fun byIdFlow(id: String): Flow<EntryEntity?>

    @Query("SELECT * FROM entries WHERE status = 'INBOX' ORDER BY createdAt DESC")
    fun inbox(): Flow<List<EntryEntity>>

    @Query("SELECT COUNT(*) FROM entries WHERE status = 'INBOX'")
    fun inboxCount(): Flow<Int>

    @Query("""SELECT * FROM entries WHERE status = 'ACTIVE' AND dueAt IS NOT NULL AND dueAt < :endOfDay
              ORDER BY dueAt ASC""")
    fun today(endOfDay: Long): Flow<List<EntryEntity>>

    @Query("""SELECT * FROM entries WHERE status = 'ACTIVE' AND dueAt IS NOT NULL AND dueAt < :endOfDay
              ORDER BY dueAt ASC""")
    suspend fun todayOnce(endOfDay: Long): List<EntryEntity>

    @Query("""SELECT * FROM entries WHERE status = 'ACTIVE' AND dueAt IS NOT NULL
              ORDER BY dueAt ASC""")
    fun planned(): Flow<List<EntryEntity>>

    @Query("""SELECT * FROM entries WHERE type = 'THOUGHT' AND status IN ('INBOX','ACTIVE')
              ORDER BY createdAt DESC""")
    fun thoughts(): Flow<List<EntryEntity>>

    @Query("SELECT * FROM entries WHERE status = 'DONE' ORDER BY doneAt DESC LIMIT 200")
    fun done(): Flow<List<EntryEntity>>

    @Query("SELECT * FROM entries WHERE status = 'ARCHIVED' ORDER BY updatedAt DESC LIMIT 200")
    fun archived(): Flow<List<EntryEntity>>

    @Query("SELECT * FROM entries WHERE status = 'TRASH' ORDER BY deletedAt DESC")
    fun trash(): Flow<List<EntryEntity>>

    @Query("""SELECT * FROM entries WHERE status != 'TRASH' AND (content LIKE '%' || :q || '%'
              OR note LIKE '%' || :q || '%') ORDER BY updatedAt DESC LIMIT 100""")
    fun search(q: String): Flow<List<EntryEntity>>

    @Query("""SELECT * FROM entries WHERE status = 'ACTIVE' AND nextFireAt IS NOT NULL
              AND nextFireAt <= :now""")
    suspend fun firedEntries(now: Long): List<EntryEntity>

    @Query("""SELECT MIN(nextFireAt) FROM entries WHERE status = 'ACTIVE' AND nextFireAt IS NOT NULL""")
    suspend fun nextFireTime(): Long?

    @Query("""SELECT * FROM entries WHERE type = 'THOUGHT' AND status IN ('INBOX','ACTIVE')
              AND thoughtReturnAt IS NOT NULL AND thoughtReturnAt <= :now""")
    suspend fun returningThoughts(now: Long): List<EntryEntity>

    @Query("""SELECT * FROM entries WHERE status = 'ACTIVE' AND dueAt IS NOT NULL AND dueAt < :now
              ORDER BY dueAt ASC""")
    suspend fun overdue(now: Long): List<EntryEntity>

    @Query("SELECT * FROM entries WHERE status = 'INBOX' ORDER BY createdAt ASC")
    suspend fun inboxOnce(): List<EntryEntity>

    @Query("DELETE FROM entries WHERE status = 'TRASH' AND deletedAt < :threshold")
    suspend fun purgeTrash(threshold: Long)

    @Query("DELETE FROM entries WHERE id = :id")
    suspend fun deleteForever(id: String)

    @Query("SELECT * FROM entries")
    suspend fun all(): List<EntryEntity>
}

@Dao
interface CategoryDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(category: CategoryEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(categories: List<CategoryEntity>)

    @Query("SELECT * FROM categories ORDER BY sortOrder ASC")
    fun all(): Flow<List<CategoryEntity>>

    @Query("SELECT * FROM categories ORDER BY sortOrder ASC")
    suspend fun allOnce(): List<CategoryEntity>

    @Query("DELETE FROM categories WHERE id = :id")
    suspend fun delete(id: String)

    @Query("SELECT COUNT(*) FROM categories")
    suspend fun count(): Int
}

package pl.myslnik.data.db

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "entries",
    indices = [Index("status"), Index("nextFireAt"), Index("dueAt")]
)
data class EntryEntity(
    @PrimaryKey val id: String,                 // UUID
    val type: String,                           // TASK | THOUGHT
    val status: String,                         // INBOX | ACTIVE | DONE | ARCHIVED | TRASH
    val content: String,
    val note: String = "",
    val categoryId: String? = null,
    val priority: Int = 0,                      // 0 normalny, 1 ważny, 2 PILNY
    val dueAt: Long? = null,                    // termin (epoch millis)
    val nextFireAt: Long? = null,               // następne odpalenie powiadomienia
    val repeatRule: String? = null,             // patrz RepeatRule
    val persistent: Boolean = false,            // uparte przypomnienie
    val userSetNight: Boolean = false,          // termin świadomie ustawiony na noc (🌙)
    val thoughtReturnAt: Long? = null,          // kiedy myśl wraca w porannym przeglądzie
    val createdAt: Long,
    val updatedAt: Long,
    val doneAt: Long? = null,
    val deletedAt: Long? = null,
)

@Entity(tableName = "categories")
data class CategoryEntity(
    @PrimaryKey val id: String,
    val name: String,
    val color: Long,                            // ARGB
    val sortOrder: Int = 0,
)

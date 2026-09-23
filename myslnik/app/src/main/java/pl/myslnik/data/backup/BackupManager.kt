package pl.myslnik.data.backup

import android.content.Context
import android.net.Uri
import android.provider.DocumentsContract
import org.json.JSONArray
import org.json.JSONObject
import pl.myslnik.data.db.CategoryDao
import pl.myslnik.data.db.CategoryEntity
import pl.myslnik.data.db.EntryDao
import pl.myslnik.data.db.EntryEntity
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

/**
 * Eksport/import JSON + automatyczna kopia dzienna do folderu SAF.
 * Import scala wpisy po UUID — wygrywa nowszy updatedAt, nic nie ginie.
 */
class BackupManager(
    private val context: Context,
    private val entryDao: EntryDao,
    private val categoryDao: CategoryDao,
) {

    suspend fun exportJson(): String {
        val entries = JSONArray()
        entryDao.all().forEach { entries.put(entryToJson(it)) }
        val categories = JSONArray()
        categoryDao.allOnce().forEach { c ->
            categories.put(JSONObject().apply {
                put("id", c.id); put("name", c.name); put("color", c.color); put("sortOrder", c.sortOrder)
            })
        }
        return JSONObject().apply {
            put("app", "Myslnik")
            put("version", 1)
            put("exportedAt", System.currentTimeMillis())
            put("categories", categories)
            put("entries", entries)
        }.toString(2)
    }

    /** Zwraca liczbę wpisów: dodanych + zaktualizowanych. */
    suspend fun importJson(json: String): Pair<Int, Int> {
        val root = JSONObject(json)
        var added = 0
        var updated = 0

        val cats = root.optJSONArray("categories") ?: JSONArray()
        val catList = mutableListOf<CategoryEntity>()
        for (i in 0 until cats.length()) {
            val c = cats.getJSONObject(i)
            catList += CategoryEntity(
                id = c.getString("id"), name = c.getString("name"),
                color = c.getLong("color"), sortOrder = c.optInt("sortOrder")
            )
        }
        if (catList.isNotEmpty()) categoryDao.upsertAll(catList)

        val entries = root.optJSONArray("entries") ?: JSONArray()
        for (i in 0 until entries.length()) {
            val e = jsonToEntry(entries.getJSONObject(i))
            val existing = entryDao.byId(e.id)
            when {
                existing == null -> { entryDao.upsert(e); added++ }
                e.updatedAt > existing.updatedAt -> { entryDao.upsert(e); updated++ }
            }
        }
        return added to updated
    }

    suspend fun writeExportTo(uri: Uri) {
        val json = exportJson()
        context.contentResolver.openOutputStream(uri, "wt")?.use { out ->
            out.write(json.toByteArray(Charsets.UTF_8))
        } ?: error("Nie można otworzyć pliku do zapisu")
    }

    suspend fun importFrom(uri: Uri): Pair<Int, Int> {
        val json = context.contentResolver.openInputStream(uri)?.use { it.readBytes().toString(Charsets.UTF_8) }
            ?: error("Nie można odczytać pliku")
        return importJson(json)
    }

    /**
     * Kopia automatyczna do folderu z trwałym uprawnieniem SAF.
     * Trzyma ostatnie 7 plików myslnik-backup-*.json.
     */
    suspend fun autoBackup(treeUriString: String) {
        if (treeUriString.isBlank()) return
        val treeUri = Uri.parse(treeUriString)
        val resolver = context.contentResolver

        val treeDocId = DocumentsContract.getTreeDocumentId(treeUri)
        val parentUri = DocumentsContract.buildDocumentUriUsingTree(treeUri, treeDocId)
        val stamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd-HHmm"))
        val name = "myslnik-backup-$stamp.json"

        val fileUri = DocumentsContract.createDocument(resolver, parentUri, "application/json", name)
            ?: error("Nie można utworzyć pliku kopii")
        resolver.openOutputStream(fileUri, "wt")?.use { it.write(exportJson().toByteArray(Charsets.UTF_8)) }

        // Usuń najstarsze, zostaw 7.
        val childrenUri = DocumentsContract.buildChildDocumentsUriUsingTree(treeUri, treeDocId)
        data class Doc(val uri: Uri, val name: String)
        val backups = mutableListOf<Doc>()
        resolver.query(
            childrenUri,
            arrayOf(DocumentsContract.Document.COLUMN_DOCUMENT_ID, DocumentsContract.Document.COLUMN_DISPLAY_NAME),
            null, null, null
        )?.use { cursor ->
            while (cursor.moveToNext()) {
                val docId = cursor.getString(0)
                val display = cursor.getString(1) ?: continue
                if (display.startsWith("myslnik-backup-") && display.endsWith(".json")) {
                    backups += Doc(DocumentsContract.buildDocumentUriUsingTree(treeUri, docId), display)
                }
            }
        }
        backups.sortedByDescending { it.name }.drop(7).forEach { doc ->
            try { DocumentsContract.deleteDocument(resolver, doc.uri) } catch (_: Exception) { }
        }
    }

    private fun entryToJson(e: EntryEntity) = JSONObject().apply {
        put("id", e.id); put("type", e.type); put("status", e.status)
        put("content", e.content); put("note", e.note)
        put("categoryId", e.categoryId ?: JSONObject.NULL)
        put("priority", e.priority)
        put("dueAt", e.dueAt ?: JSONObject.NULL)
        put("nextFireAt", e.nextFireAt ?: JSONObject.NULL)
        put("repeatRule", e.repeatRule ?: JSONObject.NULL)
        put("persistent", e.persistent)
        put("userSetNight", e.userSetNight)
        put("thoughtReturnAt", e.thoughtReturnAt ?: JSONObject.NULL)
        put("createdAt", e.createdAt); put("updatedAt", e.updatedAt)
        put("doneAt", e.doneAt ?: JSONObject.NULL)
        put("deletedAt", e.deletedAt ?: JSONObject.NULL)
    }

    private fun jsonToEntry(o: JSONObject) = EntryEntity(
        id = o.getString("id"),
        type = o.getString("type"),
        status = o.getString("status"),
        content = o.getString("content"),
        note = o.optString("note"),
        categoryId = if (o.isNull("categoryId")) null else o.getString("categoryId"),
        priority = o.optInt("priority"),
        dueAt = if (o.isNull("dueAt")) null else o.getLong("dueAt"),
        nextFireAt = if (o.isNull("nextFireAt")) null else o.getLong("nextFireAt"),
        repeatRule = if (o.isNull("repeatRule")) null else o.getString("repeatRule"),
        persistent = o.optBoolean("persistent"),
        userSetNight = o.optBoolean("userSetNight"),
        thoughtReturnAt = if (o.isNull("thoughtReturnAt")) null else o.getLong("thoughtReturnAt"),
        createdAt = o.getLong("createdAt"),
        updatedAt = o.getLong("updatedAt"),
        doneAt = if (o.isNull("doneAt")) null else o.getLong("doneAt"),
        deletedAt = if (o.isNull("deletedAt")) null else o.getLong("deletedAt"),
    )
}

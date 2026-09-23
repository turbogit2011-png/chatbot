package pl.myslnik.data.repo

import pl.myslnik.data.db.CategoryDao
import pl.myslnik.data.db.CategoryEntity
import pl.myslnik.data.db.EntryDao
import pl.myslnik.data.db.EntryEntity
import pl.myslnik.data.settings.SettingsRepository
import pl.myslnik.domain.EntryStatus
import pl.myslnik.domain.EntryType
import pl.myslnik.domain.NightWindow
import pl.myslnik.domain.RepeatCalculator
import java.time.ZoneId
import java.util.UUID
import java.util.concurrent.TimeUnit

/**
 * Jedyna droga zapisu do bazy. Po każdej mutacji woła [onDataChanged],
 * które przelicza łańcuch alarmów i odświeża widżety.
 */
class EntryRepository(
    val entryDao: EntryDao,
    val categoryDao: CategoryDao,
    private val settingsRepo: SettingsRepository,
) {
    /** Ustawiane przez AppContainer: przelicz alarmy + odśwież widżety. */
    var onDataChanged: suspend () -> Unit = {}

    private fun zone(): ZoneId = ZoneId.systemDefault()

    suspend fun ensureDefaultCategories() {
        if (categoryDao.count() == 0) {
            categoryDao.upsertAll(
                listOf(
                    CategoryEntity(UUID.randomUUID().toString(), "Firma", 0xFF4FC3F7, 0),
                    CategoryEntity(UUID.randomUUID().toString(), "Dom", 0xFF81C784, 1),
                    CategoryEntity(UUID.randomUUID().toString(), "Pomysły", 0xFFFFD54F, 2),
                    CategoryEntity(UUID.randomUUID().toString(), "Zakupy", 0xFFBA68C8, 3),
                )
            )
        }
    }

    /**
     * Dodaje wpis. Zwraca zapisany rekord.
     * Wpis z terminem → ACTIVE, bez terminu → INBOX (Skrzynka).
     */
    suspend fun add(
        content: String,
        type: EntryType,
        dueAt: Long? = null,
        note: String = "",
        categoryId: String? = null,
        priority: Int = 0,
    ): EntryEntity {
        val now = System.currentTimeMillis()
        val s = settingsRepo.current()
        val effType = if (dueAt != null) EntryType.TASK else type
        val status = if (dueAt != null) EntryStatus.ACTIVE else EntryStatus.INBOX
        val userSetNight = dueAt != null && NightWindow.isNight(dueAt, s.nightStart, s.nightEnd, zone())
        val entry = EntryEntity(
            id = UUID.randomUUID().toString(),
            type = effType.name,
            status = status.name,
            content = content.trim(),
            note = note,
            categoryId = categoryId,
            priority = priority,
            dueAt = dueAt,
            nextFireAt = dueAt,
            persistent = priority >= 2, // uparte domyślnie WŁ. dla PILNYCH
            userSetNight = userSetNight,
            thoughtReturnAt = if (effType == EntryType.THOUGHT)
                now + TimeUnit.DAYS.toMillis(s.thoughtReturnDays.toLong()) else null,
            createdAt = now,
            updatedAt = now,
        )
        entryDao.upsert(entry)
        onDataChanged()
        return entry
    }

    suspend fun save(entry: EntryEntity) {
        entryDao.upsert(entry.copy(updatedAt = System.currentTimeMillis()))
        onDataChanged()
    }

    /** Surowy zapis (do „Cofnij") — przywraca dokładnie poprzedni stan rekordu. */
    suspend fun restoreExact(entry: EntryEntity) {
        entryDao.upsert(entry)
        onDataChanged()
    }

    suspend fun markDone(id: String) {
        val e = entryDao.byId(id) ?: return
        val now = System.currentTimeMillis()
        if (!e.repeatRule.isNullOrBlank() && e.dueAt != null) {
            val next = RepeatCalculator.nextOccurrence(e.repeatRule, e.dueAt, now, zone())
            if (next != null) {
                entryDao.upsert(e.copy(dueAt = next, nextFireAt = next, updatedAt = now))
                onDataChanged(); return
            }
        }
        entryDao.upsert(
            e.copy(status = EntryStatus.DONE.name, doneAt = now, nextFireAt = null, updatedAt = now)
        )
        onDataChanged()
    }

    suspend fun snooze(id: String, until: Long) {
        val e = entryDao.byId(id) ?: return
        val s = settingsRepo.current()
        val userSetNight = NightWindow.isNight(until, s.nightStart, s.nightEnd, zone())
        entryDao.upsert(
            e.copy(
                status = EntryStatus.ACTIVE.name,
                dueAt = until, nextFireAt = until,
                userSetNight = userSetNight,
                updatedAt = System.currentTimeMillis()
            )
        )
        onDataChanged()
    }

    suspend fun toThought(id: String) {
        val e = entryDao.byId(id) ?: return
        val s = settingsRepo.current()
        val now = System.currentTimeMillis()
        entryDao.upsert(
            e.copy(
                type = EntryType.THOUGHT.name, status = EntryStatus.INBOX.name,
                dueAt = null, nextFireAt = null, repeatRule = null,
                thoughtReturnAt = now + TimeUnit.DAYS.toMillis(s.thoughtReturnDays.toLong()),
                updatedAt = now
            )
        )
        onDataChanged()
    }

    /** Przegląd: „to myśl" — zostaje myślą, ale wychodzi ze Skrzynki. */
    suspend fun keepAsThought(id: String) {
        val e = entryDao.byId(id) ?: return
        val s = settingsRepo.current()
        val now = System.currentTimeMillis()
        entryDao.upsert(
            e.copy(
                type = EntryType.THOUGHT.name, status = EntryStatus.ACTIVE.name,
                dueAt = null, nextFireAt = null, repeatRule = null,
                thoughtReturnAt = now + TimeUnit.DAYS.toMillis(s.thoughtReturnDays.toLong()),
                updatedAt = now
            )
        )
        onDataChanged()
    }

    suspend fun activate(id: String) {
        val e = entryDao.byId(id) ?: return
        entryDao.upsert(e.copy(status = EntryStatus.ACTIVE.name, updatedAt = System.currentTimeMillis()))
        onDataChanged()
    }

    suspend fun archive(id: String) {
        val e = entryDao.byId(id) ?: return
        entryDao.upsert(
            e.copy(status = EntryStatus.ARCHIVED.name, nextFireAt = null, updatedAt = System.currentTimeMillis())
        )
        onDataChanged()
    }

    suspend fun trash(id: String) {
        val e = entryDao.byId(id) ?: return
        val now = System.currentTimeMillis()
        entryDao.upsert(
            e.copy(status = EntryStatus.TRASH.name, nextFireAt = null, deletedAt = now, updatedAt = now)
        )
        onDataChanged()
    }

    suspend fun restoreFromTrash(id: String) {
        val e = entryDao.byId(id) ?: return
        val status = if (e.dueAt != null) EntryStatus.ACTIVE else EntryStatus.INBOX
        entryDao.upsert(
            e.copy(
                status = status.name, deletedAt = null,
                nextFireAt = e.dueAt?.takeIf { it > System.currentTimeMillis() },
                updatedAt = System.currentTimeMillis()
            )
        )
        onDataChanged()
    }

    /** Kosz: wpisy starsze niż 30 dni znikają na zawsze. */
    suspend fun purgeOldTrash() {
        entryDao.purgeTrash(System.currentTimeMillis() - TimeUnit.DAYS.toMillis(30))
    }

    /** Wieczorne podsumowanie: przenieś wszystkie niezrobione z dziś na jutro (domyślna godzina). */
    suspend fun moveTodayToTomorrow() {
        val s = settingsRepo.current()
        val z = zone()
        val now = System.currentTimeMillis()
        val endOfDay = java.time.ZonedDateTime.now(z).toLocalDate().plusDays(1)
            .atStartOfDay(z).toInstant().toEpochMilli()
        val tomorrow = java.time.ZonedDateTime.now(z).toLocalDate().plusDays(1)
            .atTime(s.defaultTime / 60, s.defaultTime % 60).atZone(z).toInstant().toEpochMilli()
        for (e in entryDao.todayOnce(endOfDay)) {
            entryDao.upsert(e.copy(dueAt = tomorrow, nextFireAt = tomorrow, userSetNight = false, updatedAt = now))
        }
        onDataChanged()
    }
}

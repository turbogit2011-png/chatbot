package pl.myslnik.alarms

import android.content.Context
import pl.myslnik.AppContainer
import pl.myslnik.domain.NightWindow
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.concurrent.TimeUnit

/**
 * Wspólna logika odpalania zaległych zdarzeń — używana przez AlarmReceiver
 * i przez siatkę bezpieczeństwa WorkManagera.
 */
object AlarmEngine {

    suspend fun processDue(context: Context, container: AppContainer) {
        val now = System.currentTimeMillis()
        val s = container.settingsRepo.current()
        val zone = ZoneId.systemDefault()
        val dao = container.database.entryDao()
        val scheduler = container.scheduler

        // --- 1. Przypomnienia wpisów ---
        val fired = dao.firedEntries(now)
        val toNotify = mutableListOf<pl.myslnik.data.db.EntryEntity>()
        val morningAt = NightWindow.nextNightEnd(now, s.nightEnd, zone)

        for (e in fired) {
            val firstFire = e.nextFireAt != null && e.nextFireAt == e.dueAt
            val night = NightWindow.isNight(now, s.nightStart, s.nightEnd, zone)
            val urgentPersistent = e.persistent && e.priority >= 2

            if (!firstFire && night && !urgentPersistent) {
                // Automatyczne ponowienie w nocy → przechodzi do porannego przeglądu.
                dao.upsert(e.copy(nextFireAt = morningAt))
                continue
            }
            toNotify += e
            val next: Long? = if (e.persistent) {
                var candidate = now + TimeUnit.MINUTES.toMillis(s.nagIntervalMin.toLong())
                if (!urgentPersistent && NightWindow.isNight(candidate, s.nightStart, s.nightEnd, zone)) {
                    candidate = morningAt
                }
                candidate
            } else null
            dao.upsert(e.copy(nextFireAt = next))
        }

        if (toNotify.size >= 2) {
            toNotify.forEach { Notifier.showReminder(context, it) }
            Notifier.showGroupSummary(context, toNotify.size)
        } else {
            toNotify.forEach { Notifier.showReminder(context, it) }
        }

        // --- 2. Poranny przegląd (koniec NOCY) ---
        val nextMorning = scheduler.nextMorningAt()
        if (nextMorning in 1..now) {
            runMorningReview(context, container, now)
            scheduler.setNextMorningAt(NightWindow.nextNightEnd(now, s.nightEnd, zone))
        }

        // --- 3. Wieczorne podsumowanie ---
        val nextEvening = scheduler.nextEveningAt()
        if (s.eveningEnabled && nextEvening in 1..now) {
            runEveningSummary(context, container)
            scheduler.setNextEveningAt(NightWindow.nextTimeOfDay(now, s.eveningTime, zone))
        }

        // --- 4. Następne ogniwo łańcucha ---
        scheduler.reschedule()
        pl.myslnik.widget.WidgetUpdater.refreshAll(context)
    }

    private suspend fun runMorningReview(context: Context, container: AppContainer, now: Long) {
        val dao = container.database.entryDao()
        val s = container.settingsRepo.current()
        val zone = ZoneId.systemDefault()
        val fmt = DateTimeFormatter.ofPattern("HH:mm")

        val endOfDay = java.time.ZonedDateTime.now(zone).toLocalDate().plusDays(1)
            .atStartOfDay(zone).toInstant().toEpochMilli()
        val today = dao.todayOnce(endOfDay)
        val overdue = today.count { (it.dueAt ?: 0) < now }
        val inboxCount = dao.inboxOnce().size

        // Powracające myśli: pokaż w przeglądzie i przesuń następny powrót.
        val thoughts = dao.returningThoughts(now)
        for (t in thoughts) {
            dao.upsert(t.copy(thoughtReturnAt = now + TimeUnit.DAYS.toMillis(s.thoughtReturnDays.toLong())))
        }

        val todayLines = today.map { e ->
            val time = e.dueAt?.let { fmt.format(Instant.ofEpochMilli(it).atZone(zone)) } ?: ""
            "$time ${e.content}".trim()
        }
        Notifier.showMorningReview(context, inboxCount, todayLines, overdue, thoughts.map { it.content })
    }

    private suspend fun runEveningSummary(context: Context, container: AppContainer) {
        val dao = container.database.entryDao()
        val zone = ZoneId.systemDefault()
        val endOfDay = java.time.ZonedDateTime.now(zone).toLocalDate().plusDays(1)
            .atStartOfDay(zone).toInstant().toEpochMilli()
        val undone = dao.todayOnce(endOfDay)
        Notifier.showEveningSummary(context, undone.map { it.content })
    }
}

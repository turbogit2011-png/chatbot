package pl.myslnik.alarms

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import pl.myslnik.data.db.EntryDao
import pl.myslnik.data.settings.SettingsRepository
import pl.myslnik.domain.NightWindow
import java.time.ZoneId

/**
 * ŁAŃCUCH ALARMÓW: w systemie jest zawsze JEDEN alarm — na najbliższe zdarzenie
 * (przypomnienie wpisu, poranny przegląd albo wieczorne podsumowanie).
 * Receiver wysyła wszystko, co zaległe, i ustawia następny alarm.
 * Stan przeglądów (następny poranek/wieczór) trzymamy w SharedPreferences,
 * żeby przetrwał restart procesu.
 */
class AlarmScheduler(
    private val context: Context,
    private val entryDao: EntryDao,
    private val settingsRepo: SettingsRepository,
) {
    private val prefs get() = context.getSharedPreferences("alarm_state", Context.MODE_PRIVATE)

    companion object {
        const val REQUEST_CODE = 20001
        private const val KEY_NEXT_MORNING = "next_morning"
        private const val KEY_NEXT_EVENING = "next_evening"
    }

    fun nextMorningAt(): Long = prefs.getLong(KEY_NEXT_MORNING, 0L)
    fun nextEveningAt(): Long = prefs.getLong(KEY_NEXT_EVENING, 0L)
    fun setNextMorningAt(v: Long) = prefs.edit().putLong(KEY_NEXT_MORNING, v).apply()
    fun setNextEveningAt(v: Long) = prefs.edit().putLong(KEY_NEXT_EVENING, v).apply()

    fun canScheduleExact(): Boolean {
        val am = context.getSystemService(AlarmManager::class.java)
        return am.canScheduleExactAlarms()
    }

    /** Przelicza i ustawia jeden alarm systemowy na najbliższe zdarzenie. */
    suspend fun reschedule() {
        val now = System.currentTimeMillis()
        val s = settingsRepo.current()
        val zone = ZoneId.systemDefault()

        // Zainicjuj/naprostuj czasy przeglądów.
        var morning = nextMorningAt()
        if (morning <= now) {
            morning = NightWindow.nextNightEnd(now, s.nightEnd, zone)
            setNextMorningAt(morning)
        }
        var evening = nextEveningAt()
        if (evening <= now) {
            evening = NightWindow.nextTimeOfDay(now, s.eveningTime, zone)
            setNextEveningAt(evening)
        }

        val candidates = buildList {
            entryDao.nextFireTime()?.let { add(it) }
            add(morning)
            if (s.eveningEnabled) add(evening)
        }
        val nextAt = candidates.min().coerceAtLeast(now + 1000)

        val am = context.getSystemService(AlarmManager::class.java)
        val pi = alarmPendingIntent()
        am.cancel(pi)
        if (am.canScheduleExactAlarms()) {
            // setAlarmClock — najsilniejsza gwarancja na Xiaomi: budzi z Doze jak budzik.
            val showIntent = PendingIntent.getActivity(
                context, REQUEST_CODE + 1,
                Intent(context, pl.myslnik.ui.MainActivity::class.java),
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            am.setAlarmClock(AlarmManager.AlarmClockInfo(nextAt, showIntent), pi)
        } else {
            // Awaryjnie: przybliżony alarm (ekran NIEZAWODNOŚĆ pokaże czerwony status).
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, nextAt, pi)
        }
    }

    private fun alarmPendingIntent(): PendingIntent =
        PendingIntent.getBroadcast(
            context, REQUEST_CODE,
            Intent(context, AlarmReceiver::class.java).setAction("pl.myslnik.ALARM_CHAIN"),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
}

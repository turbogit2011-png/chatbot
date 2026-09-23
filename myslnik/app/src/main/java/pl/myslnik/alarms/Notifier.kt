package pl.myslnik.alarms

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.provider.Settings
import androidx.core.app.NotificationCompat
import androidx.core.app.RemoteInput
import pl.myslnik.R
import pl.myslnik.data.db.EntryEntity
import pl.myslnik.ui.MainActivity
import pl.myslnik.ui.QuickAddActivity
import pl.myslnik.ui.UrgentAlarmActivity
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

object Notifier {

    const val CH_REMINDERS = "reminders"
    const val CH_URGENT = "urgent"
    const val CH_REVIEWS = "reviews"
    const val CH_QUICK = "quick_add"

    const val GROUP_REMINDERS = "pl.myslnik.REMINDERS"
    const val ID_SUMMARY = 1000001
    const val ID_MORNING = 1000002
    const val ID_EVENING = 1000003
    const val ID_ONGOING = 1000004

    const val KEY_REMOTE_TEXT = "remote_text"

    fun createChannels(context: Context) {
        val nm = context.getSystemService(NotificationManager::class.java)

        nm.createNotificationChannel(
            NotificationChannel(CH_REMINDERS, "Przypomnienia", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "Przypomnienia o zadaniach"
                enableVibration(true)
            }
        )
        nm.createNotificationChannel(
            NotificationChannel(CH_URGENT, "Pilne", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "Pilne przypomnienia — dźwięk alarmu, przebija Nie przeszkadzać (gdy DND dopuszcza alarmy)"
                enableVibration(true)
                setBypassDnd(true)
                setSound(
                    Settings.System.DEFAULT_ALARM_ALERT_URI,
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
            }
        )
        nm.createNotificationChannel(
            NotificationChannel(CH_REVIEWS, "Przeglądy", NotificationManager.IMPORTANCE_DEFAULT).apply {
                description = "Poranny przegląd i wieczorne podsumowanie"
            }
        )
        nm.createNotificationChannel(
            NotificationChannel(CH_QUICK, "Szybkie dodawanie", NotificationManager.IMPORTANCE_LOW).apply {
                description = "Stałe powiadomienie do szybkiego dodawania"
                setShowBadge(false)
            }
        )
    }

    fun notifId(entryId: String): Int = 1 + (entryId.hashCode() and 0x0FFFFFFF) % 900000

    private fun immutable(context: Context, requestCode: Int, intent: Intent): PendingIntent =
        PendingIntent.getBroadcast(
            context, requestCode, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

    private fun openDetail(context: Context, entryId: String): PendingIntent {
        val intent = Intent(context, MainActivity::class.java).apply {
            action = "pl.myslnik.OPEN_DETAIL"
            putExtra("entryId", entryId)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        return PendingIntent.getActivity(
            context, notifId(entryId) + 1, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    private fun formatTime(millis: Long): String =
        DateTimeFormatter.ofPattern("HH:mm").format(Instant.ofEpochMilli(millis).atZone(ZoneId.systemDefault()))

    /** Przypomnienie o pojedynczym wpisie. */
    fun showReminder(context: Context, entry: EntryEntity) {
        val nm = context.getSystemService(NotificationManager::class.java)
        val urgent = entry.priority >= 2
        val channel = if (urgent) CH_URGENT else CH_REMINDERS
        val base = notifId(entry.id)

        val doneIntent = immutable(context, base + 2, ActionReceiver.intent(context, ActionReceiver.ACTION_DONE, entry.id))
        val plus1hIntent = immutable(context, base + 3, ActionReceiver.intent(context, ActionReceiver.ACTION_PLUS_1H, entry.id))
        val tomorrowIntent = immutable(context, base + 4, ActionReceiver.intent(context, ActionReceiver.ACTION_TOMORROW, entry.id))

        val builder = NotificationCompat.Builder(context, channel)
            .setSmallIcon(R.drawable.ic_notif)
            .setContentTitle(entry.content)
            .setStyle(NotificationCompat.BigTextStyle().bigText(entry.content + entry.note.let { if (it.isBlank()) "" else "\n$it" }))
            .setContentText(entry.dueAt?.let { "Termin: ${formatTime(it)}" } ?: "")
            .setContentIntent(openDetail(context, entry.id))
            .setAutoCancel(true)
            .setGroup(GROUP_REMINDERS)
            .setCategory(if (urgent) NotificationCompat.CATEGORY_ALARM else NotificationCompat.CATEGORY_REMINDER)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .addAction(0, "✓ Zrobione", doneIntent)
            .addAction(0, "+1 h", plus1hIntent)
            .addAction(0, "Jutro rano", tomorrowIntent)

        if (urgent) {
            val fullIntent = Intent(context, UrgentAlarmActivity::class.java).apply {
                putExtra("entryId", entry.id)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            builder.setFullScreenIntent(
                PendingIntent.getActivity(
                    context, base + 5, fullIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                ),
                true
            )
        }
        nm.notify(base, builder.build())
    }

    /** Podsumowanie grupy, gdy przychodzi kilka przypomnień naraz. */
    fun showGroupSummary(context: Context, count: Int) {
        val nm = context.getSystemService(NotificationManager::class.java)
        val open = PendingIntent.getActivity(
            context, ID_SUMMARY,
            Intent(context, MainActivity::class.java).apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        nm.notify(
            ID_SUMMARY,
            NotificationCompat.Builder(context, CH_REMINDERS)
                .setSmallIcon(R.drawable.ic_notif)
                .setContentTitle("Przypomnienia: $count")
                .setGroup(GROUP_REMINDERS)
                .setGroupSummary(true)
                .setContentIntent(open)
                .setAutoCancel(true)
                .build()
        )
    }

    fun showMorningReview(context: Context, inboxCount: Int, todayLines: List<String>, overdueCount: Int, thoughtLines: List<String>) {
        val nm = context.getSystemService(NotificationManager::class.java)
        val style = NotificationCompat.InboxStyle()
        todayLines.take(5).forEach { style.addLine("• $it") }
        thoughtLines.take(3).forEach { style.addLine("💭 $it") }
        val summaryParts = buildList {
            if (inboxCount > 0) add("Skrzynka: $inboxCount")
            add("Na dziś: ${todayLines.size}")
            if (overdueCount > 0) add("Zaległe: $overdueCount")
            if (thoughtLines.isNotEmpty()) add("Myśli: ${thoughtLines.size}")
        }
        val open = PendingIntent.getActivity(
            context, ID_MORNING,
            Intent(context, MainActivity::class.java).apply {
                action = "pl.myslnik.ACTION_REVIEW"
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        nm.notify(
            ID_MORNING,
            NotificationCompat.Builder(context, CH_REVIEWS)
                .setSmallIcon(R.drawable.ic_notif)
                .setContentTitle("Poranny przegląd ☀️")
                .setContentText(summaryParts.joinToString(" · "))
                .setStyle(style)
                .setContentIntent(open)
                .setAutoCancel(true)
                .build()
        )
    }

    fun showEveningSummary(context: Context, undoneLines: List<String>) {
        val nm = context.getSystemService(NotificationManager::class.java)
        if (undoneLines.isEmpty()) return
        val style = NotificationCompat.InboxStyle()
        undoneLines.take(6).forEach { style.addLine("• $it") }
        val moveAll = immutable(context, ID_EVENING + 1, ActionReceiver.intent(context, ActionReceiver.ACTION_MOVE_ALL_TOMORROW, ""))
        val open = PendingIntent.getActivity(
            context, ID_EVENING,
            Intent(context, MainActivity::class.java).apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        nm.notify(
            ID_EVENING,
            NotificationCompat.Builder(context, CH_REVIEWS)
                .setSmallIcon(R.drawable.ic_notif)
                .setContentTitle("Wieczorne podsumowanie 🌆")
                .setContentText("Niezrobione dziś: ${undoneLines.size}")
                .setStyle(style)
                .setContentIntent(open)
                .addAction(0, "Wszystko na jutro", moveAll)
                .setAutoCancel(true)
                .build()
        )
    }

    /** Stałe, ciche powiadomienie z „Dodaj" (RemoteInput — pisanie prosto z belki) i „🎤". */
    fun showOngoing(context: Context) {
        val nm = context.getSystemService(NotificationManager::class.java)

        val remoteInput = RemoteInput.Builder(KEY_REMOTE_TEXT)
            .setLabel("Wpisz myśl lub zadanie…")
            .build()
        // RemoteInput wymaga FLAG_MUTABLE — jedyny mutowalny PendingIntent w aplikacji.
        val addPending = PendingIntent.getBroadcast(
            context, ID_ONGOING + 1,
            ActionReceiver.intent(context, ActionReceiver.ACTION_REMOTE_ADD, ""),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
        )
        val addAction = NotificationCompat.Action.Builder(R.drawable.ic_add_note, "Dodaj", addPending)
            .addRemoteInput(remoteInput)
            .build()

        val micPending = PendingIntent.getActivity(
            context, ID_ONGOING + 2,
            Intent(context, QuickAddActivity::class.java).apply {
                action = QuickAddActivity.ACTION_DICTATE
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val open = PendingIntent.getActivity(
            context, ID_ONGOING + 3,
            Intent(context, QuickAddActivity::class.java).apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        nm.notify(
            ID_ONGOING,
            NotificationCompat.Builder(context, CH_QUICK)
                .setSmallIcon(R.drawable.ic_add_note)
                .setContentTitle("Myślnik — złap myśl")
                .setContentText("Dotknij, aby dodać wpis")
                .setOngoing(true)
                .setSilent(true)
                .setShowWhen(false)
                .setContentIntent(open)
                .addAction(addAction)
                .addAction(R.drawable.ic_mic, "🎤 Dyktuj", micPending)
                .build()
        )
    }

    fun hideOngoing(context: Context) {
        context.getSystemService(NotificationManager::class.java).cancel(ID_ONGOING)
    }

    fun cancelForEntry(context: Context, entryId: String) {
        context.getSystemService(NotificationManager::class.java).cancel(notifId(entryId))
    }

    /** Potwierdzenie zapisu z RemoteInput (żeby belka nie kręciła spinnerem w nieskończoność). */
    fun confirmRemoteAdd(context: Context) {
        showOngoing(context)
    }
}

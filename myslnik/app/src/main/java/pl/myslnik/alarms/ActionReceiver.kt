package pl.myslnik.alarms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.RemoteInput
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import pl.myslnik.MyslnikApp
import pl.myslnik.domain.EntryType
import pl.myslnik.domain.parser.PolishDateParser
import java.time.ZonedDateTime

/**
 * Akcje z powiadomień — działają BEZ otwierania aplikacji.
 */
class ActionReceiver : BroadcastReceiver() {

    companion object {
        const val ACTION_DONE = "pl.myslnik.NOTIF_DONE"
        const val ACTION_PLUS_1H = "pl.myslnik.NOTIF_PLUS_1H"
        const val ACTION_TOMORROW = "pl.myslnik.NOTIF_TOMORROW"
        const val ACTION_REMOTE_ADD = "pl.myslnik.NOTIF_REMOTE_ADD"
        const val ACTION_MOVE_ALL_TOMORROW = "pl.myslnik.NOTIF_MOVE_ALL_TOMORROW"
        const val EXTRA_ENTRY_ID = "entryId"

        fun intent(context: Context, action: String, entryId: String): Intent =
            Intent(context, ActionReceiver::class.java)
                .setAction(action)
                .putExtra(EXTRA_ENTRY_ID, entryId)
    }

    override fun onReceive(context: Context, intent: Intent) {
        val pending = goAsync()
        val container = MyslnikApp.container(context)
        val repo = container.repository
        val entryId = intent.getStringExtra(EXTRA_ENTRY_ID).orEmpty()
        val remoteText = RemoteInput.getResultsFromIntent(intent)
            ?.getCharSequence(Notifier.KEY_REMOTE_TEXT)?.toString()

        CoroutineScope(Dispatchers.Default).launch {
            try {
                when (intent.action) {
                    ACTION_DONE -> {
                        repo.markDone(entryId)
                        Notifier.cancelForEntry(context, entryId)
                    }
                    ACTION_PLUS_1H -> {
                        repo.snooze(entryId, System.currentTimeMillis() + 60 * 60 * 1000)
                        Notifier.cancelForEntry(context, entryId)
                    }
                    ACTION_TOMORROW -> {
                        val s = container.settingsRepo.current()
                        val z = java.time.ZoneId.systemDefault()
                        val tomorrowMorning = java.time.ZonedDateTime.now(z).toLocalDate().plusDays(1)
                            .atTime(s.rano / 60, s.rano % 60).atZone(z).toInstant().toEpochMilli()
                        repo.snooze(entryId, tomorrowMorning)
                        Notifier.cancelForEntry(context, entryId)
                    }
                    ACTION_REMOTE_ADD -> {
                        val text = remoteText?.trim().orEmpty()
                        if (text.isNotEmpty()) {
                            val s = container.settingsRepo.current()
                            val result = PolishDateParser(s.dayTimes()).parse(text, ZonedDateTime.now())
                            val content = result.cleanedText.ifBlank { text }
                            repo.add(
                                content = content,
                                type = if (result.dueAt != null) EntryType.TASK else EntryType.THOUGHT,
                                dueAt = result.dueAt?.toInstant()?.toEpochMilli()
                            )
                        }
                        // Odśwież stałe powiadomienie, żeby belka nie „kręciła" spinnerem.
                        Notifier.confirmRemoteAdd(context)
                    }
                    ACTION_MOVE_ALL_TOMORROW -> {
                        repo.moveTodayToTomorrow()
                        context.getSystemService(android.app.NotificationManager::class.java)
                            .cancel(Notifier.ID_EVENING)
                    }
                }
            } finally {
                pending.finish()
            }
        }
    }
}

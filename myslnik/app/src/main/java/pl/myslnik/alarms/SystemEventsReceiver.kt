package pl.myslnik.alarms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import pl.myslnik.MyslnikApp

/**
 * Odtwarza łańcuch alarmów po: restarcie, aktualizacji aplikacji, zmianie
 * czasu/strefy i zmianie uprawnienia do dokładnych alarmów.
 */
class SystemEventsReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_MY_PACKAGE_REPLACED,
            Intent.ACTION_TIME_CHANGED,
            Intent.ACTION_TIMEZONE_CHANGED,
            "android.app.action.SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED" -> {
                val pending = goAsync()
                val container = MyslnikApp.container(context)
                CoroutineScope(Dispatchers.Default).launch {
                    try {
                        container.startupSync()
                        AlarmEngine.processDue(context, container)
                    } finally {
                        pending.finish()
                    }
                }
            }
        }
    }
}

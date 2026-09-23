package pl.myslnik.alarms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import pl.myslnik.MyslnikApp

/**
 * Ogniwo łańcucha alarmów. goAsync + coroutine: wysyła wszystko, co zaległe,
 * i ustawia następny alarm.
 */
class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val pending = goAsync()
        val container = MyslnikApp.container(context)
        CoroutineScope(Dispatchers.Default).launch {
            try {
                AlarmEngine.processDue(context, container)
            } finally {
                pending.finish()
            }
        }
    }
}

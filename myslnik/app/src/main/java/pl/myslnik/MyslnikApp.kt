package pl.myslnik

import android.app.Application
import android.content.Context
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import pl.myslnik.alarms.AlarmScheduler
import pl.myslnik.alarms.BackupWorker
import pl.myslnik.alarms.Notifier
import pl.myslnik.alarms.SafetyWorker
import pl.myslnik.data.backup.BackupManager
import pl.myslnik.data.db.MyslnikDatabase
import pl.myslnik.data.repo.EntryRepository
import pl.myslnik.data.settings.SettingsRepository
import pl.myslnik.widget.WidgetUpdater
import java.util.concurrent.TimeUnit

/** Ręczny kontener zależności — bez Hilta. */
class AppContainer(private val appContext: Context) {
    val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    val database by lazy { MyslnikDatabase.get(appContext) }
    val settingsRepo by lazy { SettingsRepository(appContext) }
    val scheduler by lazy { AlarmScheduler(appContext, database.entryDao(), settingsRepo) }
    val backupManager by lazy { BackupManager(appContext, database.entryDao(), database.categoryDao()) }
    val repository by lazy {
        EntryRepository(database.entryDao(), database.categoryDao(), settingsRepo).also { repo ->
            repo.onDataChanged = {
                scheduler.reschedule()
                WidgetUpdater.refreshAll(appContext)
            }
        }
    }

    /** Synchronizacja przy każdym starcie i po zdarzeniach systemowych. */
    suspend fun startupSync() {
        repository.ensureDefaultCategories()
        repository.purgeOldTrash()
        scheduler.reschedule()
        WidgetUpdater.refreshAll(appContext)
        val s = settingsRepo.current()
        if (s.ongoingNotification) Notifier.showOngoing(appContext) else Notifier.hideOngoing(appContext)
    }
}

class MyslnikApp : Application() {

    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
        Notifier.createChannels(this)
        container.scope.launch { container.startupSync() }
        scheduleWorkers()
    }

    private fun scheduleWorkers() {
        val wm = WorkManager.getInstance(this)
        // Siatka bezpieczeństwa: co 6 h przelicz łańcuch alarmów, gdyby Xiaomi coś ubiło.
        wm.enqueueUniquePeriodicWork(
            "safety_net",
            ExistingPeriodicWorkPolicy.KEEP,
            PeriodicWorkRequestBuilder<SafetyWorker>(6, TimeUnit.HOURS).build()
        )
        // Automatyczna kopia raz dziennie.
        wm.enqueueUniquePeriodicWork(
            "daily_backup",
            ExistingPeriodicWorkPolicy.KEEP,
            PeriodicWorkRequestBuilder<BackupWorker>(24, TimeUnit.HOURS).build()
        )
    }

    companion object {
        fun container(context: Context): AppContainer =
            (context.applicationContext as MyslnikApp).container
    }
}

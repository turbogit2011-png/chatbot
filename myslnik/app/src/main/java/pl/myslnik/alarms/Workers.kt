package pl.myslnik.alarms

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import pl.myslnik.MyslnikApp

/**
 * Siatka bezpieczeństwa: gdyby HyperOS ubił alarmy, ten worker co kilka godzin
 * wyśle zaległe przypomnienia i odtworzy łańcuch.
 */
class SafetyWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val container = MyslnikApp.container(applicationContext)
        container.repository.purgeOldTrash()
        AlarmEngine.processDue(applicationContext, container)
        return Result.success()
    }
}

/** Automatyczna kopia zapasowa raz dziennie do folderu wskazanego przez SAF. */
class BackupWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val container = MyslnikApp.container(applicationContext)
        return try {
            container.backupManager.autoBackup(container.settingsRepo.current().backupDirUri)
            Result.success()
        } catch (_: Exception) {
            Result.retry()
        }
    }
}

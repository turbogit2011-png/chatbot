package com.sonara.studio

import android.app.Application
import androidx.work.Configuration
import com.sonara.studio.di.ServiceLocator
import com.sonara.studio.util.Notifications
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class SonaraApp : Application(), Configuration.Provider {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder()
            .setMinimumLoggingLevel(if (BuildConfig.DEBUG) android.util.Log.DEBUG else android.util.Log.WARN)
            .build()

    override fun onCreate() {
        super.onCreate()
        Notifications.ensureChannels(this)
        scope.launch {
            val repo = ServiceLocator.musicRepository(this@SonaraApp)
            repo.pruneJobs()
        }
    }
}

package com.pulse.studio

import android.app.Application
import androidx.work.Configuration
import com.pulse.studio.util.Notifications

class PulseApp : Application(), Configuration.Provider {

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder()
            .setMinimumLoggingLevel(if (BuildConfig.DEBUG) android.util.Log.DEBUG else android.util.Log.WARN)
            .build()

    override fun onCreate() {
        super.onCreate()
        Notifications.ensureChannels(this)
    }
}

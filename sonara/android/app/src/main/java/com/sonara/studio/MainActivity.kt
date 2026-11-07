package com.sonara.studio

import android.Manifest
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.lifecycle.lifecycleScope
import com.sonara.studio.di.ServiceLocator
import com.sonara.studio.ui.SonaraRoot
import com.sonara.studio.ui.theme.SonaraTheme
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {

    private val notificationPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { }

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val settings = ServiceLocator.settings(this)
        val player = ServiceLocator.playerController(this)
        val repo = ServiceLocator.musicRepository(this)
        player.setOnSongStarted { id -> lifecycleScope.launch { repo.markPlayed(id) } }
        player.connect()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
        }

        lifecycleScope.launch {
            // Re-attach watchers for server jobs that were still running when the app
            // was killed. On-device renders are driven by their own worker.
            repo.activeJobIds().forEach { id ->
                repo.pollJob(id).onSuccess { response ->
                    repo.updateJob(response)
                    repo.ingest(response)
                }
            }
        }

        setContent {
            val config by settings.settings.collectAsState(initial = null)
            SonaraTheme(dynamicColor = config?.dynamicColor ?: false) {
                SonaraRoot(startOnboarding = config?.onboarded == false)
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        if (isFinishing) {
            ServiceLocator.playerController(this).release()
        }
    }
}

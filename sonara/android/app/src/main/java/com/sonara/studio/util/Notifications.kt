package com.sonara.studio.util

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.sonara.studio.R

object Notifications {
    const val CHANNEL_GENERATION = "sonara_generation"
    const val CHANNEL_PLAYBACK = "sonara_playback"

    fun ensureChannels(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(NotificationManager::class.java) ?: return
        manager.createNotificationChannel(
            NotificationChannel(
                CHANNEL_GENERATION,
                "Song generation",
                NotificationManager.IMPORTANCE_LOW,
            ).apply { description = "Progress for songs being generated" }
        )
        manager.createNotificationChannel(
            NotificationChannel(
                CHANNEL_PLAYBACK,
                "Playback",
                NotificationManager.IMPORTANCE_LOW,
            ).apply { description = "Media controls" }
        )
    }

    private fun allowed(context: Context): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            ContextCompat.checkSelfPermission(
                context,
                android.Manifest.permission.POST_NOTIFICATIONS,
            ) == PackageManager.PERMISSION_GRANTED

    fun progress(context: Context, id: Int, title: String, text: String, percent: Int) {
        if (!allowed(context)) return
        val notification = NotificationCompat.Builder(context, CHANNEL_GENERATION)
            .setSmallIcon(R.drawable.ic_stat_note)
            .setContentTitle(title)
            .setContentText(text)
            .setOnlyAlertOnce(true)
            .setOngoing(true)
            .setProgress(100, percent.coerceIn(0, 100), percent <= 0)
            .build()
        runCatching { NotificationManagerCompat.from(context).notify(id, notification) }
    }

    fun done(context: Context, id: Int, title: String, text: String) {
        if (!allowed(context)) return
        val notification = NotificationCompat.Builder(context, CHANNEL_GENERATION)
            .setSmallIcon(R.drawable.ic_stat_note)
            .setContentTitle(title)
            .setContentText(text)
            .setAutoCancel(true)
            .build()
        runCatching { NotificationManagerCompat.from(context).notify(id, notification) }
    }

    fun cancel(context: Context, id: Int) {
        runCatching { NotificationManagerCompat.from(context).cancel(id) }
    }
}

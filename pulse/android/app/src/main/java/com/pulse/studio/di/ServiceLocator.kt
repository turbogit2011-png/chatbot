package com.pulse.studio.di

import android.content.Context
import com.pulse.studio.data.local.PulseDatabase
import com.pulse.studio.data.prefs.SettingsRepository
import com.pulse.studio.data.repo.ClipRepository

/** Small hand-rolled dependency graph; every entry is a process-wide singleton. */
object ServiceLocator {

    @Volatile private var database: PulseDatabase? = null
    @Volatile private var clips: ClipRepository? = null
    @Volatile private var settings: SettingsRepository? = null

    fun database(context: Context): PulseDatabase = database ?: synchronized(this) {
        database ?: PulseDatabase.build(context.applicationContext).also { database = it }
    }

    fun clipRepository(context: Context): ClipRepository = clips ?: synchronized(this) {
        clips ?: ClipRepository(context.applicationContext, database(context).clipDao()).also { clips = it }
    }

    fun settings(context: Context): SettingsRepository = settings ?: synchronized(this) {
        settings ?: SettingsRepository(context.applicationContext).also { settings = it }
    }
}

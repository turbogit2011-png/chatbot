package com.sonara.studio.di

import android.content.Context
import com.sonara.studio.data.audio.AudioStore
import com.sonara.studio.data.local.AppDatabase
import com.sonara.studio.data.prefs.SettingsRepository
import com.sonara.studio.data.remote.ApiFactory
import com.sonara.studio.data.remote.SonaraApi
import com.sonara.studio.data.repo.MusicRepository
import com.sonara.studio.engine.LocalEngine
import com.sonara.studio.player.PlayerController
import okhttp3.OkHttpClient

/**
 * Hand-rolled dependency graph. Small enough that a DI framework would only add
 * build complexity, and every dependency here is a process-wide singleton anyway.
 */
object ServiceLocator {

    @Volatile private var database: AppDatabase? = null
    @Volatile private var settingsRepo: SettingsRepository? = null
    @Volatile private var http: OkHttpClient? = null
    @Volatile private var apiClient: SonaraApi? = null
    @Volatile private var store: AudioStore? = null
    @Volatile private var repo: MusicRepository? = null
    @Volatile private var player: PlayerController? = null
    @Volatile private var local: LocalEngine? = null

    fun settings(context: Context): SettingsRepository = settingsRepo ?: synchronized(this) {
        settingsRepo ?: SettingsRepository(context.applicationContext).also { settingsRepo = it }
    }

    fun okHttp(context: Context): OkHttpClient = http ?: synchronized(this) {
        http ?: ApiFactory.okHttp(settings(context)).also { http = it }
    }

    fun api(context: Context): SonaraApi = apiClient ?: synchronized(this) {
        apiClient ?: ApiFactory.api(okHttp(context)).also { apiClient = it }
    }

    fun database(context: Context): AppDatabase = database ?: synchronized(this) {
        database ?: AppDatabase.build(context.applicationContext).also { database = it }
    }

    fun audioStore(context: Context): AudioStore = store ?: synchronized(this) {
        store ?: AudioStore(context.applicationContext, okHttp(context)).also { store = it }
    }

    fun localEngine(context: Context): LocalEngine = local ?: synchronized(this) {
        local ?: LocalEngine(context.applicationContext).also { local = it }
    }

    fun musicRepository(context: Context): MusicRepository = repo ?: synchronized(this) {
        repo ?: MusicRepository(
            context = context.applicationContext,
            api = api(context),
            songDao = database(context).songDao(),
            jobDao = database(context).jobDao(),
            audioStore = audioStore(context),
            settings = settings(context),
            localEngine = localEngine(context),
        ).also { repo = it }
    }

    fun playerController(context: Context): PlayerController = player ?: synchronized(this) {
        player ?: PlayerController(context.applicationContext).also { player = it }
    }
}

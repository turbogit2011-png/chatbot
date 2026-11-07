package com.pulse.studio.data.prefs

import android.content.Context
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore(name = "pulse_settings")

data class PulseSettings(
    val styleId: String = "auto",
    val paletteId: String = "neon",
    val aspectId: String = "9:16",
    val qualityId: String = "720",
    val fps: Int = 30,
    val showText: Boolean = true,
    val showProgress: Boolean = true,
    val useCover: Boolean = true,
    val onboarded: Boolean = false,
)

class SettingsRepository(private val context: Context) {

    private object Keys {
        val style = stringPreferencesKey("style")
        val palette = stringPreferencesKey("palette")
        val aspect = stringPreferencesKey("aspect")
        val quality = stringPreferencesKey("quality")
        val fps = intPreferencesKey("fps")
        val showText = booleanPreferencesKey("show_text")
        val showProgress = booleanPreferencesKey("show_progress")
        val useCover = booleanPreferencesKey("use_cover")
        val onboarded = booleanPreferencesKey("onboarded")
    }

    val settings: Flow<PulseSettings> = context.dataStore.data.map { it.toSettings() }

    private fun Preferences.toSettings() = PulseSettings(
        styleId = this[Keys.style] ?: "auto",
        paletteId = this[Keys.palette] ?: "neon",
        aspectId = this[Keys.aspect] ?: "9:16",
        qualityId = this[Keys.quality] ?: "720",
        fps = this[Keys.fps] ?: 30,
        showText = this[Keys.showText] ?: true,
        showProgress = this[Keys.showProgress] ?: true,
        useCover = this[Keys.useCover] ?: true,
        onboarded = this[Keys.onboarded] ?: false,
    )

    suspend fun snapshot(): PulseSettings = settings.first()

    suspend fun setStyle(value: String) = edit { it[Keys.style] = value }
    suspend fun setPalette(value: String) = edit { it[Keys.palette] = value }
    suspend fun setAspect(value: String) = edit { it[Keys.aspect] = value }
    suspend fun setQuality(value: String) = edit { it[Keys.quality] = value }
    suspend fun setFps(value: Int) = edit { it[Keys.fps] = value }
    suspend fun setShowText(value: Boolean) = edit { it[Keys.showText] = value }
    suspend fun setShowProgress(value: Boolean) = edit { it[Keys.showProgress] = value }
    suspend fun setUseCover(value: Boolean) = edit { it[Keys.useCover] = value }
    suspend fun setOnboarded(value: Boolean) = edit { it[Keys.onboarded] = value }

    private suspend fun edit(block: (androidx.datastore.preferences.core.MutablePreferences) -> Unit) {
        context.dataStore.edit { block(it) }
    }
}

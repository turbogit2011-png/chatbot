package com.sonara.studio.data.prefs

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

private val Context.dataStore by preferencesDataStore(name = "sonara_settings")

enum class EngineMode { Device, Server }

data class SonaraSettings(
    val engineMode: EngineMode = EngineMode.Device,
    val serverUrl: String = DEFAULT_SERVER_URL,
    val apiKey: String = "",
    val engine: String = "",
    val defaultModel: String = "sonara-v1",
    val autoDownload: Boolean = true,
    val defaultDuration: Int = 180,
    val defaultLanguage: String = "auto",
    val onboarded: Boolean = false,
    val dynamicColor: Boolean = false,
    val wifiOnlyDownloads: Boolean = false,
) {
    companion object {
        const val DEFAULT_SERVER_URL = "http://10.0.2.2:8000"
    }
}

const val DEFAULT_SERVER_URL = SonaraSettings.DEFAULT_SERVER_URL

class SettingsRepository(private val context: Context) {

    private object Keys {
        val engineMode = stringPreferencesKey("engine_mode")
        val serverUrl = stringPreferencesKey("server_url")
        val apiKey = stringPreferencesKey("api_key")
        val engine = stringPreferencesKey("engine")
        val defaultModel = stringPreferencesKey("default_model")
        val autoDownload = booleanPreferencesKey("auto_download")
        val defaultDuration = intPreferencesKey("default_duration")
        val defaultLanguage = stringPreferencesKey("default_language")
        val onboarded = booleanPreferencesKey("onboarded")
        val dynamicColor = booleanPreferencesKey("dynamic_color")
        val wifiOnly = booleanPreferencesKey("wifi_only")
    }

    val settings: Flow<SonaraSettings> = context.dataStore.data.map { it.toSettings() }

    private fun Preferences.toSettings() = SonaraSettings(
        engineMode = when (this[Keys.engineMode]) {
            "server" -> EngineMode.Server
            else -> EngineMode.Device
        },
        serverUrl = this[Keys.serverUrl] ?: DEFAULT_SERVER_URL,
        apiKey = this[Keys.apiKey] ?: "",
        engine = this[Keys.engine] ?: "",
        defaultModel = this[Keys.defaultModel] ?: "sonara-v1",
        autoDownload = this[Keys.autoDownload] ?: true,
        defaultDuration = this[Keys.defaultDuration] ?: 180,
        defaultLanguage = this[Keys.defaultLanguage] ?: "auto",
        onboarded = this[Keys.onboarded] ?: false,
        dynamicColor = this[Keys.dynamicColor] ?: false,
        wifiOnlyDownloads = this[Keys.wifiOnly] ?: false,
    )

    suspend fun snapshot(): SonaraSettings = settings.first()

    suspend fun setEngineMode(value: EngineMode) = edit {
        it[Keys.engineMode] = if (value == EngineMode.Server) "server" else "device"
    }
    suspend fun setServerUrl(value: String) = edit { it[Keys.serverUrl] = value.trim() }
    suspend fun setApiKey(value: String) = edit { it[Keys.apiKey] = value.trim() }
    suspend fun setEngine(value: String) = edit { it[Keys.engine] = value.trim() }
    suspend fun setDefaultModel(value: String) = edit { it[Keys.defaultModel] = value }
    suspend fun setAutoDownload(value: Boolean) = edit { it[Keys.autoDownload] = value }
    suspend fun setDefaultDuration(value: Int) = edit { it[Keys.defaultDuration] = value }
    suspend fun setDefaultLanguage(value: String) = edit { it[Keys.defaultLanguage] = value }
    suspend fun setOnboarded(value: Boolean) = edit { it[Keys.onboarded] = value }
    suspend fun setDynamicColor(value: Boolean) = edit { it[Keys.dynamicColor] = value }
    suspend fun setWifiOnlyDownloads(value: Boolean) = edit { it[Keys.wifiOnly] = value }

    private suspend fun edit(block: (androidx.datastore.preferences.core.MutablePreferences) -> Unit) {
        context.dataStore.edit { block(it) }
    }
}

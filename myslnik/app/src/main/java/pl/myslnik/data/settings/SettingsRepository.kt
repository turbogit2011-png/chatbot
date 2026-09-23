package pl.myslnik.data.settings

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.core.stringSetPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import pl.myslnik.domain.parser.DayTimes

private val Context.dataStore by preferencesDataStore(name = "settings")

/**
 * Ustawienia aplikacji. Wszystkie godziny trzymamy jako minuty od północy.
 */
data class Settings(
    val nightStart: Int = 23 * 60,
    val nightEnd: Int = 7 * 60,           // = godzina porannego przeglądu
    val eveningEnabled: Boolean = true,
    val eveningTime: Int = 21 * 60,
    val nagIntervalMin: Int = 10,
    val thoughtReturnDays: Int = 3,
    val ongoingNotification: Boolean = true,
    val rano: Int = 8 * 60,
    val przedPoludniem: Int = 10 * 60,
    val poludnie: Int = 12 * 60,
    val poPoludniu: Int = 15 * 60,
    val wieczorem: Int = 19 * 60,
    val wNocy: Int = 22 * 60,
    val defaultTime: Int = 9 * 60,
    val backupDirUri: String = "",
    val manualChecksDone: Set<String> = emptySet(),
    val onboardingDone: Boolean = false,
) {
    fun dayTimes() = DayTimes(rano, przedPoludniem, poludnie, poPoludniu, wieczorem, wNocy, defaultTime)
}

class SettingsRepository(private val context: Context) {

    private object K {
        val nightStart = intPreferencesKey("night_start")
        val nightEnd = intPreferencesKey("night_end")
        val eveningEnabled = booleanPreferencesKey("evening_enabled")
        val eveningTime = intPreferencesKey("evening_time")
        val nagInterval = intPreferencesKey("nag_interval")
        val thoughtReturnDays = intPreferencesKey("thought_return_days")
        val ongoingNotification = booleanPreferencesKey("ongoing_notification")
        val rano = intPreferencesKey("t_rano")
        val przedPol = intPreferencesKey("t_przed_pol")
        val poludnie = intPreferencesKey("t_poludnie")
        val poPol = intPreferencesKey("t_po_pol")
        val wieczorem = intPreferencesKey("t_wieczorem")
        val wNocy = intPreferencesKey("t_w_nocy")
        val defaultTime = intPreferencesKey("t_default")
        val backupDirUri = stringPreferencesKey("backup_dir_uri")
        val manualChecks = stringSetPreferencesKey("manual_checks")
        val onboardingDone = booleanPreferencesKey("onboarding_done")
    }

    val settings: Flow<Settings> = context.dataStore.data.map { p ->
        Settings(
            nightStart = p[K.nightStart] ?: 23 * 60,
            nightEnd = p[K.nightEnd] ?: 7 * 60,
            eveningEnabled = p[K.eveningEnabled] ?: true,
            eveningTime = p[K.eveningTime] ?: 21 * 60,
            nagIntervalMin = p[K.nagInterval] ?: 10,
            thoughtReturnDays = p[K.thoughtReturnDays] ?: 3,
            ongoingNotification = p[K.ongoingNotification] ?: true,
            rano = p[K.rano] ?: 8 * 60,
            przedPoludniem = p[K.przedPol] ?: 10 * 60,
            poludnie = p[K.poludnie] ?: 12 * 60,
            poPoludniu = p[K.poPol] ?: 15 * 60,
            wieczorem = p[K.wieczorem] ?: 19 * 60,
            wNocy = p[K.wNocy] ?: 22 * 60,
            defaultTime = p[K.defaultTime] ?: 9 * 60,
            backupDirUri = p[K.backupDirUri] ?: "",
            manualChecksDone = p[K.manualChecks] ?: emptySet(),
            onboardingDone = p[K.onboardingDone] ?: false,
        )
    }

    suspend fun current(): Settings = settings.first()

    suspend fun update(block: suspend (Settings) -> Settings) {
        val next = block(current())
        context.dataStore.edit { p ->
            p[K.nightStart] = next.nightStart
            p[K.nightEnd] = next.nightEnd
            p[K.eveningEnabled] = next.eveningEnabled
            p[K.eveningTime] = next.eveningTime
            p[K.nagInterval] = next.nagIntervalMin
            p[K.thoughtReturnDays] = next.thoughtReturnDays
            p[K.ongoingNotification] = next.ongoingNotification
            p[K.rano] = next.rano
            p[K.przedPol] = next.przedPoludniem
            p[K.poludnie] = next.poludnie
            p[K.poPol] = next.poPoludniu
            p[K.wieczorem] = next.wieczorem
            p[K.wNocy] = next.wNocy
            p[K.defaultTime] = next.defaultTime
            p[K.backupDirUri] = next.backupDirUri
            p[K.manualChecks] = next.manualChecksDone
            p[K.onboardingDone] = next.onboardingDone
        }
    }
}

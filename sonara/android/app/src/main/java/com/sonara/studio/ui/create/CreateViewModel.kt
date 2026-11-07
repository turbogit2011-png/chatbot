package com.sonara.studio.ui.create

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.sonara.studio.data.local.JobEntity
import com.sonara.studio.data.local.SongEntity
import com.sonara.studio.data.prefs.SettingsRepository
import com.sonara.studio.data.remote.GenerateRequest
import com.sonara.studio.data.remote.ModelDto
import com.sonara.studio.data.repo.MusicRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlin.random.Random

enum class CreateMode { Simple, Custom }

data class CreateUiState(
    val mode: CreateMode = CreateMode.Simple,
    val prompt: String = "",
    val title: String = "",
    val lyrics: String = "",
    val style: String = "",
    val negativeStyle: String = "",
    val selectedTags: List<String> = emptyList(),
    val instrumental: Boolean = false,
    val model: String = "sonara-v1",
    val durationSeconds: Int = 180,
    val styleWeight: Float = 0.6f,
    val weirdness: Float = 0.35f,
    val lyricsWeight: Float = 0.6f,
    val language: String = "auto",
    val vocalGender: String = "any",
    val tempoBpm: Int? = null,
    val keySignature: String? = null,
    val seed: Long? = null,
    val variations: Int = 2,
    val advancedOpen: Boolean = false,
    val models: List<ModelDto> = emptyList(),
    val submitting: Boolean = false,
    val writingLyrics: Boolean = false,
    val error: String? = null,
    val notice: String? = null,
    val backendOnline: Boolean? = null,
    val backendLabel: String = "",
) {
    val canSubmit: Boolean
        get() = !submitting && when (mode) {
            CreateMode.Simple -> prompt.trim().length >= 3
            CreateMode.Custom -> style.trim().isNotEmpty() || selectedTags.isNotEmpty() ||
                lyrics.trim().isNotEmpty()
        }

    val effectiveStyle: String
        get() = (selectedTags + style.split(",").map { it.trim() }.filter { it.isNotEmpty() })
            .distinct()
            .joinToString(", ")
}

class CreateViewModel(
    private val repo: MusicRepository,
    private val settings: SettingsRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(CreateUiState())
    val state: StateFlow<CreateUiState> = _state.asStateFlow()

    val activeJobs: StateFlow<List<JobEntity>> = repo.observeActiveJobs()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val recentJobs: StateFlow<List<JobEntity>> = repo.observeRecentJobs()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val library: StateFlow<List<SongEntity>> = repo.observeLibrary()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    init {
        viewModelScope.launch {
            val config = settings.snapshot()
            _state.value = _state.value.copy(
                model = config.defaultModel,
                durationSeconds = config.defaultDuration,
                language = config.defaultLanguage,
            )
            refreshBackend()
        }
    }

    fun refreshBackend() {
        viewModelScope.launch {
            repo.health()
                .onSuccess { health ->
                    _state.value = _state.value.copy(
                        backendOnline = health.status == "ok" || health.status == "ready",
                        backendLabel = listOfNotNull(
                            health.engine.ifBlank { null },
                            health.device.ifBlank { null },
                        ).joinToString(" · "),
                    )
                }
                .onFailure {
                    _state.value = _state.value.copy(backendOnline = false, backendLabel = "")
                }
            repo.models().onSuccess { models ->
                val current = _state.value
                val chosen = models.firstOrNull { it.id == current.model }?.id
                    ?: models.firstOrNull()?.id
                    ?: current.model
                _state.value = current.copy(models = models, model = chosen)
            }
        }
    }

    fun setMode(mode: CreateMode) = update { it.copy(mode = mode) }
    fun setPrompt(value: String) = update { it.copy(prompt = value.take(1200)) }
    fun setTitle(value: String) = update { it.copy(title = value.take(120)) }
    fun setLyrics(value: String) = update { it.copy(lyrics = value.take(6000)) }
    fun setStyle(value: String) = update { it.copy(style = value.take(400)) }
    fun setNegativeStyle(value: String) = update { it.copy(negativeStyle = value.take(300)) }
    fun setInstrumental(value: Boolean) = update { it.copy(instrumental = value) }
    fun setModel(value: String) = update { it.copy(model = value) }
    fun setDuration(value: Int) = update { it.copy(durationSeconds = value) }
    fun setStyleWeight(value: Float) = update { it.copy(styleWeight = value) }
    fun setWeirdness(value: Float) = update { it.copy(weirdness = value) }
    fun setLyricsWeight(value: Float) = update { it.copy(lyricsWeight = value) }
    fun setLanguage(value: String) = update { it.copy(language = value) }
    fun setVocalGender(value: String) = update { it.copy(vocalGender = value) }
    fun setTempo(value: Int?) = update { it.copy(tempoBpm = value) }
    fun setVariations(value: Int) = update { it.copy(variations = value.coerceIn(1, 4)) }
    fun toggleAdvanced() = update { it.copy(advancedOpen = !it.advancedOpen) }
    fun clearError() = update { it.copy(error = null, notice = null) }

    fun toggleTag(tag: String) = update { current ->
        val tags = if (current.selectedTags.contains(tag)) {
            current.selectedTags - tag
        } else {
            (current.selectedTags + tag).takeLast(8)
        }
        current.copy(selectedTags = tags)
    }

    fun applyPreset(preset: StylePreset) = update { current ->
        current.copy(
            selectedTags = preset.tags,
            style = preset.extraStyle,
            tempoBpm = preset.bpm,
            mode = CreateMode.Custom,
        )
    }

    fun randomizeSeed() = update { it.copy(seed = Random.nextLong(1, Long.MAX_VALUE)) }
    fun clearSeed() = update { it.copy(seed = null) }

    fun surpriseMe() {
        val idea = SurprisePrompts.random()
        update { it.copy(prompt = idea, mode = CreateMode.Simple) }
    }

    fun writeLyrics() {
        val current = _state.value
        val brief = current.prompt.ifBlank { current.effectiveStyle }
        if (brief.isBlank()) {
            update { it.copy(error = "Describe the song first, then I can write the lyrics.") }
            return
        }
        update { it.copy(writingLyrics = true, error = null) }
        viewModelScope.launch {
            repo.writeLyrics(brief, current.language, current.effectiveStyle.ifBlank { null })
                .onSuccess { response ->
                    update {
                        it.copy(
                            writingLyrics = false,
                            lyrics = response.lyrics,
                            title = it.title.ifBlank { response.title },
                            selectedTags = if (it.selectedTags.isEmpty()) {
                                response.styleTags.take(6)
                            } else {
                                it.selectedTags
                            },
                            mode = CreateMode.Custom,
                            notice = "Lyrics written — edit anything you like.",
                        )
                    }
                }
                .onFailure { error ->
                    update {
                        it.copy(
                            writingLyrics = false,
                            error = error.message ?: "Could not reach the lyric writer.",
                        )
                    }
                }
        }
    }

    fun generate() {
        val current = _state.value
        if (!current.canSubmit) return
        update { it.copy(submitting = true, error = null, notice = null) }
        val request = GenerateRequest(
            prompt = current.prompt.trim().ifBlank { null },
            lyrics = if (current.instrumental) null else current.lyrics.trim().ifBlank { null },
            title = current.title.trim().ifBlank { null },
            style = current.effectiveStyle.ifBlank { null },
            negativeStyle = current.negativeStyle.trim().ifBlank { null },
            instrumental = current.instrumental,
            model = current.model,
            durationSeconds = current.durationSeconds,
            styleWeight = current.styleWeight,
            weirdness = current.weirdness,
            lyricsWeight = current.lyricsWeight,
            language = current.language.takeIf { it != "auto" },
            vocalGender = current.vocalGender.takeIf { it != "any" },
            tempoBpm = current.tempoBpm,
            keySignature = current.keySignature,
            seed = current.seed,
            numVariations = current.variations,
        )
        viewModelScope.launch {
            repo.submitGenerate(request)
                .onSuccess {
                    update {
                        it.copy(
                            submitting = false,
                            notice = "In the queue — you can leave this screen, it keeps rendering.",
                        )
                    }
                }
                .onFailure { error ->
                    update {
                        it.copy(
                            submitting = false,
                            error = error.message ?: "Could not submit the song.",
                        )
                    }
                }
        }
    }

    fun dismissJob(id: String) {
        viewModelScope.launch { repo.dismissJob(id) }
    }

    private fun update(block: (CreateUiState) -> CreateUiState) {
        _state.value = block(_state.value)
    }

    companion object {
        fun factory(context: Context): ViewModelProvider.Factory = viewModelFactory {
            initializer {
                CreateViewModel(
                    repo = com.sonara.studio.di.ServiceLocator.musicRepository(context),
                    settings = com.sonara.studio.di.ServiceLocator.settings(context),
                )
            }
        }
    }
}

data class StylePreset(
    val name: String,
    val tags: List<String>,
    val extraStyle: String = "",
    val bpm: Int? = null,
)

object Presets {
    val genres = listOf(
        "pop", "hip hop", "trap", "drill", "rock", "indie rock", "metal", "metalcore",
        "punk", "grunge", "edm", "house", "deep house", "techno", "trance", "dnb",
        "dubstep", "synthwave", "lo-fi", "jazz", "swing", "blues", "soul", "funk",
        "r&b", "disco", "reggae", "reggaeton", "afrobeats", "latin", "bossa nova",
        "country", "folk", "bluegrass", "gospel", "classical", "orchestral", "cinematic",
        "ambient", "chillout", "k-pop", "j-pop", "phonk", "hyperpop", "opera",
        "musical theatre", "chiptune", "disco polo",
    )

    val moods = listOf(
        "euphoric", "melancholic", "dark", "dreamy", "aggressive", "romantic", "epic",
        "nostalgic", "hopeful", "anthemic", "hypnotic", "playful", "haunting", "triumphant",
        "intimate", "gritty", "uplifting", "sultry", "cold", "warm",
    )

    val instruments = listOf(
        "808 bass", "analog synth", "electric guitar", "acoustic guitar", "grand piano",
        "strings", "brass section", "church organ", "sitar", "accordion", "harp",
        "slap bass", "tape drums", "trap hats", "choir", "handpan", "violin solo",
    )

    val vocals = listOf(
        "female vocals", "male vocals", "duet", "whispered vocals", "belting vocals",
        "rap verses", "choir harmonies", "autotuned vocals", "raspy vocals", "falsetto",
    )

    val production = listOf(
        "radio ready mix", "lo-fi tape", "wide stereo", "sidechained pads", "vinyl crackle",
        "stadium reverb", "dry close mix", "analog warmth", "heavy compression", "live room",
    )

    val quick = listOf(
        StylePreset("Midnight synthwave", listOf("synthwave", "nostalgic", "analog synth"), "retro 80s drums, neon arpeggios", 110),
        StylePreset("Festival anthem", listOf("edm", "anthemic", "euphoric"), "big room drop, sidechained pads", 128),
        StylePreset("Soft piano ballad", listOf("pop", "intimate", "grand piano"), "slow build, string outro", 72),
        StylePreset("Hard trap", listOf("trap", "dark", "808 bass"), "triplet hats, distorted 808", 140),
        StylePreset("Sunday gospel", listOf("gospel", "triumphant", "choir"), "hammond organ, clapping congregation", 88),
        StylePreset("Smoky jazz club", listOf("jazz", "sultry", "slap bass"), "brushed drums, muted trumpet", 96),
        StylePreset("Alt rock stadium", listOf("indie rock", "anthemic", "electric guitar"), "driving toms, big chorus", 136),
        StylePreset("Lo-fi study beat", listOf("lo-fi", "dreamy", "tape drums"), "dusty keys, vinyl crackle", 82),
        StylePreset("Afrobeats summer", listOf("afrobeats", "warm", "handpan"), "log drum groove, airy vocals", 104),
        StylePreset("Cinematic trailer", listOf("cinematic", "epic", "brass section"), "braams, taiko hits, rising strings", 90),
    )

    val languages = listOf(
        "auto" to "Auto",
        "en" to "English",
        "pl" to "Polski",
        "es" to "Español",
        "de" to "Deutsch",
        "fr" to "Français",
        "it" to "Italiano",
        "pt" to "Português",
        "uk" to "Українська",
        "ja" to "日本語",
        "ko" to "한국어",
    )
}

val SurprisePrompts = listOf(
    "A neon-lit synthwave anthem about driving home at 4am with the windows down",
    "Gritty UK drill track about leaving your hometown behind, cold strings and sliding 808s",
    "Warm acoustic folk song about a grandmother's kitchen, fingerpicked guitar and brushed snare",
    "Euphoric festival house record with a chopped vocal hook and a stadium-sized drop",
    "Melancholic indie rock ballad about a last train, reverb-drenched guitars and a shouted bridge",
    "Smooth 90s R&B slow jam about missed calls, Rhodes chords and silky harmonies",
    "Epic orchestral battle theme with taiko drums, choir and a soaring brass finale",
    "Playful disco polo party track about a wedding that never ends, accordion and four-on-the-floor",
    "Haunting dark ambient piece about an abandoned observatory, granular textures and distant bells",
    "Triumphant gospel choir number about rising after failure, hammond organ and handclaps",
)

package pl.myslnik.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import pl.myslnik.AppContainer
import pl.myslnik.data.db.CategoryEntity
import pl.myslnik.data.db.EntryEntity
import pl.myslnik.data.settings.Settings
import java.time.ZoneId
import java.time.ZonedDateTime

class AppViewModel(val container: AppContainer) : ViewModel() {

    private val dao = container.database.entryDao()
    val repo = container.repository
    val settingsRepo = container.settingsRepo

    private fun endOfToday(): Long = ZonedDateTime.now(ZoneId.systemDefault())
        .toLocalDate().plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli()

    val inbox = dao.inbox().stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())
    val inboxCount = dao.inboxCount().stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0)
    val today = dao.today(endOfToday()).stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())
    val planned = dao.planned().stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())
    val thoughts = dao.thoughts().stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())
    val done = dao.done().stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())
    val trash = dao.trash().stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())
    val categories = container.database.categoryDao().all()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val searchQuery = MutableStateFlow("")
    @OptIn(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
    val searchResults: Flow<List<EntryEntity>> = searchQuery.flatMapLatest { q ->
        if (q.isBlank()) flowOf(emptyList()) else dao.search(q)
    }

    fun entryFlow(id: String): Flow<EntryEntity?> = dao.byIdFlow(id)

    /** Ostatnio zmieniony rekord — do „Cofnij". */
    private val undoStack = ArrayDeque<EntryEntity>()
    val lastActionLabel = MutableStateFlow<String?>(null)

    private fun withUndo(label: String, id: String, block: suspend () -> Unit) {
        viewModelScope.launch {
            dao.byId(id)?.let { prev ->
                undoStack.addLast(prev)
                if (undoStack.size > 20) undoStack.removeFirst()
            }
            block()
            lastActionLabel.value = label
        }
    }

    fun undo() {
        viewModelScope.launch {
            undoStack.removeLastOrNull()?.let { repo.restoreExact(it) }
            lastActionLabel.value = null
        }
    }
    fun dismissUndo() { lastActionLabel.value = null }

    fun markDone(id: String) = withUndo("Zrobione ✓", id) { repo.markDone(id) }
    fun snooze(id: String, until: Long) = withUndo("Odłożono", id) { repo.snooze(id, until) }
    fun snoozeTomorrowMorning(id: String) {
        viewModelScope.launch {
            val s = settingsRepo.current()
            val z = ZoneId.systemDefault()
            val t = ZonedDateTime.now(z).toLocalDate().plusDays(1)
                .atTime(s.rano / 60, s.rano % 60).atZone(z).toInstant().toEpochMilli()
            withUndo("Odłożono na jutro", id) { repo.snooze(id, t) }
        }
    }
    fun toThought(id: String) = withUndo("Zamieniono w myśl", id) { repo.toThought(id) }
    fun keepAsThought(id: String) = withUndo("Zostawiono jako myśl", id) { repo.keepAsThought(id) }
    fun archive(id: String) = withUndo("Zarchiwizowano", id) { repo.archive(id) }
    fun trash(id: String) = withUndo("Przeniesiono do kosza", id) { repo.trash(id) }
    fun restoreFromTrash(id: String) = withUndo("Przywrócono", id) { repo.restoreFromTrash(id) }
    fun activate(id: String) = withUndo("Aktywowano", id) { repo.activate(id) }
    fun save(entry: EntryEntity) { viewModelScope.launch { repo.save(entry) } }

    fun saveCategory(category: CategoryEntity) {
        viewModelScope.launch { container.database.categoryDao().upsert(category) }
    }
    fun deleteCategory(id: String) {
        viewModelScope.launch { container.database.categoryDao().delete(id) }
    }

    fun updateSettings(block: suspend (Settings) -> Settings) {
        viewModelScope.launch {
            settingsRepo.update(block)
            container.startupSync()
        }
    }

    /** TEST PRZYPOMNIENIA: za 1 i za 5 minut. */
    fun scheduleTestReminders() {
        viewModelScope.launch {
            val now = System.currentTimeMillis()
            repo.add("TEST przypomnienia (1 min)", pl.myslnik.domain.EntryType.TASK, now + 60_000, priority = 1)
            repo.add("TEST przypomnienia PILNY (5 min)", pl.myslnik.domain.EntryType.TASK, now + 300_000, priority = 2)
        }
    }

    class Factory(private val container: AppContainer) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T = AppViewModel(container) as T
    }
}

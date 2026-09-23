package pl.myslnik.ui

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Inbox
import androidx.compose.material.icons.filled.Lightbulb
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Today
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.SnackbarResult
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import kotlinx.coroutines.runBlocking
import pl.myslnik.MyslnikApp
import pl.myslnik.ui.screens.DetailScreen
import pl.myslnik.ui.screens.EntryListScreen
import pl.myslnik.ui.screens.ListKind
import pl.myslnik.ui.screens.ReliabilityScreen
import pl.myslnik.ui.screens.ReviewScreen
import pl.myslnik.ui.screens.SearchScreen
import pl.myslnik.ui.screens.SettingsScreen
import pl.myslnik.ui.theme.MyslnikTheme

class MainActivity : ComponentActivity() {

    private val viewModel: AppViewModel by viewModels {
        AppViewModel.Factory(MyslnikApp.container(this))
    }

    @OptIn(ExperimentalMaterial3Api::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val container = MyslnikApp.container(this)
        val onboardingDone = runBlocking { container.settingsRepo.current().onboardingDone }

        val startRoute = when {
            !onboardingDone -> "reliability"
            intent?.action == "pl.myslnik.ACTION_REVIEW" -> "review"
            intent?.action == "pl.myslnik.OPEN_DETAIL" -> null // obsłużone niżej
            else -> "today"
        }
        val openDetailId = if (intent?.action == "pl.myslnik.OPEN_DETAIL")
            intent.getStringExtra("entryId") else null

        setContent {
            MyslnikTheme {
                val navController = rememberNavController()
                val snackbarHostState = remember { SnackbarHostState() }
                val undoLabel by viewModel.lastActionLabel.collectAsState()
                val inboxCount by viewModel.inboxCount.collectAsStateWithLifecycle()

                LaunchedEffect(openDetailId) {
                    if (openDetailId != null) navController.navigate("detail/$openDetailId")
                }
                LaunchedEffect(undoLabel) {
                    val label = undoLabel ?: return@LaunchedEffect
                    val result = snackbarHostState.showSnackbar(label, actionLabel = "Cofnij", withDismissAction = true)
                    if (result == SnackbarResult.ActionPerformed) viewModel.undo() else viewModel.dismissUndo()
                }

                val backStack by navController.currentBackStackEntryAsState()
                val currentRoute = backStack?.destination?.route

                val tabs = listOf(
                    Triple("inbox", "Skrzynka", Icons.Default.Inbox),
                    Triple("today", "Dziś", Icons.Default.Today),
                    Triple("planned", "Plan", Icons.Default.DateRange),
                    Triple("thoughts", "Myśli", Icons.Default.Lightbulb),
                    Triple("doneList", "Zrobione", Icons.Default.CheckCircle),
                )
                val showBars = currentRoute in tabs.map { it.first }

                Scaffold(
                    snackbarHost = { SnackbarHost(snackbarHostState) },
                    topBar = {
                        if (showBars) TopAppBar(
                            title = { Text("Myślnik") },
                            actions = {
                                IconButton(onClick = { navController.navigate("review") }) {
                                    Icon(Icons.AutoMirrored.Filled.List, contentDescription = "Przegląd")
                                }
                                IconButton(onClick = { navController.navigate("search") }) {
                                    Icon(Icons.Default.Search, contentDescription = "Szukaj")
                                }
                                IconButton(onClick = { navController.navigate("settings") }) {
                                    Icon(Icons.Default.Settings, contentDescription = "Ustawienia")
                                }
                            }
                        )
                    },
                    bottomBar = {
                        if (showBars) NavigationBar {
                            tabs.forEach { (route, label, icon) ->
                                NavigationBarItem(
                                    selected = currentRoute == route,
                                    onClick = {
                                        navController.navigate(route) {
                                            popUpTo("today") { saveState = true }
                                            launchSingleTop = true
                                            restoreState = true
                                        }
                                    },
                                    icon = {
                                        if (route == "inbox" && inboxCount > 0) {
                                            BadgedBox(badge = { Badge { Text("$inboxCount") } }) {
                                                Icon(icon, contentDescription = label)
                                            }
                                        } else Icon(icon, contentDescription = label)
                                    },
                                    label = { Text(label) }
                                )
                            }
                        }
                    },
                    floatingActionButton = {
                        if (showBars) FloatingActionButton(onClick = {
                            startActivity(Intent(this, QuickAddActivity::class.java))
                        }) { Icon(Icons.Default.Add, contentDescription = "Dodaj") }
                    }
                ) { padding ->
                    NavHost(
                        navController = navController,
                        startDestination = startRoute ?: "today",
                        modifier = Modifier.padding(padding)
                    ) {
                        composable("inbox") {
                            EntryListScreen(viewModel, ListKind.INBOX) { navController.navigate("detail/$it") }
                        }
                        composable("today") {
                            EntryListScreen(viewModel, ListKind.TODAY) { navController.navigate("detail/$it") }
                        }
                        composable("planned") {
                            EntryListScreen(viewModel, ListKind.PLANNED) { navController.navigate("detail/$it") }
                        }
                        composable("thoughts") {
                            EntryListScreen(viewModel, ListKind.THOUGHTS) { navController.navigate("detail/$it") }
                        }
                        composable("doneList") {
                            EntryListScreen(viewModel, ListKind.DONE) { navController.navigate("detail/$it") }
                        }
                        composable("search") {
                            SearchScreen(viewModel,
                                onOpen = { navController.navigate("detail/$it") },
                                onBack = { navController.popBackStack() })
                        }
                        composable("detail/{id}") { entry ->
                            DetailScreen(
                                viewModel,
                                entryId = entry.arguments?.getString("id").orEmpty(),
                                onBack = { navController.popBackStack() }
                            )
                        }
                        composable("review") {
                            ReviewScreen(viewModel, onBack = { navController.popBackStack() })
                        }
                        composable("settings") {
                            SettingsScreen(
                                viewModel,
                                onBack = { navController.popBackStack() },
                                onOpenReliability = { navController.navigate("reliability") }
                            )
                        }
                        composable("reliability") {
                            ReliabilityScreen(viewModel, onDone = {
                                viewModel.updateSettings { it.copy(onboardingDone = true) }
                                navController.navigate("today") { popUpTo(0) }
                            })
                        }
                    }
                }
            }
        }
    }
}

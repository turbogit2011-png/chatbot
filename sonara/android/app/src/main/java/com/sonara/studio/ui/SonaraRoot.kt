package com.sonara.studio.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.calculateEndPadding
import androidx.compose.foundation.layout.calculateStartPadding
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.LibraryMusic
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.sonara.studio.di.ServiceLocator
import com.sonara.studio.ui.create.CreateScreen
import com.sonara.studio.ui.create.CreateViewModel
import com.sonara.studio.ui.library.LibraryScreen
import com.sonara.studio.ui.library.LibraryViewModel
import com.sonara.studio.ui.onboarding.OnboardingScreen
import com.sonara.studio.ui.player.MiniPlayer
import com.sonara.studio.ui.player.SongScreen
import com.sonara.studio.ui.player.SongViewModel
import com.sonara.studio.ui.settings.SettingsScreen
import com.sonara.studio.ui.settings.SettingsViewModel
import kotlinx.coroutines.launch

object Routes {
    const val CREATE = "create"
    const val LIBRARY = "library"
    const val SETTINGS = "settings"
    const val SONG = "song"
    fun song(id: String) = "$SONG/$id"
}

private data class Tab(val route: String, val label: String, val icon: ImageVector)

@Composable
fun SonaraRoot(startOnboarding: Boolean) {
    val context = LocalContext.current
    val navController = rememberNavController()
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val player = remember { ServiceLocator.playerController(context) }
    val playbackState by player.state.collectAsState()
    var onboarding by remember { mutableStateOf(startOnboarding) }

    val settingsViewModel: SettingsViewModel = viewModel(factory = SettingsViewModel.factory(context))

    if (onboarding) {
        OnboardingScreen(viewModel = settingsViewModel, onDone = { onboarding = false })
        return
    }

    val tabs = remember {
        listOf(
            Tab(Routes.CREATE, "Create", Icons.Filled.AutoAwesome),
            Tab(Routes.LIBRARY, "Library", Icons.Filled.LibraryMusic),
            Tab(Routes.SETTINGS, "Settings", Icons.Filled.Settings),
        )
    }
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route

    val notify: (String) -> Unit = { message ->
        scope.launch { snackbarHostState.showSnackbar(message) }
    }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        snackbarHost = { SnackbarHost(snackbarHostState) },
        bottomBar = {
            Surface(color = MaterialTheme.colorScheme.surfaceContainer) {
                Column {
                    if (playbackState.currentId != null) {
                        Spacer(Modifier.height(8.dp))
                        MiniPlayer(
                            state = playbackState,
                            onOpen = {
                                playbackState.currentId?.let { navController.navigate(Routes.song(it)) }
                            },
                            onPlayPause = player::togglePlayPause,
                            onNext = player::next,
                        )
                        Spacer(Modifier.height(4.dp))
                    }
                    NavigationBar(containerColor = MaterialTheme.colorScheme.surfaceContainer) {
                        tabs.forEach { tab ->
                            val selected = currentRoute?.startsWith(tab.route) == true
                            NavigationBarItem(
                                selected = selected,
                                onClick = { navigateTab(navController, tab.route) },
                                icon = { Icon(tab.icon, tab.label) },
                                label = { Text(tab.label) },
                            )
                        }
                    }
                }
            }
        },
    ) { scaffoldPadding ->
        val layoutDirection = LocalLayoutDirection.current
        val innerPadding = PaddingValues(
            start = scaffoldPadding.calculateStartPadding(layoutDirection) + 16.dp,
            end = scaffoldPadding.calculateEndPadding(layoutDirection) + 16.dp,
            top = scaffoldPadding.calculateTopPadding() + 12.dp,
            bottom = scaffoldPadding.calculateBottomPadding() + 12.dp,
        )
        NavHost(
            navController = navController,
            startDestination = Routes.CREATE,
            modifier = Modifier.fillMaxSize(),
        ) {
            composable(Routes.CREATE) {
                val vm: CreateViewModel = viewModel(factory = CreateViewModel.factory(context))
                CreateScreen(
                    viewModel = vm,
                    contentPadding = innerPadding,
                    onOpenJob = { navigateTab(navController, Routes.LIBRARY) },
                    onMessage = notify,
                )
            }
            composable(Routes.LIBRARY) {
                val vm: LibraryViewModel = viewModel(factory = LibraryViewModel.factory(context))
                LibraryScreen(
                    viewModel = vm,
                    contentPadding = innerPadding,
                    onOpenSong = { id -> navController.navigate(Routes.song(id)) },
                    onCreate = { navigateTab(navController, Routes.CREATE) },
                    onMessage = notify,
                )
            }
            composable(Routes.SETTINGS) {
                SettingsScreen(
                    viewModel = settingsViewModel,
                    contentPadding = innerPadding,
                    onMessage = notify,
                )
            }
            composable("${Routes.SONG}/{songId}") { entry ->
                val songId = entry.arguments?.getString("songId").orEmpty()
                val vm: SongViewModel = viewModel(
                    key = "song-$songId",
                    factory = SongViewModel.factory(context, songId),
                )
                SongScreen(
                    viewModel = vm,
                    contentPadding = innerPadding,
                    onBack = {
                        if (!navController.popBackStack()) navigateTab(navController, Routes.LIBRARY)
                    },
                    onMessage = notify,
                )
            }
        }
    }
}

private fun navigateTab(navController: NavHostController, route: String) {
    navController.navigate(route) {
        popUpTo(navController.graph.startDestinationId) { saveState = true }
        launchSingleTop = true
        restoreState = true
    }
}

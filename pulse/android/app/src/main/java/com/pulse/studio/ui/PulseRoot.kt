package com.pulse.studio.ui

import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.calculateEndPadding
import androidx.compose.foundation.layout.calculateStartPadding
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.MovieCreation
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.VideoLibrary
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
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
import com.pulse.studio.ui.create.CreateScreen
import com.pulse.studio.ui.create.CreateViewModel
import com.pulse.studio.ui.library.LibraryScreen
import com.pulse.studio.ui.library.LibraryViewModel
import com.pulse.studio.ui.player.ClipScreen
import com.pulse.studio.ui.player.ClipViewModel
import com.pulse.studio.ui.settings.SettingsScreen
import com.pulse.studio.ui.settings.SettingsViewModel
import kotlinx.coroutines.launch

object Routes {
    const val CREATE = "create"
    const val LIBRARY = "library"
    const val SETTINGS = "settings"
    const val CLIP = "clip"
    fun clip(id: String) = "$CLIP/$id"
}

private data class Tab(val route: String, val label: String, val icon: ImageVector)

@Composable
fun PulseRoot() {
    val context = LocalContext.current
    val navController = rememberNavController()
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    val tabs = remember {
        listOf(
            Tab(Routes.CREATE, "Create", Icons.Filled.MovieCreation),
            Tab(Routes.LIBRARY, "Clips", Icons.Filled.VideoLibrary),
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
            NavigationBar(containerColor = MaterialTheme.colorScheme.surfaceContainer) {
                tabs.forEach { tab ->
                    NavigationBarItem(
                        selected = currentRoute?.startsWith(tab.route) == true,
                        onClick = { navigateTab(navController, tab.route) },
                        icon = { Icon(tab.icon, tab.label) },
                        label = { Text(tab.label) },
                    )
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
                    onOpenLibrary = { navigateTab(navController, Routes.LIBRARY) },
                    onMessage = notify,
                )
            }
            composable(Routes.LIBRARY) {
                val vm: LibraryViewModel = viewModel(factory = LibraryViewModel.factory(context))
                LibraryScreen(
                    viewModel = vm,
                    contentPadding = innerPadding,
                    onOpenClip = { id -> navController.navigate(Routes.clip(id)) },
                    onCreate = { navigateTab(navController, Routes.CREATE) },
                )
            }
            composable(Routes.SETTINGS) {
                val vm: SettingsViewModel = viewModel(factory = SettingsViewModel.factory(context))
                SettingsScreen(viewModel = vm, contentPadding = innerPadding)
            }
            composable("${Routes.CLIP}/{clipId}") { entry ->
                val clipId = entry.arguments?.getString("clipId").orEmpty()
                val vm: ClipViewModel = viewModel(
                    key = "clip-$clipId",
                    factory = ClipViewModel.factory(context, clipId),
                )
                ClipScreen(
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

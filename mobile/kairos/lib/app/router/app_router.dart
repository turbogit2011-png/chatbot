import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/home/presentation/pages/home_page.dart';
import '../../features/insights/presentation/pages/insights_page.dart';
import '../../features/onboarding/presentation/pages/onboarding_page.dart';
import '../../features/settings/domain/entities/app_settings.dart';
import '../../features/settings/presentation/pages/settings_page.dart';
import '../../features/settings/presentation/providers/settings_providers.dart';

/// Trasy aplikacji. Płaska struktura — cztery ekrany, żadnych zagnieżdżeń.
enum AppRoute {
  onboarding('/onboarding'),
  home('/'),
  insights('/insights'),
  settings('/settings');

  const AppRoute(this.path);

  final String path;
}

/// Nawigacja jako jedno API — ekrany nie znają ścieżek jako stringów.
abstract final class AppRouter {
  static void goHome(BuildContext context) => context.go(AppRoute.home.path);

  static void goInsights(BuildContext context) =>
      context.push(AppRoute.insights.path);

  static void goSettings(BuildContext context) =>
      context.push(AppRoute.settings.path);

  static void goOnboarding(BuildContext context) =>
      context.go(AppRoute.onboarding.path);
}

final Provider<GoRouter> goRouterProvider = Provider<GoRouter>((Ref ref) {
  return GoRouter(
    initialLocation: AppRoute.home.path,
    routes: <RouteBase>[
      GoRoute(
        path: AppRoute.home.path,
        builder: (BuildContext context, GoRouterState state) => const HomePage(),
      ),
      GoRoute(
        path: AppRoute.onboarding.path,
        builder: (BuildContext context, GoRouterState state) =>
            const OnboardingPage(),
      ),
      GoRoute(
        path: AppRoute.insights.path,
        builder: (BuildContext context, GoRouterState state) =>
            const InsightsPage(),
      ),
      GoRoute(
        path: AppRoute.settings.path,
        builder: (BuildContext context, GoRouterState state) =>
            const SettingsPage(),
      ),
    ],
    redirect: (BuildContext context, GoRouterState state) {
      final AppSettings settings = ref.read(settingsProvider);
      final bool onOnboarding =
          state.matchedLocation == AppRoute.onboarding.path;

      if (!settings.onboardingCompleted && !onOnboarding) {
        return AppRoute.onboarding.path;
      }
      if (settings.onboardingCompleted && onOnboarding) {
        return AppRoute.home.path;
      }
      return null;
    },
  );
});

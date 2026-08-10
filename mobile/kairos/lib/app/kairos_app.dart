import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/theme/app_theme.dart';
import '../features/settings/presentation/providers/settings_providers.dart';
import 'di.dart';
import 'router/app_router.dart';

/// Korzeń aplikacji.
///
/// Inicjalizacja silnika dzieje się tutaj (a nie w `main`), bo dopiero na tym
/// poziomie istnieje kontener Riverpoda. Sam nasłuch czujników pozostaje
/// wyłączony do czasu decyzji użytkownika.
class KairosApp extends ConsumerStatefulWidget {
  const KairosApp({super.key});

  @override
  ConsumerState<KairosApp> createState() => _KairosAppState();
}

class _KairosAppState extends ConsumerState<KairosApp> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      // Wynik celowo ignorowany: błąd inicjalizacji pokaże się na ekranie
      // głównym przy pierwszej próbie uruchomienia nasłuchu.
      unawaited(ref.read(kairosEngineProvider).initialize());
    });
  }

  @override
  Widget build(BuildContext context) {
    final GoRouter router = ref.watch(goRouterProvider);

    return MaterialApp.router(
      title: 'Kairos',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: ref.watch(themeModeProvider),
      routerConfig: router,
      builder: (BuildContext context, Widget? child) {
        // Skala tekstu z systemu jest respektowana, ale ograniczona — powyżej
        // 1.4 układ pierścienia przestaje się mieścić na małych ekranach.
        final MediaQueryData media = MediaQuery.of(context);
        return MediaQuery(
          data: media.copyWith(
            textScaler: media.textScaler.clamp(
              minScaleFactor: 0.9,
              maxScaleFactor: 1.4,
            ),
          ),
          child: child ?? const SizedBox.shrink(),
        );
      },
    );
  }
}

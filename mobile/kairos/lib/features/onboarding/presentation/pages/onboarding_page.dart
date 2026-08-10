import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../app/di.dart';
import '../../../../app/router/app_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_motion.dart';
import '../../../../core/widgets/aurora_background.dart';
import '../../../../core/widgets/glass_card.dart';
import '../../../intervention/domain/entities/intention.dart';
import '../../../intervention/presentation/providers/intervention_providers.dart';
import '../../../settings/presentation/providers/settings_providers.dart';

/// Trzy ekrany wejścia: obietnica prywatności, zgody, pierwszy zamiar.
///
/// Kolejność jest celowa — najpierw mówimy, czego **nie** robimy, a dopiero
/// potem o cokolwiek prosimy.
class OnboardingPage extends ConsumerStatefulWidget {
  const OnboardingPage({super.key});

  @override
  ConsumerState<OnboardingPage> createState() => _OnboardingPageState();
}

class _OnboardingPageState extends ConsumerState<OnboardingPage> {
  final PageController _controller = PageController();
  final TextEditingController _intentionController = TextEditingController();

  int _page = 0;
  bool _busy = false;
  String? _intentionError;

  @override
  void dispose() {
    _controller.dispose();
    _intentionController.dispose();
    super.dispose();
  }

  Future<void> _next() async {
    if (_page < 2) {
      await _controller.nextPage(
        duration: const Duration(milliseconds: 380),
        curve: Curves.easeOutCubic,
      );
      return;
    }
    await _finish();
  }

  Future<void> _requestNotifications() async {
    setState(() => _busy = true);
    await ref.read(notificationDataSourceProvider).ensurePermission();
    if (mounted) {
      setState(() => _busy = false);
    }
    await _next();
  }

  Future<void> _finish() async {
    final String text = _intentionController.text.trim();
    setState(() {
      _busy = true;
      _intentionError = null;
    });

    if (text.isNotEmpty) {
      final String? error = await ref
          .read(intentionProvider.notifier)
          .setIntention(text);
      if (error != null) {
        if (mounted) {
          setState(() {
            _busy = false;
            _intentionError = error;
          });
        }
        return;
      }
    }

    await ref.read(settingsProvider.notifier).completeOnboarding();
    if (mounted) {
      AppRouter.goHome(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    final KairosPalette palette = context.palette;

    return Scaffold(
      body: AuroraBackground(
        tone: palette.auroraStart,
        child: SafeArea(
          child: Column(
            children: <Widget>[
              Expanded(
                child: PageView(
                  controller: _controller,
                  onPageChanged: (int index) => setState(() => _page = index),
                  children: <Widget>[
                    const _PrivacySlide(),
                    _PermissionsSlide(
                      busy: _busy,
                      onGrant: _requestNotifications,
                      onSkip: _next,
                    ),
                    _IntentionSlide(
                      controller: _intentionController,
                      error: _intentionError,
                    ),
                  ],
                ),
              ),
              _Footer(
                page: _page,
                busy: _busy,
                onNext: _next,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PrivacySlide extends StatelessWidget {
  const _PrivacySlide();

  @override
  Widget build(BuildContext context) {
    final TextTheme text = Theme.of(context).textTheme;

    return _SlideLayout(
      title: 'Kairos nie liczy czasu przed ekranem',
      children: <Widget>[
        Text(
          'Rozpoznaje moment, w którym uwaga zaczyna odpływać, i mówi jedno '
          'zdanie — zanim sięgniesz po rozpraszacz.',
          style: text.bodyLarge,
        ),
        const SizedBox(height: AppGeometry.spaceLg),
        const GlassCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              _Promise(
                icon: Icons.cloud_off_rounded,
                text: 'Brak serwera, konta i synchronizacji.',
              ),
              _Promise(
                icon: Icons.mic_off_rounded,
                text: 'Zero dostępu do mikrofonu, kamery i lokalizacji.',
              ),
              _Promise(
                icon: Icons.storage_rounded,
                text: 'Odczyty i model żyją wyłącznie na tym urządzeniu.',
              ),
              _Promise(
                icon: Icons.delete_outline_rounded,
                text: 'Wszystko kasujesz jednym przyciskiem w ustawieniach.',
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _Promise extends StatelessWidget {
  const _Promise({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppGeometry.spaceSm),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Icon(icon, size: 18, color: context.palette.deepFocus),
          const SizedBox(width: AppGeometry.spaceSm),
          Expanded(
            child: Text(text, style: Theme.of(context).textTheme.bodyMedium),
          ),
        ],
      ),
    );
  }
}

class _PermissionsSlide extends StatelessWidget {
  const _PermissionsSlide({
    required this.busy,
    required this.onGrant,
    required this.onSkip,
  });

  final bool busy;
  final VoidCallback onGrant;
  final VoidCallback onSkip;

  @override
  Widget build(BuildContext context) {
    final TextTheme text = Theme.of(context).textTheme;

    return _SlideLayout(
      title: 'Jedna zgoda, jeden powód',
      children: <Widget>[
        Text(
          'Powiadomienia są potrzebne tylko po to, żeby doręczyć Ci jedno '
          'zdanie, gdy nie patrzysz w aplikację. Są ciche: bez dźwięku, '
          'bez wibracji, bez znaczka na ikonie.',
          style: text.bodyLarge,
        ),
        const SizedBox(height: AppGeometry.spaceLg),
        FilledButton.icon(
          onPressed: busy ? null : onGrant,
          icon: const Icon(Icons.notifications_active_outlined, size: 18),
          label: const Text('Pozwól na powiadomienia'),
        ),
        const SizedBox(height: AppGeometry.spaceXs),
        TextButton(
          onPressed: busy ? null : onSkip,
          child: const Text('Pomiń — wystarczy mi widok w aplikacji'),
        ),
        const SizedBox(height: AppGeometry.spaceLg),
        Text(
          'Czujniki ruchu nie wymagają na Androidzie żadnej zgody. Krokomierz '
          'jest opcjonalny — bez niego działa wszystko poza wykrywaniem '
          'regeneracji.',
          style: text.bodySmall,
        ),
      ],
    );
  }
}

class _IntentionSlide extends StatelessWidget {
  const _IntentionSlide({required this.controller, required this.error});

  final TextEditingController controller;
  final String? error;

  @override
  Widget build(BuildContext context) {
    final TextTheme text = Theme.of(context).textTheme;

    return _SlideLayout(
      title: 'Nad czym dziś zostajesz?',
      children: <Widget>[
        Text(
          'Jedno zdanie. Kairos użyje go w wiadomości, żeby brzmiała jak Twoja '
          'własna myśl, a nie jak powiadomienie z aplikacji.',
          style: text.bodyLarge,
        ),
        const SizedBox(height: AppGeometry.spaceLg),
        TextField(
          controller: controller,
          maxLength: Intention.maxLength,
          textCapitalization: TextCapitalization.sentences,
          decoration: const InputDecoration(
            hintText: 'np. kończę rozdział 3',
            counterText: '',
          ),
        ),
        if (error != null) ...<Widget>[
          const SizedBox(height: AppGeometry.spaceXs),
          Text(
            error!,
            style: text.bodySmall?.copyWith(color: context.palette.danger),
          ),
        ],
        const SizedBox(height: AppGeometry.spaceXs),
        Text('Możesz to pominąć i dodać później.', style: text.labelSmall),
      ],
    );
  }
}

class _SlideLayout extends StatelessWidget {
  const _SlideLayout({required this.title, required this.children});

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppGeometry.spaceLg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          const SizedBox(height: AppGeometry.spaceXl),
          Text(title, style: Theme.of(context).textTheme.displaySmall),
          const SizedBox(height: AppGeometry.spaceLg),
          ...children,
        ],
      ),
    );
  }
}

class _Footer extends StatelessWidget {
  const _Footer({required this.page, required this.busy, required this.onNext});

  final int page;
  final bool busy;
  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) {
    final KairosPalette palette = context.palette;

    return Padding(
      padding: const EdgeInsets.all(AppGeometry.spaceLg),
      child: Row(
        children: <Widget>[
          Row(
            children: List<Widget>.generate(3, (int index) {
              final bool active = index == page;
              return AnimatedContainer(
                duration: const Duration(milliseconds: 240),
                margin: const EdgeInsets.only(right: 6),
                width: active ? 20 : 6,
                height: 6,
                decoration: BoxDecoration(
                  color: active ? palette.deepFocus : palette.hairline,
                  borderRadius: BorderRadius.circular(3),
                ),
              );
            }),
          ),
          const Spacer(),
          FilledButton(
            onPressed: busy ? null : onNext,
            child: Text(page == 2 ? 'Zaczynamy' : 'Dalej'),
          ),
        ],
      ),
    );
  }
}

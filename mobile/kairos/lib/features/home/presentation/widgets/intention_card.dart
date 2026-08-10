import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_motion.dart';
import '../../../../core/widgets/glass_card.dart';
import '../../../../core/widgets/status_views.dart';
import '../../../intervention/domain/entities/intention.dart';
import '../../../intervention/presentation/providers/intervention_providers.dart';

/// Karta zamiaru: jedno zdanie o tym, nad czym użytkownik chce zostać.
///
/// To jedyne pole tekstowe w całej aplikacji — i jednocześnie najważniejsze
/// wejście do generatora interwencji.
class IntentionCard extends ConsumerWidget {
  const IntentionCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final KairosPalette palette = context.palette;
    final TextTheme text = Theme.of(context).textTheme;
    final AsyncValue<Intention?> intention = ref.watch(intentionProvider);

    return GlassCard(
      onTap: () => IntentionEditor.show(context),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Icon(Icons.flag_outlined, size: 18, color: palette.textTertiary),
          const SizedBox(width: AppGeometry.spaceSm),
          Expanded(
            child: intention.when(
              loading: () => const ShimmerBox(height: 18, width: 180),
              error: (Object error, StackTrace stackTrace) => Text(
                'Nie udało się odczytać zamiaru.',
                style: text.bodySmall?.copyWith(color: palette.danger),
              ),
              data: (Intention? value) => Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    value == null ? 'Nad czym dziś zostajesz?' : value.text,
                    style: value == null
                        ? text.bodyMedium?.copyWith(color: palette.textTertiary)
                        : text.titleMedium,
                  ),
                  const SizedBox(height: AppGeometry.spaceXxs),
                  Text(
                    value == null
                        ? 'Bez zamiaru interwencje będą ogólne.'
                        : 'Dotknij, aby zmienić',
                    style: text.labelSmall,
                  ),
                ],
              ),
            ),
          ),
          Icon(
            Icons.chevron_right_rounded,
            size: 20,
            color: palette.textTertiary,
          ),
        ],
      ),
    );
  }
}

/// Arkusz edycji zamiaru z walidacją na żywo.
class IntentionEditor extends ConsumerStatefulWidget {
  const IntentionEditor({super.key});

  static Future<void> show(BuildContext context) => showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (BuildContext context) => const IntentionEditor(),
  );

  @override
  ConsumerState<IntentionEditor> createState() => _IntentionEditorState();
}

class _IntentionEditorState extends ConsumerState<IntentionEditor> {
  late final TextEditingController _controller = TextEditingController(
    text: ref.read(intentionProvider).valueOrNull?.text ?? '',
  );
  final FocusNode _focusNode = FocusNode();

  String? _error;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _focusNode.requestFocus());
  }

  @override
  void dispose() {
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() {
      _saving = true;
      _error = null;
    });

    final String? error = await ref
        .read(intentionProvider.notifier)
        .setIntention(_controller.text);

    if (!mounted) {
      return;
    }
    if (error != null) {
      setState(() {
        _saving = false;
        _error = error;
      });
      return;
    }
    Navigator.of(context).pop();
  }

  Future<void> _clear() async {
    setState(() => _saving = true);
    await ref.read(intentionProvider.notifier).clear();
    if (mounted) {
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final TextTheme text = Theme.of(context).textTheme;
    final bool hasIntention = ref.watch(intentionProvider).valueOrNull != null;

    return Padding(
      padding: EdgeInsets.fromLTRB(
        AppGeometry.spaceLg,
        AppGeometry.spaceXs,
        AppGeometry.spaceLg,
        MediaQuery.viewInsetsOf(context).bottom + AppGeometry.spaceLg,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text('Twój zamiar', style: text.headlineSmall),
          const SizedBox(height: AppGeometry.spaceXxs),
          Text(
            'Jedno zdanie, konkretnie. Kairos użyje go w wiadomości, '
            'kiedy uwaga zacznie odpływać.',
            style: text.bodySmall,
          ),
          const SizedBox(height: AppGeometry.spaceLg),
          TextField(
            controller: _controller,
            focusNode: _focusNode,
            maxLength: Intention.maxLength,
            textInputAction: TextInputAction.done,
            textCapitalization: TextCapitalization.sentences,
            onSubmitted: (_) => _save(),
            decoration: const InputDecoration(
              hintText: 'np. kończę rozdział 3',
              counterText: '',
            ),
          ),
          if (_error != null) ...<Widget>[
            const SizedBox(height: AppGeometry.spaceXs),
            Text(
              _error!,
              style: text.bodySmall?.copyWith(color: context.palette.danger),
            ),
          ],
          const SizedBox(height: AppGeometry.spaceLg),
          Row(
            children: <Widget>[
              if (hasIntention)
                TextButton(
                  onPressed: _saving ? null : _clear,
                  child: const Text('Usuń'),
                ),
              const Spacer(),
              FilledButton(
                onPressed: _saving ? null : _save,
                child: _saving
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Zapisz'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

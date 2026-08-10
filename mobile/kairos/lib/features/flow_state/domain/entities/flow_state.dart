/// Sześć stanów poznawczych rozpoznawanych przez Kairos.
///
/// Kolejność wartości jest kontraktem z modelem (indeks = klasa w softmaksie),
/// więc **nie wolno jej zmieniać** bez podniesienia wersji schematu cech.
enum FlowState {
  deepFocus(
    id: 'deep_focus',
    label: 'Głębokie skupienie',
    shortLabel: 'Skupienie',
    description: 'Długie okno bez przerwań. Kairos milczy i pilnuje spokoju.',
    isProtected: true,
  ),
  flow(
    id: 'flow',
    label: 'Płynna praca',
    shortLabel: 'Płynność',
    description: 'Stabilny rytm pracy. Nic nie wymaga reakcji.',
    isProtected: true,
  ),
  drift(
    id: 'drift',
    label: 'Dryf uwagi',
    shortLabel: 'Dryf',
    description: 'Uwaga zaczyna się rozjeżdżać — to moment na jedno zdanie.',
    isInterruptible: true,
  ),
  restless(
    id: 'restless',
    label: 'Rozbieganie',
    shortLabel: 'Niepokój',
    description: 'Dużo mikroruchów i szarpnięć. Ciało prosi o zmianę pozycji.',
    isInterruptible: true,
  ),
  fatigue(
    id: 'fatigue',
    label: 'Zmęczenie',
    shortLabel: 'Zmęczenie',
    description: 'Długa sesja i spadek tempa. Przerwa zwróci się z nawiązką.',
    isInterruptible: true,
  ),
  recovery(
    id: 'recovery',
    label: 'Regeneracja',
    shortLabel: 'Regeneracja',
    description: 'Ruch i odejście od ekranu. Dokładnie tak ma być.',
  );

  const FlowState({
    required this.id,
    required this.label,
    required this.shortLabel,
    required this.description,
    this.isProtected = false,
    this.isInterruptible = false,
  });

  /// Stabilny identyfikator używany w bazie danych i eksporcie.
  final String id;

  final String label;
  final String shortLabel;
  final String description;

  /// Stan, którego pod żadnym pozorem nie przerywamy.
  final bool isProtected;

  /// Stan, w którym interwencja w ogóle wchodzi w grę (o tym, czy faktycznie
  /// nastąpi, decyduje `InterventionPolicy`).
  final bool isInterruptible;

  static FlowState fromId(String id) => FlowState.values.firstWhere(
    (FlowState state) => state.id == id,
    orElse: () => FlowState.flow,
  );
}

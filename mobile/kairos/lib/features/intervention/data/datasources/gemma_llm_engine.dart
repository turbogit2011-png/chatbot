import 'dart:async';
import 'dart:io';

import 'package:flutter/services.dart' show rootBundle;
import 'package:flutter_gemma/flutter_gemma.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

import '../../../../core/error/failure.dart';
import '../../../../core/logging/app_logger.dart';
import '../../../../core/time/pl_format.dart';
import '../../domain/entities/intervention.dart';
import 'intervention_engine.dart';

/// Adapter lokalnego modelu językowego (MediaPipe LLM Inference przez
/// `flutter_gemma`).
///
/// ────────────────────────────────────────────────────────────────────────
/// JEDYNY plik w projekcie zależny od API pluginu LLM. Jeśli rozwiązana wersja
/// `flutter_gemma` ma inny kształt API, to jest jedyne miejsce do dostosowania.
/// Usunięcie tego pliku i jednej linii w `lib/app/di.dart` (rejestracja
/// `GemmaLlmEngine`) zostawia w pełni działającą aplikację na
/// `CompositionEngine` — model jest ulepszeniem, nie warunkiem działania.
/// ────────────────────────────────────────────────────────────────────────
class GemmaLlmEngine implements InterventionEngine {
  GemmaLlmEngine({
    this.modelFileName = 'gemma3-1b-it-int4.task',
    this.maxTokens = 512,
    this.temperature = 0.9,
    this.topK = 40,
    this.timeout = const Duration(seconds: 20),
  });

  /// Nazwa pliku wag oczekiwana w katalogu dokumentów aplikacji.
  /// Model instaluje użytkownik świadomie (patrz DEPLOYMENT.md).
  final String modelFileName;

  final int maxTokens;
  final double temperature;
  final int topK;
  final Duration timeout;

  static const AppLogger _log = AppLogger('gemma');
  static const String _systemPromptAsset =
      'assets/prompts/intervention_system_pl.txt';

  InferenceModel? _model;
  String? _systemPrompt;
  bool _unavailable = false;

  @override
  InterventionSource get source => InterventionSource.localModel;

  /// Ścieżka, pod którą aplikacja szuka wag.
  Future<String> modelPath() async {
    final Directory directory = await getApplicationDocumentsDirectory();
    return p.join(directory.path, modelFileName);
  }

  /// Czy plik wag w ogóle jest na urządzeniu.
  Future<bool> isInstalled() async {
    try {
      return File(await modelPath()).existsSync();
    } on Object catch (error) {
      _log.warning('Nie udało się sprawdzić pliku modelu', error);
      return false;
    }
  }

  @override
  Future<bool> isAvailable() async {
    if (_unavailable) {
      return false;
    }
    if (_model != null) {
      return true;
    }
    return isInstalled();
  }

  @override
  Future<String> compose(InterventionRequest request) async {
    final InferenceModel model = await _ensureModel();
    final InferenceModelSession session = await model.createSession(
      temperature: temperature,
      randomSeed: request.at.millisecondsSinceEpoch % 100000,
      topK: topK,
    );

    try {
      await session.addQueryChunk(
        Message.text(text: await _buildPrompt(request), isUser: true),
      );
      final String response = await session.getResponse().timeout(timeout);
      final String sentence = InterventionText.sanitize(response);

      if (!InterventionText.isAcceptable(sentence)) {
        throw const ModelFailure(
          message: 'Model wygenerował zdanie niezgodne z zasadami tonu.',
        );
      }
      return sentence;
    } finally {
      await session.close();
    }
  }

  @override
  Future<void> dispose() async {
    final InferenceModel? model = _model;
    _model = null;
    if (model != null) {
      await model.close();
      _log.info('Zwolniono model lokalny');
    }
  }

  // ── Wewnętrzne ───────────────────────────────────────────────────────────

  Future<InferenceModel> _ensureModel() async {
    final InferenceModel? existing = _model;
    if (existing != null) {
      return existing;
    }

    final String path = await modelPath();
    if (!File(path).existsSync()) {
      _unavailable = true;
      throw ModelFailure(
        message:
            'Nie znalazłem wag modelu. Wgraj plik $modelFileName albo zostaw '
            'silnik kompozycyjny — działa bez pobierania czegokolwiek.',
      );
    }

    try {
      final FlutterGemmaPlugin plugin = FlutterGemmaPlugin.instance;
      await plugin.modelManager.setModelPath(path);

      final InferenceModel model = await plugin.createModel(
        modelType: ModelType.gemmaIt,
        maxTokens: maxTokens,
        preferredBackend: PreferredBackend.gpu,
      );
      _model = model;
      _log.info('Model lokalny gotowy ($modelFileName)');
      return model;
    } on Object catch (error, stackTrace) {
      _unavailable = true;
      _log.error('Nie udało się załadować modelu', error, stackTrace);
      throw ModelFailure(
        message: 'Nie udało się uruchomić modelu na tym urządzeniu.',
        cause: error,
        stackTrace: stackTrace,
      );
    }
  }

  Future<String> _buildPrompt(InterventionRequest request) async {
    final String system = _systemPrompt ??= await rootBundle.loadString(
      _systemPromptAsset,
    );

    final StringBuffer buffer = StringBuffer()
      ..writeln(system)
      ..writeln()
      ..writeln('KONTEKST:')
      ..writeln('- stan: ${request.reading.state.label}')
      ..writeln(
        '- pewność odczytu: '
        '${(request.reading.confidence * 100).round()}%',
      )
      ..writeln('- pora dnia: ${PlFormat.time(request.at)}');

    final String? observation = request.dominantObservation;
    if (observation != null) {
      buffer.writeln('- najmocniejszy sygnał: $observation');
    }

    final String? intention = request.intention?.text;
    buffer.writeln(
      intention == null
          ? '- zamiar użytkownika: nie podano (nie zmyślaj go)'
          : '- zamiar użytkownika: $intention',
    );

    if (request.recentMessages.isNotEmpty) {
      buffer
        ..writeln('- nie powtarzaj tych zdań:')
        ..writeAll(
          request.recentMessages
              .take(5)
              .map((String message) => '  * $message'),
          '\n',
        )
        ..writeln();
    }

    buffer
      ..writeln()
      ..writeln('Napisz jedno zdanie zgodne z zasadami.');

    return buffer.toString();
  }
}

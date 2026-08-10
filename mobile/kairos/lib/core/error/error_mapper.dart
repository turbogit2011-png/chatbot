import 'dart:async';

import 'package:fpdart/fpdart.dart';
import 'package:sqflite/sqflite.dart';

import '../logging/app_logger.dart';
import '../result/typedefs.dart';
import 'failure.dart';

const AppLogger _log = AppLogger('error');

/// Uruchamia [body] i zamienia każdy wyjątek na [Failure].
///
/// To jedyne miejsce w projekcie, w którym łapiemy `Object` — dzięki temu
/// warstwy wyżej nie muszą znać typów wyjątków rzucanych przez pluginy.
FutureEither<T> guard<T>(
  Future<T> Function() body, {
  Failure Function(Object error, StackTrace stackTrace)? onError,
  String? context,
}) async {
  try {
    return Right<Failure, T>(await body());
  } on Object catch (error, stackTrace) {
    final Failure failure =
        onError?.call(error, stackTrace) ?? mapError(error, stackTrace);
    _log.error(context ?? 'guard', failure, stackTrace);
    return Left<Failure, T>(failure);
  }
}

/// Synchroniczny odpowiednik [guard].
ResultOf<T> guardSync<T>(
  T Function() body, {
  Failure Function(Object error, StackTrace stackTrace)? onError,
  String? context,
}) {
  try {
    return Right<Failure, T>(body());
  } on Object catch (error, stackTrace) {
    final Failure failure =
        onError?.call(error, stackTrace) ?? mapError(error, stackTrace);
    _log.error(context ?? 'guardSync', failure, stackTrace);
    return Left<Failure, T>(failure);
  }
}

/// Heurystyczne mapowanie wyjątku na [Failure] na podstawie typu i treści.
Failure mapError(Object error, StackTrace stackTrace) {
  if (error is Failure) {
    return error;
  }
  if (error is DatabaseException) {
    return DatabaseFailure(cause: error, stackTrace: stackTrace);
  }
  if (error is TimeoutException) {
    return UnknownFailure(
      message: 'Operacja trwała zbyt długo i została przerwana.',
      cause: error,
      stackTrace: stackTrace,
    );
  }
  if (error is UnsupportedError || error is UnimplementedError) {
    return SensorFailure(cause: error, stackTrace: stackTrace);
  }

  final String text = error.toString().toLowerCase();
  if (text.contains('permission') || text.contains('denied')) {
    return PermissionFailure(cause: error, stackTrace: stackTrace);
  }
  if (text.contains('sensor') || text.contains('unavailable')) {
    return SensorFailure(cause: error, stackTrace: stackTrace);
  }
  if (text.contains('model') || text.contains('inference')) {
    return ModelFailure(cause: error, stackTrace: stackTrace);
  }
  return UnknownFailure(cause: error, stackTrace: stackTrace);
}

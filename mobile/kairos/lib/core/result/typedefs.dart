import 'package:fpdart/fpdart.dart';

import '../error/failure.dart';

/// Wynik operacji asynchronicznej: albo [Failure], albo wartość.
typedef FutureEither<T> = Future<Either<Failure, T>>;

/// Wynik synchroniczny.
typedef ResultOf<T> = Either<Failure, T>;

/// Operacja bez wartości zwracanej (fpdart `Unit` zamiast `void`).
typedef FutureUnit = Future<Either<Failure, Unit>>;

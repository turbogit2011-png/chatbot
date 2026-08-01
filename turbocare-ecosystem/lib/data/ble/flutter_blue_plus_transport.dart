/// TurboCare Ecosystem — adapter transportu BLE dla `flutter_blue_plus`.
///
/// Jedyny plik warstwy OBD zależny od pluginu — cała logika kolejki
/// ([ElmCommandQueue]) pozostaje w czystym Darcie i jest w pełni testowalna
/// z transportem-atrapą.
///
/// Profil: Nordic UART Service (NUS) — standard de facto dla dedykowanych
/// interfejsów OBD2 BLE:
///   • Service : 6E400001-B5A3-F393-E0A9-E50E24DCCA9E
///   • RX (app → dongle): 6E400002-... Write Without Response
///   • TX (dongle → app): 6E400003-... Notify
library;

import 'dart:async';

import 'package:flutter_blue_plus/flutter_blue_plus.dart';

import 'elm_command_queue.dart';

/// Transport NUS na `flutter_blue_plus`, spełniający kontrakt [ObdByteTransport].
final class FlutterBluePlusNusTransport implements ObdByteTransport {
  FlutterBluePlusNusTransport._(
    this._device,
    this._rxCharacteristic,
    this._incoming,
    this._onDisconnected,
    this._mtuPayload,
  );

  static final Guid _nusService = Guid('6E400001-B5A3-F393-E0A9-E50E24DCCA9E');
  static final Guid _nusRx = Guid('6E400002-B5A3-F393-E0A9-E50E24DCCA9E');
  static final Guid _nusTx = Guid('6E400003-B5A3-F393-E0A9-E50E24DCCA9E');

  final BluetoothDevice _device;
  final BluetoothCharacteristic _rxCharacteristic;
  final Stream<List<int>> _incoming;
  final Stream<void> _onDisconnected;

  /// Maksymalny payload jednego zapisu = MTU − 3 bajty nagłówka ATT.
  final int _mtuPayload;

  /// Nawiązanie sesji: połączenie, negocjacja MTU, wykrycie usług NUS,
  /// włączenie notyfikacji TX. Rzuca [StateError] przy braku profilu NUS —
  /// to oznacza obce/niekompatybilne urządzenie, nie błąd przejściowy.
  static Future<FlutterBluePlusNusTransport> connect(
    BluetoothDevice device, {
    Duration timeout = const Duration(seconds: 15),
  }) async {
    await device.connect(timeout: timeout, autoConnect: false);

    // Android: negocjujemy duże MTU (247 → payload 244 B); iOS negocjuje
    // samo — odczytujemy wartość efektywną z pierwszego zdarzenia strumienia.
    var mtu = 23;
    try {
      mtu = await device.requestMtu(247);
    } catch (_) {
      mtu = await device.mtu.first;
    }

    final services = await device.discoverServices();
    final nus = services.firstWhere(
      (s) => s.serviceUuid == _nusService,
      orElse: () => throw StateError(
          'Urządzenie ${device.remoteId} nie udostępnia profilu NUS — '
          'to nie jest interfejs TurboCare.'),
    );
    final rx = nus.characteristics
        .firstWhere((c) => c.characteristicUuid == _nusRx);
    final tx = nus.characteristics
        .firstWhere((c) => c.characteristicUuid == _nusTx);

    await tx.setNotifyValue(true);

    final disconnected = device.connectionState
        .where((s) => s == BluetoothConnectionState.disconnected)
        .map<void>((_) {});

    return FlutterBluePlusNusTransport._(
      device,
      rx,
      // broadcast: kolejka + ewentualny sniffer logujący sesję do raportu.
      tx.onValueReceived.asBroadcastStream(),
      disconnected.asBroadcastStream(),
      mtu - 3,
    );
  }

  @override
  Stream<List<int>> get incoming => _incoming;

  @override
  Stream<void> get onDisconnected => _onDisconnected;

  @override
  bool get isConnected => _device.isConnected;

  @override
  Future<void> write(List<int> data) async {
    // Fragmentacja wg wynegocjowanego MTU — komendy AT są krótkie, ale
    // payloady UDS (np. RoutineControl z parametrami) potrafią przekroczyć
    // 20 B domyślnego MTU na starszych Androidach.
    for (var offset = 0; offset < data.length; offset += _mtuPayload) {
      final end = (offset + _mtuPayload).clamp(0, data.length);
      await _rxCharacteristic.write(
        data.sublist(offset, end),
        withoutResponse: true,
      );
    }
  }

  Future<void> disconnect() => _device.disconnect();
}

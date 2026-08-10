import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../domain/entities/flow_state.dart';

/// Most między domeną a motywem: stan poznawczy → ton wizualny.
///
/// Dzięki temu `FlowState` nie wie nic o kolorach, a motyw nie wie nic o
/// logice klasyfikatora.
extension FlowStateTone on FlowState {
  FlowTone get tone => switch (this) {
    FlowState.deepFocus => FlowTone.deepFocus,
    FlowState.flow => FlowTone.flow,
    FlowState.drift => FlowTone.drift,
    FlowState.restless => FlowTone.restless,
    FlowState.fatigue => FlowTone.fatigue,
    FlowState.recovery => FlowTone.recovery,
  };

  IconData get icon => switch (this) {
    FlowState.deepFocus => Icons.center_focus_strong_rounded,
    FlowState.flow => Icons.waves_rounded,
    FlowState.drift => Icons.blur_on_rounded,
    FlowState.restless => Icons.vibration_rounded,
    FlowState.fatigue => Icons.bedtime_rounded,
    FlowState.recovery => Icons.directions_walk_rounded,
  };

  Color color(BuildContext context) => context.palette.toneColor(tone);
}

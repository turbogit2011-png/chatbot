import type { BatteryPoint, MediaStatus, PermissionEntry, NetworkData, Anomaly, Severity } from './types'

let idCounter = 0

function makeAnomaly(
  type: Anomaly['type'],
  severity: Severity,
  title: string,
  description: string,
  value?: number,
  threshold?: number,
): Anomaly {
  return {
    id: `${type}-${++idCounter}-${Date.now()}`,
    timestamp: Date.now(),
    type,
    severity,
    title,
    description,
    value,
    threshold,
  }
}

export function detectBatteryAnomalies(history: BatteryPoint[]): Anomaly[] {
  const discharging = history.filter(p => !p.charging)
  if (discharging.length < 4) return []

  const window = discharging.slice(-8)
  const first = window[0]
  const last = window[window.length - 1]
  const timeDiffMin = (last.time - first.time) / 60_000

  if (timeDiffMin < 0.5) return []

  const levelDrop = first.level - last.level
  const ratePerMin = levelDrop / timeDiffMin

  if (ratePerMin > 5) {
    return [makeAnomaly(
      'battery', 'critical',
      'Krytyczny pobór baterii',
      `Rozładowanie z prędkością ${ratePerMin.toFixed(1)}%/min. Możliwe złośliwe oprogramowanie lub szpiegowanie w tle.`,
      ratePerMin, 5,
    )]
  }
  if (ratePerMin > 2) {
    return [makeAnomaly(
      'battery', 'warning',
      'Wysoki pobór baterii',
      `Rozładowanie z prędkością ${ratePerMin.toFixed(1)}%/min. Sugeruje nieautoryzowane procesy w tle.`,
      ratePerMin, 2,
    )]
  }
  return []
}

export function detectMediaAnomalies(media: MediaStatus): Anomaly[] {
  const result: Anomaly[] = []
  if (media.micActive) {
    result.push(makeAnomaly(
      'media', 'critical',
      'Mikrofon aktywny',
      'Wykryto aktywne nagrywanie audio. Sprawdź które aplikacje mają dostęp do mikrofonu.',
    ))
  }
  if (media.camActive) {
    result.push(makeAnomaly(
      'media', 'critical',
      'Kamera aktywna',
      'Wykryto aktywne nagrywanie wideo. Sprawdź które aplikacje mają dostęp do kamery.',
    ))
  }
  if (media.screenActive) {
    result.push(makeAnomaly(
      'media', 'critical',
      'Przechwytywanie ekranu',
      'Wykryto aktywne nagrywanie lub udostępnianie ekranu. Twoje działania mogą być obserwowane.',
    ))
  }
  return result
}

export function detectPermissionAnomalies(permissions: PermissionEntry[]): Anomaly[] {
  const result: Anomaly[] = []
  const highGranted = permissions.filter(p => p.riskLevel === 'high' && p.state === 'granted')

  if (highGranted.length >= 3) {
    result.push(makeAnomaly(
      'permission', 'warning',
      'Wiele uprawnień wysokiego ryzyka aktywnych',
      `Przyznano ${highGranted.length} uprawnień wysokiego ryzyka jednocześnie: ${highGranted.map(p => p.label).join(', ')}.`,
    ))
  }

  const micGranted = permissions.some(p => p.name === 'microphone' && p.state === 'granted')
  const locGranted = permissions.some(p => p.name === 'geolocation' && p.state === 'granted')
  if (micGranted && locGranted) {
    result.push(makeAnomaly(
      'permission', 'warning',
      'Mikrofon + GPS aktywne jednocześnie',
      'Kombinacja aktywnego mikrofonu i lokalizacji GPS może wskazywać na aplikację szpiegującą.',
    ))
  }
  return result
}

export function detectNetworkAnomalies(network: NetworkData | null): Anomaly[] {
  if (!network?.online) return []
  if (network.rtt > 2000) {
    return [makeAnomaly(
      'network', 'warning',
      'Podejrzane opóźnienie sieci',
      `RTT wynosi ${network.rtt}ms. Ruch może być przekierowywany przez nieznany serwer pośredni (np. spyware proxy).`,
      network.rtt, 2000,
    )]
  }
  return []
}

export function computeRiskScore(
  batteryAnomalies: Anomaly[],
  _mediaAnomalies: Anomaly[],
  permAnomalies: Anomaly[],
  netAnomalies: Anomaly[],
  permissions: PermissionEntry[],
  media: MediaStatus,
): number {
  let score = 0

  if (media.micActive) score += 40
  if (media.camActive) score += 40
  if (media.screenActive) score += 35

  score += batteryAnomalies.filter(a => a.severity === 'critical').length * 20
  score += batteryAnomalies.filter(a => a.severity === 'warning').length * 10

  const highGranted = permissions.filter(p => p.riskLevel === 'high' && p.state === 'granted').length
  score += highGranted * 5

  score += netAnomalies.filter(a => a.severity === 'critical').length * 15
  score += netAnomalies.filter(a => a.severity === 'warning').length * 7

  score += permAnomalies.filter(a => a.severity === 'warning').length * 8

  return Math.min(100, score)
}

export function getBatteryDrainRate(history: BatteryPoint[]): number {
  const discharging = history.filter(p => !p.charging)
  if (discharging.length < 2) return 0

  const window = discharging.slice(-8)
  const first = window[0]
  const last = window[window.length - 1]
  const timeDiffMin = (last.time - first.time) / 60_000
  if (timeDiffMin < 0.1) return 0
  return (first.level - last.level) / timeDiffMin
}

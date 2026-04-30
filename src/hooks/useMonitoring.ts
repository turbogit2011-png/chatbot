import { useState, useEffect, useRef, useCallback } from 'react'
import type {
  BatteryData,
  BatteryPoint,
  NetworkData,
  PermissionEntry,
  MediaStatus,
  Anomaly,
  AppState,
} from '../types'
import {
  detectBatteryAnomalies,
  detectMediaAnomalies,
  detectPermissionAnomalies,
  detectNetworkAnomalies,
  computeRiskScore,
} from '../anomalyEngine'

const PERMISSIONS_CONFIG: Array<Omit<PermissionEntry, 'state'>> = [
  { name: 'microphone',   label: 'Mikrofon',        icon: '🎙️', riskLevel: 'high',   description: 'Dostęp do nagrywania dźwięku' },
  { name: 'camera',       label: 'Kamera',           icon: '📷', riskLevel: 'high',   description: 'Dostęp do kamery urządzenia' },
  { name: 'geolocation',  label: 'Lokalizacja GPS',  icon: '📍', riskLevel: 'high',   description: 'Dostęp do pozycji GPS' },
  { name: 'notifications',label: 'Powiadomienia',    icon: '🔔', riskLevel: 'low',    description: 'Wysyłanie powiadomień push' },
]

const MAX_HISTORY = 120
const MAX_ANOMALIES = 100
const COOLDOWN_MS = 3 * 60 * 1000

const initialMedia: MediaStatus = { micActive: false, camActive: false, screenActive: false, streamCount: 0 }

export function useMonitoring() {
  const [battery, setBattery]               = useState<BatteryData | null>(null)
  const [batteryHistory, setBatteryHistory] = useState<BatteryPoint[]>([])
  const [network, setNetwork]               = useState<NetworkData | null>(null)
  const [permissions, setPermissions]       = useState<PermissionEntry[]>([])
  const [media, setMedia]                   = useState<MediaStatus>(initialMedia)
  const [anomalies, setAnomalies]           = useState<Anomaly[]>([])
  const [riskScore, setRiskScore]           = useState(0)
  const [isMonitoring, setIsMonitoring]     = useState(false)
  const [lastUpdate, setLastUpdate]         = useState(Date.now())

  // Refs to avoid stale closures inside intervals
  const batteryHistoryRef = useRef<BatteryPoint[]>([])
  const permissionsRef    = useRef<PermissionEntry[]>([])
  const mediaRef          = useRef<MediaStatus>(initialMedia)
  const networkRef        = useRef<NetworkData | null>(null)
  const lastAlertRef      = useRef<Record<string, number>>({})

  batteryHistoryRef.current = batteryHistory
  permissionsRef.current    = permissions
  mediaRef.current          = media
  networkRef.current        = network

  // ── Battery ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!('getBattery' in navigator)) {
      setBattery({ level: 0, charging: false, chargingTime: Infinity, dischargingTime: Infinity, supported: false })
      return
    }

    let cancelled = false
    let bat: EventTarget | null = null

    const pushPoint = (b: { level: number; charging: boolean }) => {
      const point: BatteryPoint = { time: Date.now(), level: Math.round(b.level * 100), charging: b.charging }
      setBatteryHistory(prev => {
        const next = [...prev, point]
        return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next
      })
    }

    ;(navigator as unknown as { getBattery(): Promise<{ level: number; charging: boolean; chargingTime: number; dischargingTime: number; addEventListener(e: string, h: () => void): void; removeEventListener(e: string, h: () => void): void }>}).getBattery()
      .then(b => {
        if (cancelled) return
        bat = b as unknown as EventTarget

        const update = () => {
          setBattery({ level: b.level, charging: b.charging, chargingTime: b.chargingTime, dischargingTime: b.dischargingTime, supported: true })
          pushPoint(b)
        }
        update()
        b.addEventListener('levelchange', update)
        b.addEventListener('chargingchange', update)
      })
      .catch(() => {
        if (!cancelled) setBattery({ level: 0, charging: false, chargingTime: Infinity, dischargingTime: Infinity, supported: false })
      })

    return () => { cancelled = true; void bat }
  }, [])

  // Periodic battery sampling (every 30 s for drain-rate calc)
  useEffect(() => {
    const id = setInterval(() => {
      if (!('getBattery' in navigator)) return
      ;(navigator as unknown as { getBattery(): Promise<{ level: number; charging: boolean }> }).getBattery()
        .then(b => {
          const point: BatteryPoint = { time: Date.now(), level: Math.round(b.level * 100), charging: b.charging }
          setBatteryHistory(prev => {
            const next = [...prev, point]
            return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next
          })
        })
        .catch(() => {})
    }, 30_000)
    return () => clearInterval(id)
  }, [])

  // ── Network ───────────────────────────────────────────────────────────────
  const updateNetwork = useCallback(() => {
    const conn = (navigator as unknown as Record<string, unknown>).connection as { type?: string; effectiveType?: string; downlink?: number; rtt?: number } | undefined
    setNetwork({
      online: navigator.onLine,
      type: conn?.type ?? 'unknown',
      effectiveType: conn?.effectiveType ?? 'unknown',
      downlink: conn?.downlink ?? 0,
      rtt: conn?.rtt ?? 0,
      supported: !!conn,
    })
    setLastUpdate(Date.now())
  }, [])

  useEffect(() => {
    updateNetwork()
    window.addEventListener('online', updateNetwork)
    window.addEventListener('offline', updateNetwork)
    const id = setInterval(updateNetwork, 5_000)
    return () => {
      window.removeEventListener('online', updateNetwork)
      window.removeEventListener('offline', updateNetwork)
      clearInterval(id)
    }
  }, [updateNetwork])

  // ── Permissions ───────────────────────────────────────────────────────────
  const checkPermissions = useCallback(async () => {
    const results: PermissionEntry[] = []
    for (const cfg of PERMISSIONS_CONFIG) {
      try {
        const status = await navigator.permissions.query({ name: cfg.name as PermissionName })
        results.push({ ...cfg, state: status.state as PermissionEntry['state'] })
      } catch {
        results.push({ ...cfg, state: 'unsupported' })
      }
    }
    setPermissions(results)
  }, [])

  useEffect(() => {
    checkPermissions()
    const id = setInterval(checkPermissions, 15_000)
    return () => clearInterval(id)
  }, [checkPermissions])

  // ── Anomaly detection (every 20 s) ────────────────────────────────────────
  useEffect(() => {
    const run = () => {
      const now = Date.now()
      const cool = (list: Anomaly[]): Anomaly[] =>
        list.filter(a => {
          const key = `${a.type}::${a.title}`
          if (now - (lastAlertRef.current[key] ?? 0) > COOLDOWN_MS) {
            lastAlertRef.current[key] = now
            return true
          }
          return false
        })

      const bat  = cool(detectBatteryAnomalies(batteryHistoryRef.current))
      const med  = cool(detectMediaAnomalies(mediaRef.current))
      const perm = cool(detectPermissionAnomalies(permissionsRef.current))
      const net  = cool(detectNetworkAnomalies(networkRef.current))
      const fresh = [...bat, ...med, ...perm, ...net]

      if (fresh.length > 0) {
        setAnomalies(prev => [...fresh, ...prev].slice(0, MAX_ANOMALIES))
      }

      setRiskScore(computeRiskScore(bat, med, perm, net, permissionsRef.current, mediaRef.current))
      setLastUpdate(Date.now())
    }

    const id = setInterval(run, 20_000)
    const timeout = setTimeout(() => { run(); setIsMonitoring(true) }, 1_500)
    return () => { clearInterval(id); clearTimeout(timeout) }
  }, [])

  // ── Actions ───────────────────────────────────────────────────────────────
  const clearAnomalies = useCallback(() => {
    setAnomalies([])
    setRiskScore(0)
    lastAlertRef.current = {}
  }, [])

  const testMicrophone = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      setMedia(p => ({ ...p, micActive: true, streamCount: p.streamCount + 1 }))
      const anomaly: Anomaly = {
        id: `mic-test-${Date.now()}`,
        timestamp: Date.now(),
        type: 'media', severity: 'critical',
        title: 'Test: Mikrofon aktywowany',
        description: 'Mikrofon uruchomiony w celu testu. W normalnych warunkach sprawdź, które aplikacje go używają.',
      }
      setAnomalies(p => [anomaly, ...p].slice(0, MAX_ANOMALIES))
      setRiskScore(p => Math.min(100, p + 40))
      setTimeout(() => {
        stream.getTracks().forEach(t => t.stop())
        setMedia(p => ({ ...p, micActive: false, streamCount: Math.max(0, p.streamCount - 1) }))
        setRiskScore(p => Math.max(0, p - 40))
      }, 4_000)
      return true
    } catch { return false }
  }, [])

  const testCamera = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      setMedia(p => ({ ...p, camActive: true, streamCount: p.streamCount + 1 }))
      const anomaly: Anomaly = {
        id: `cam-test-${Date.now()}`,
        timestamp: Date.now(),
        type: 'media', severity: 'critical',
        title: 'Test: Kamera aktywowana',
        description: 'Kamera uruchomiona w celu testu. W normalnych warunkach sprawdź, które aplikacje jej używają.',
      }
      setAnomalies(p => [anomaly, ...p].slice(0, MAX_ANOMALIES))
      setRiskScore(p => Math.min(100, p + 40))
      setTimeout(() => {
        stream.getTracks().forEach(t => t.stop())
        setMedia(p => ({ ...p, camActive: false, streamCount: Math.max(0, p.streamCount - 1) }))
        setRiskScore(p => Math.max(0, p - 40))
      }, 4_000)
      return true
    } catch { return false }
  }, [])

  const requestPermission = useCallback(async (name: string): Promise<void> => {
    if (name === 'microphone') await navigator.mediaDevices.getUserMedia({ audio: true }).then(s => s.getTracks().forEach(t => t.stop())).catch(() => {})
    if (name === 'camera')     await navigator.mediaDevices.getUserMedia({ video: true }).then(s => s.getTracks().forEach(t => t.stop())).catch(() => {})
    if (name === 'geolocation') navigator.geolocation.getCurrentPosition(() => {}, () => {})
    if (name === 'notifications') await Notification.requestPermission().catch(() => {})
    await checkPermissions()
  }, [checkPermissions])

  const appState: AppState = { battery, batteryHistory, network, permissions, media, anomalies, riskScore, isMonitoring, lastUpdate }

  return { appState, clearAnomalies, testMicrophone, testCamera, requestPermission }
}

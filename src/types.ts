export type Severity = 'info' | 'warning' | 'critical'
export type TabId = 'overview' | 'battery' | 'network' | 'permissions' | 'log'
export type RiskLevel = 'low' | 'medium' | 'high'

export interface BatteryData {
  level: number
  charging: boolean
  chargingTime: number
  dischargingTime: number
  supported: boolean
}

export interface BatteryPoint {
  time: number
  level: number
  charging: boolean
}

export interface NetworkData {
  online: boolean
  type: string
  effectiveType: string
  downlink: number
  rtt: number
  supported: boolean
}

export interface PermissionEntry {
  name: string
  label: string
  icon: string
  state: 'granted' | 'denied' | 'prompt' | 'unsupported'
  riskLevel: RiskLevel
  description: string
}

export interface MediaStatus {
  micActive: boolean
  camActive: boolean
  screenActive: boolean
  streamCount: number
}

export interface Anomaly {
  id: string
  timestamp: number
  type: 'battery' | 'network' | 'media' | 'permission' | 'system'
  severity: Severity
  title: string
  description: string
  value?: number
  threshold?: number
}

export interface AppState {
  battery: BatteryData | null
  batteryHistory: BatteryPoint[]
  network: NetworkData | null
  permissions: PermissionEntry[]
  media: MediaStatus
  anomalies: Anomaly[]
  riskScore: number
  isMonitoring: boolean
  lastUpdate: number
}

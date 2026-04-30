import { useState } from 'react'
import type { Anomaly, Severity } from '../types'

interface Props {
  anomalies: Anomaly[]
  onClear: () => void
}

const TYPE_ICON: Record<Anomaly['type'], string> = {
  battery: '🔋',
  network: '🌐',
  media: '📡',
  permission: '🔑',
  system: '⚙️',
}

const SEVERITY_COLOR: Record<Severity, string> = {
  critical: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
}

const SEVERITY_BG: Record<Severity, string> = {
  critical: 'badge-critical',
  warning: 'badge-warning',
  info: 'badge-info',
}

const SEVERITY_LABEL: Record<Severity, string> = {
  critical: 'Krytyczny',
  warning: 'Ostrzeżenie',
  info: 'Info',
}

function formatTs(ts: number): string {
  return new Date(ts).toLocaleString('pl-PL', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

export function AnomalyLog({ anomalies, onClear }: Props) {
  const [filter, setFilter] = useState<Severity | 'all'>('all')

  const filtered = filter === 'all' ? anomalies : anomalies.filter(a => a.severity === filter)

  const counts = {
    all: anomalies.length,
    critical: anomalies.filter(a => a.severity === 'critical').length,
    warning: anomalies.filter(a => a.severity === 'warning').length,
    info: anomalies.filter(a => a.severity === 'info').length,
  }

  const exportLog = () => {
    const data = JSON.stringify(anomalies, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `phoneguard-log-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filter bar + actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['all', 'critical', 'warning', 'info'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              filter === f
                ? 'bg-cyan-700 border-cyan-500 text-white'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
            }`}
          >
            {f === 'all' ? 'Wszystkie' : SEVERITY_LABEL[f]} ({counts[f]})
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          {anomalies.length > 0 && (
            <>
              <button
                onClick={exportLog}
                className="px-3 py-1 rounded-full text-xs bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors"
              >
                ↓ Eksport
              </button>
              <button
                onClick={onClear}
                className="px-3 py-1 rounded-full text-xs bg-red-950 border border-red-800 text-red-300 hover:bg-red-900 transition-colors"
              >
                ✕ Wyczyść
              </button>
            </>
          )}
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="card flex flex-col items-center gap-3 py-10 text-slate-500">
          <span className="text-4xl">🛡️</span>
          <p className="text-sm">
            {anomalies.length === 0
              ? 'Brak wykrytych anomalii. System monitoruje…'
              : 'Brak wyników dla wybranego filtra.'}
          </p>
        </div>
      )}

      {/* Anomaly entries */}
      {filtered.map(a => (
        <div
          key={a.id}
          className="card flex gap-3 items-start border-l-4"
          style={{ borderLeftColor: SEVERITY_COLOR[a.severity] }}
        >
          <span className="text-xl mt-0.5">{TYPE_ICON[a.type]}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-xs px-2 py-0.5 rounded font-semibold ${SEVERITY_BG[a.severity]}`}>
                {SEVERITY_LABEL[a.severity]}
              </span>
              <span className="text-xs text-slate-500">{formatTs(a.timestamp)}</span>
            </div>
            <p className="text-sm font-semibold text-white">{a.title}</p>
            <p className="text-xs text-slate-400 mt-0.5">{a.description}</p>
            {a.value !== undefined && a.threshold !== undefined && (
              <p className="text-xs text-slate-600 mt-1">
                Wartość: <span style={{ color: SEVERITY_COLOR[a.severity] }}>{a.value.toFixed(2)}</span>
                {' '}/ Próg: {a.threshold}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

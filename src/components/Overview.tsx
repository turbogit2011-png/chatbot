import { RiskGauge } from './RiskGauge'
import type { AppState } from '../types'
import { getBatteryDrainRate } from '../anomalyEngine'

interface Props {
  state: AppState
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="card flex flex-col gap-1">
      <span className="text-xs text-slate-400 uppercase tracking-wide">{label}</span>
      <span className="text-2xl font-bold" style={{ color }}>{value}</span>
      <span className="text-xs text-slate-500">{sub}</span>
    </div>
  )
}

export function Overview({ state }: Props) {
  const { battery, batteryHistory, network, permissions, media, anomalies, riskScore } = state

  const criticalAnomalies = anomalies.filter(a => a.severity === 'critical').slice(0, 3)
  const drainRate = getBatteryDrainRate(batteryHistory)

  const batteryValue = battery?.supported
    ? `${Math.round((battery.level ?? 0) * 100)}%`
    : 'N/A'
  const batteryColor = battery && battery.level < 0.2 ? '#ef4444' : '#22c55e'

  const networkStatus = network?.online ? network.effectiveType.toUpperCase() || 'Online' : 'Offline'
  const networkColor = network?.online ? '#22c55e' : '#ef4444'

  const highPerm = permissions.filter(p => p.riskLevel === 'high' && p.state === 'granted').length
  const permColor = highPerm >= 3 ? '#ef4444' : highPerm >= 1 ? '#f59e0b' : '#22c55e'

  const threatCount = anomalies.filter(a => a.severity !== 'info').length
  const threatColor = threatCount > 5 ? '#ef4444' : threatCount > 0 ? '#f59e0b' : '#22c55e'

  return (
    <div className="flex flex-col gap-4">
      {/* Gauge */}
      <div className="card flex flex-col items-center gap-2 py-6">
        <RiskGauge score={riskScore} />
        <p className="text-xs text-slate-400 text-center max-w-xs">
          Wskaźnik oparty na aktywności mikrofonu, kamery, zużyciu baterii, sieci i uprawnieniach.
        </p>
      </div>

      {/* Media alert bar */}
      {(media.micActive || media.camActive || media.screenActive) && (
        <div className="bg-red-950 border border-red-700 rounded-xl p-3 flex items-center gap-3 blink">
          <span className="text-2xl">🚨</span>
          <div>
            <p className="text-red-300 font-semibold text-sm">Aktywne nagrywanie wykryte!</p>
            <p className="text-red-400 text-xs">
              {[media.micActive && 'Mikrofon', media.camActive && 'Kamera', media.screenActive && 'Ekran']
                .filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Bateria"
          value={batteryValue}
          sub={battery?.charging ? 'Ładowanie' : drainRate > 0 ? `−${drainRate.toFixed(1)}%/min` : 'Rozładowywanie'}
          color={batteryColor}
        />
        <StatCard
          label="Sieć"
          value={networkStatus}
          sub={network?.supported ? `RTT: ${network.rtt}ms` : 'Brak danych API'}
          color={networkColor}
        />
        <StatCard
          label="Uprawnienia wysokiego ryzyka"
          value={String(highPerm)}
          sub="mikrofon, kamera, GPS"
          color={permColor}
        />
        <StatCard
          label="Wykryte zagrożenia"
          value={String(threatCount)}
          sub={`${anomalies.filter(a => a.severity === 'critical').length} krytycznych`}
          color={threatColor}
        />
      </div>

      {/* Recent critical anomalies */}
      {criticalAnomalies.length > 0 && (
        <div className="card flex flex-col gap-2">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Ostatnie zagrożenia</p>
          {criticalAnomalies.map(a => (
            <div key={a.id} className="flex items-start gap-2 p-2 rounded-lg bg-red-950/50 border border-red-900">
              <span className="text-red-400 text-lg mt-0.5">⚠</span>
              <div>
                <p className="text-red-200 text-sm font-medium">{a.title}</p>
                <p className="text-red-400 text-xs">{a.description.slice(0, 80)}…</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Security check list */}
      <div className="card flex flex-col gap-2">
        <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Kontrola bezpieczeństwa</p>
        {[
          { label: 'Mikrofon nieaktywny',        ok: !media.micActive },
          { label: 'Kamera nieaktywna',           ok: !media.camActive },
          { label: 'Brak nagrywania ekranu',      ok: !media.screenActive },
          { label: 'Normalny pobór baterii',       ok: drainRate < 2 },
          { label: 'Połączenie online',            ok: network?.online ?? false },
          { label: 'Brak podejrzanego opóźnienia', ok: (network?.rtt ?? 0) < 2000 },
        ].map(({ label, ok }) => (
          <div key={label} className="flex items-center gap-2 text-sm">
            <span className={`text-lg ${ok ? 'text-green-400' : 'text-red-400'}`}>{ok ? '✓' : '✗'}</span>
            <span className={ok ? 'text-slate-300' : 'text-red-300'}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

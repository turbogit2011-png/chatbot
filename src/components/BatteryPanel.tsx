import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import type { AppState } from '../types'
import { getBatteryDrainRate } from '../anomalyEngine'

interface Props { state: AppState }

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function BatteryPanel({ state }: Props) {
  const { battery, batteryHistory } = state
  const drainRate = getBatteryDrainRate(batteryHistory)

  const level = battery ? Math.round(battery.level * 100) : null
  const levelColor = level === null ? '#64748b' : level > 50 ? '#22c55e' : level > 20 ? '#f59e0b' : '#ef4444'

  const drainColor = drainRate > 5 ? '#ef4444' : drainRate > 2 ? '#f97316' : '#22c55e'
  const drainStatus = drainRate > 5 ? 'Krytyczny!' : drainRate > 2 ? 'Podwyższony' : 'Normalny'

  const remainingMin = battery && !battery.charging && battery.dischargingTime !== Infinity
    ? Math.round(battery.dischargingTime / 60)
    : null

  const chartData = batteryHistory.map(p => ({
    time: formatTime(p.time),
    poziom: p.level,
    charging: p.charging,
  }))

  return (
    <div className="flex flex-col gap-4">
      {/* Level + status */}
      <div className="card flex items-center gap-4">
        <div className="flex flex-col items-center justify-center w-24 h-24 rounded-full border-4" style={{ borderColor: levelColor }}>
          <span className="text-2xl font-bold" style={{ color: levelColor }}>
            {level !== null ? `${level}%` : 'N/A'}
          </span>
          <span className="text-xs text-slate-500">{battery?.charging ? '⚡ ładuje' : '🔋'}</span>
        </div>
        <div className="flex flex-col gap-2 flex-1">
          {battery?.supported === false && (
            <p className="text-xs text-amber-400">Battery API niedostępne w tej przeglądarce</p>
          )}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-slate-400 text-xs">Status</p>
              <p className="text-white">{battery?.charging ? 'Ładowanie' : 'Rozładowywanie'}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Czas do końca</p>
              <p className="text-white">{remainingMin !== null ? `~${remainingMin} min` : '—'}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Pobór energii</p>
              <p style={{ color: drainColor }}>{drainRate > 0 ? `${drainRate.toFixed(2)}%/min` : '—'}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Ocena</p>
              <p style={{ color: drainColor }}>{drainStatus}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Drain rate explanation */}
      <div className="card text-xs text-slate-400 flex flex-col gap-1">
        <p className="font-semibold text-slate-300">Progi anomalii zużycia baterii:</p>
        <p><span className="text-green-400">▪ &lt;2%/min</span> — normalne użytkowanie</p>
        <p><span className="text-amber-400">▪ 2–5%/min</span> — podwyższony pobór (możliwe procesy w tle)</p>
        <p><span className="text-red-400">▪ &gt;5%/min</span> — krytyczny pobór (możliwe złośliwe oprogramowanie)</p>
      </div>

      {/* Chart */}
      <div className="card">
        <p className="text-xs text-slate-400 uppercase tracking-wide mb-3">Historia poziomu baterii</p>
        {chartData.length >= 2 ? (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="time"
                tick={{ fill: '#64748b', fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} unit="%" width={36} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
                labelStyle={{ color: '#94a3b8', fontSize: 11 }}
                itemStyle={{ color: '#22c55e' }}
              />
              <ReferenceLine y={20} stroke="#ef4444" strokeDasharray="4 2" label={{ value: '20%', fill: '#ef4444', fontSize: 10 }} />
              <Line
                type="monotone"
                dataKey="poziom"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
                name="Poziom"
                unit="%"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-36 flex items-center justify-center text-slate-500 text-sm">
            Zbieranie danych… (potrzeba &ge;2 próbek)
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="card bg-blue-950/30 border-blue-900">
        <p className="text-xs text-blue-300 font-semibold mb-1">💡 Co może powodować szybkie rozładowanie?</p>
        <ul className="text-xs text-slate-400 list-disc list-inside space-y-0.5">
          <li>Nieznane aplikacje nagrywające w tle</li>
          <li>Ciągłe śledzenie lokalizacji GPS przez aplikację</li>
          <li>Aktywne połączenie sieciowe w tle (wysyłanie danych)</li>
          <li>Złośliwe oprogramowanie lub stalkerware</li>
        </ul>
      </div>
    </div>
  )
}

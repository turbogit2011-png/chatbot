import type { AppState } from '../types'

interface Props { state: AppState }

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-800 last:border-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-sm font-medium" style={{ color: color ?? '#f1f5f9' }}>{value}</span>
    </div>
  )
}

function typeLabel(type: string): string {
  const map: Record<string, string> = {
    wifi: 'WiFi',
    cellular: 'Sieć komórkowa',
    ethernet: 'Ethernet',
    bluetooth: 'Bluetooth',
    wimax: 'WiMAX',
    other: 'Inne',
    none: 'Brak',
    unknown: 'Nieznany',
  }
  return map[type] ?? type
}

function effectiveLabel(et: string): string {
  const map: Record<string, string> = {
    '4g': '4G / LTE',
    '3g': '3G',
    '2g': '2G',
    'slow-2g': 'Wolny 2G',
    'unknown': 'Nieznany',
  }
  return map[et] ?? et.toUpperCase()
}

export function NetworkPanel({ state }: Props) {
  const { network } = state
  if (!network) return <div className="card text-slate-400 text-sm">Ładowanie danych sieci…</div>

  const rttColor = network.rtt > 2000 ? '#ef4444' : network.rtt > 500 ? '#f59e0b' : '#22c55e'
  const rttStatus = network.rtt > 2000
    ? '⚠ Podejrzane – możliwy proxy/VPN bez zgody'
    : network.rtt > 500 ? 'Wolna sieć' : 'Normalne'

  return (
    <div className="flex flex-col gap-4">
      {/* Online status banner */}
      <div className={`card flex items-center gap-3 ${network.online ? 'bg-green-950/30 border-green-900' : 'bg-red-950/30 border-red-900'}`}>
        <div className={`w-3 h-3 rounded-full ${network.online ? 'status-dot-ok' : 'status-dot-crit'}`} />
        <div>
          <p className={`font-semibold ${network.online ? 'text-green-300' : 'text-red-300'}`}>
            {network.online ? 'Połączono z siecią' : 'Brak połączenia'}
          </p>
          <p className="text-xs text-slate-400">Ostatnia aktualizacja: tylko co kilka sekund</p>
        </div>
      </div>

      {/* Network details */}
      {network.supported ? (
        <div className="card">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Szczegóły połączenia</p>
          <Row label="Typ połączenia" value={typeLabel(network.type)} />
          <Row label="Efektywny typ" value={effectiveLabel(network.effectiveType)} />
          <Row label="Prędkość pobierania" value={network.downlink > 0 ? `${network.downlink.toFixed(1)} Mb/s` : 'N/A'} color="#06b6d4" />
          <Row label="RTT (opóźnienie)" value={network.rtt > 0 ? `${network.rtt} ms` : 'N/A'} color={rttColor} />
        </div>
      ) : (
        <div className="card bg-amber-950/20 border-amber-900">
          <p className="text-amber-300 text-sm">Network Information API niedostępne w tej przeglądarce lub systemie.</p>
          <p className="text-slate-400 text-xs mt-1">Szczegółowe dane sieci dostępne w Chrome/Edge na Androidzie.</p>
        </div>
      )}

      {/* RTT anomaly */}
      {network.rtt > 2000 && (
        <div className="card bg-red-950/40 border-red-700 flex items-start gap-3">
          <span className="text-2xl">🚨</span>
          <div>
            <p className="text-red-300 font-semibold text-sm">Podejrzane opóźnienie sieci</p>
            <p className="text-red-400 text-xs">RTT {network.rtt}ms sugeruje, że Twój ruch może przechodzić przez nieautoryzowany serwer pośredni (proxy szpiegowskie, man-in-the-middle).</p>
          </div>
        </div>
      )}

      {/* RTT status row */}
      {network.supported && network.rtt > 0 && (
        <div className="card flex flex-col gap-1">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Ocena opóźnienia</p>
          <p className="text-sm font-medium" style={{ color: rttColor }}>{rttStatus}</p>
          <div className="w-full bg-slate-800 rounded-full h-2 mt-1">
            <div
              className="h-2 rounded-full transition-all"
              style={{
                width: `${Math.min(100, (network.rtt / 3000) * 100)}%`,
                background: rttColor,
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-600 mt-0.5">
            <span>0 ms</span><span>1500 ms</span><span>3000 ms</span>
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="card bg-blue-950/30 border-blue-900">
        <p className="text-xs text-blue-300 font-semibold mb-1">💡 Na co zwrócić uwagę?</p>
        <ul className="text-xs text-slate-400 list-disc list-inside space-y-0.5">
          <li>Wysoki RTT może wskazywać na routing przez proxy (stalkerware)</li>
          <li>Nieznane połączenia WiFi mogą przechwytywać dane</li>
          <li>Nieoczekiwane zużycie danych w tle — sprawdź aplikacje</li>
          <li>Wyłącz WiFi w publicznych miejscach gdy nie używasz</li>
        </ul>
      </div>
    </div>
  )
}

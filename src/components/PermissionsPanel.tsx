import type { AppState, PermissionEntry } from '../types'

interface Props {
  state: AppState
  onTestMic: () => Promise<boolean>
  onTestCam: () => Promise<boolean>
  onRequest: (name: string) => Promise<void>
}

function stateLabel(state: PermissionEntry['state']): string {
  return { granted: 'Przyznane', denied: 'Odmówione', prompt: 'Nieokreślone', unsupported: 'Brak obsługi' }[state]
}

function stateColor(state: PermissionEntry['state']): string {
  return { granted: '#22c55e', denied: '#64748b', prompt: '#f59e0b', unsupported: '#475569' }[state]
}

function riskBadge(level: PermissionEntry['riskLevel']): string {
  return { high: 'Wysokie ryzyko', medium: 'Średnie ryzyko', low: 'Niskie ryzyko' }[level]
}

function riskBadgeColor(level: PermissionEntry['riskLevel']): string {
  return { high: '#7f1d1d', medium: '#78350f', low: '#14532d' }[level]
}

export function PermissionsPanel({ state, onTestMic, onTestCam, onRequest }: Props) {
  const { permissions, media } = state

  return (
    <div className="flex flex-col gap-4">
      {/* Live media status */}
      <div className="card">
        <p className="text-xs text-slate-400 uppercase tracking-wide mb-3">Aktywne strumienie mediów</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Mikrofon', icon: '🎙️', active: media.micActive },
            { label: 'Kamera', icon: '📷', active: media.camActive },
            { label: 'Ekran', icon: '🖥️', active: media.screenActive },
          ].map(({ label, icon, active }) => (
            <div
              key={label}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border ${
                active ? 'border-red-700 bg-red-950/40' : 'border-slate-800 bg-slate-900'
              }`}
            >
              <span className="text-2xl">{icon}</span>
              <span className="text-xs text-slate-400">{label}</span>
              <span className={`text-xs font-bold ${active ? 'text-red-400 blink' : 'text-slate-600'}`}>
                {active ? '● AKTYWNY' : '○ nieaktywny'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Test buttons */}
      <div className="card bg-amber-950/20 border-amber-900">
        <p className="text-xs text-amber-300 font-semibold mb-2">🔍 Test aktywacji urządzeń (4 sekundy)</p>
        <p className="text-xs text-slate-400 mb-3">
          Poniższe przyciski testują czy przeglądarka może uzyskać dostęp do mikrofonu/kamery. Symuluje wykrycie nieautoryzowanego dostępu.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onTestMic}
            className="flex-1 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm text-white border border-slate-700 transition-colors"
          >
            🎙️ Testuj mikrofon
          </button>
          <button
            onClick={onTestCam}
            className="flex-1 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm text-white border border-slate-700 transition-colors"
          >
            📷 Testuj kamerę
          </button>
        </div>
      </div>

      {/* Permissions list */}
      <div className="card">
        <p className="text-xs text-slate-400 uppercase tracking-wide mb-3">Stan uprawnień przeglądarki</p>
        {permissions.length === 0 && (
          <p className="text-slate-500 text-sm">Sprawdzanie uprawnień…</p>
        )}
        {permissions.map(p => (
          <div key={p.name} className="flex items-center gap-3 py-3 border-b border-slate-800 last:border-0">
            <span className="text-2xl">{p.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-white">{p.label}</span>
                <span
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{ background: riskBadgeColor(p.riskLevel), color: '#fef2f2', opacity: 0.9 }}
                >
                  {riskBadge(p.riskLevel)}
                </span>
              </div>
              <p className="text-xs text-slate-500">{p.description}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs font-semibold" style={{ color: stateColor(p.state) }}>
                {stateLabel(p.state)}
              </span>
              {p.state === 'prompt' && (
                <button
                  onClick={() => onRequest(p.name)}
                  className="text-xs px-2 py-0.5 rounded bg-cyan-900 text-cyan-300 hover:bg-cyan-800 transition-colors"
                >
                  Sprawdź
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="card bg-blue-950/30 border-blue-900 text-xs text-slate-400">
        <p className="text-blue-300 font-semibold mb-1">💡 Co oznaczają statusy?</p>
        <p><span className="text-green-400">Przyznane</span> — aplikacja ma dostęp do tego zasobu</p>
        <p><span className="text-amber-400">Nieokreślone</span> — będzie zapytanie przy pierwszym użyciu</p>
        <p><span className="text-slate-400">Odmówione</span> — dostęp zablokowany</p>
        <p className="mt-1 text-slate-500">
          Uwaga: Ta aplikacja działa w przeglądarce. Pełny audyt uprawnień aplikacji wymaga systemowych narzędzi Android/iOS.
        </p>
      </div>
    </div>
  )
}

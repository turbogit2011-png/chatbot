import { useState } from 'react'
import type { TabId } from './types'
import { useMonitoring } from './hooks/useMonitoring'
import { Overview } from './components/Overview'
import { BatteryPanel } from './components/BatteryPanel'
import { NetworkPanel } from './components/NetworkPanel'
import { PermissionsPanel } from './components/PermissionsPanel'
import { AnomalyLog } from './components/AnomalyLog'

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'overview',     label: 'Przegląd',    icon: '🛡️' },
  { id: 'battery',      label: 'Bateria',      icon: '🔋' },
  { id: 'network',      label: 'Sieć',         icon: '🌐' },
  { id: 'permissions',  label: 'Uprawnienia',  icon: '🔑' },
  { id: 'log',          label: 'Dziennik',     icon: '📋' },
]

function criticalCount(anomalies: { severity: string }[]): number {
  return anomalies.filter(a => a.severity === 'critical').length
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const { appState, clearAnomalies, testMicrophone, testCamera, requestPermission } = useMonitoring()

  const { isMonitoring, lastUpdate, anomalies, riskScore } = appState

  const riskColor = riskScore <= 25 ? '#22c55e' : riskScore <= 50 ? '#f59e0b' : riskScore <= 75 ? '#f97316' : '#ef4444'
  const critCount = criticalCount(anomalies)

  return (
    <div className="min-h-dvh flex flex-col bg-[#020817] max-w-lg mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#020817]/95 backdrop-blur border-b border-slate-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🛡️</span>
            <div>
              <h1 className="text-base font-bold text-white leading-none">PhoneGuard</h1>
              <p className="text-xs text-slate-500">Detektor Anomalii</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Risk badge */}
            <div
              className="px-2 py-1 rounded-lg text-xs font-bold border"
              style={{ color: riskColor, borderColor: riskColor + '40', background: riskColor + '15' }}
            >
              Ryzyko: {riskScore}
            </div>
            {/* Monitoring indicator */}
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isMonitoring ? 'status-dot-ok blink' : 'status-dot-warn'}`} />
              <span className="text-xs text-slate-400">{isMonitoring ? 'Aktywny' : 'Start…'}</span>
            </div>
          </div>
        </div>

        {/* Critical alert strip */}
        {critCount > 0 && (
          <div className="mt-2 px-2 py-1 rounded-lg bg-red-950/60 border border-red-800 flex items-center gap-2">
            <span className="text-red-400 blink text-sm">🚨</span>
            <span className="text-red-300 text-xs font-medium">
              {critCount} krytycz{critCount === 1 ? 'ne' : 'nych'} zagrożeni{critCount === 1 ? 'e' : 'a'} wykryt{critCount === 1 ? 'e' : 'ych'}
            </span>
          </div>
        )}
      </header>

      {/* Tab content */}
      <main className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {activeTab === 'overview'    && <Overview state={appState} />}
        {activeTab === 'battery'     && <BatteryPanel state={appState} />}
        {activeTab === 'network'     && <NetworkPanel state={appState} />}
        {activeTab === 'permissions' && (
          <PermissionsPanel
            state={appState}
            onTestMic={testMicrophone}
            onTestCam={testCamera}
            onRequest={requestPermission}
          />
        )}
        {activeTab === 'log' && (
          <AnomalyLog anomalies={anomalies} onClear={clearAnomalies} />
        )}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 max-w-lg mx-auto bg-[#020817]/95 backdrop-blur border-t border-slate-800">
        <div className="flex">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id
            const badge = tab.id === 'log' && critCount > 0 ? critCount : null
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs transition-colors relative ${
                  isActive ? 'text-cyan-400 tab-active' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <span className="text-lg leading-none relative">
                  {tab.icon}
                  {badge && (
                    <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </span>
                <span className="leading-none">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* Footer info */}
      <div className="fixed bottom-16 left-0 right-0 max-w-lg mx-auto pointer-events-none">
        <p className="text-center text-[10px] text-slate-700 px-2">
          Ostatnia aktualizacja: {new Date(lastUpdate).toLocaleTimeString('pl-PL')}
        </p>
      </div>
    </div>
  )
}

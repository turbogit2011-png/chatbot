interface Props {
  score: number
}

const RADIUS = 80
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function riskColor(score: number): string {
  if (score <= 25) return '#22c55e'
  if (score <= 50) return '#f59e0b'
  if (score <= 75) return '#f97316'
  return '#ef4444'
}

function riskLabel(score: number): string {
  if (score <= 25) return 'Bezpieczny'
  if (score <= 50) return 'Umiarkowane ryzyko'
  if (score <= 75) return 'Wysokie ryzyko'
  return 'Krytyczne zagrożenie'
}

export function RiskGauge({ score }: Props) {
  const dashArray = (score / 100) * CIRCUMFERENCE
  const color = riskColor(score)

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="200" height="200" viewBox="0 0 200 200">
        {/* Track */}
        <circle cx="100" cy="100" r={RADIUS} fill="none" stroke="#1e293b" strokeWidth="16" />
        {/* Filled arc */}
        <circle
          cx="100" cy="100" r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={`${dashArray} ${CIRCUMFERENCE}`}
          transform="rotate(-90 100 100)"
          className="gauge-ring"
        />
        {/* Score text */}
        <text x="100" y="94" textAnchor="middle" fill={color} fontSize="38" fontWeight="bold" fontFamily="system-ui">
          {score}
        </text>
        <text x="100" y="116" textAnchor="middle" fill="#64748b" fontSize="12" fontFamily="system-ui">
          / 100
        </text>
      </svg>
      <span className="text-lg font-semibold" style={{ color }}>{riskLabel(score)}</span>
    </div>
  )
}

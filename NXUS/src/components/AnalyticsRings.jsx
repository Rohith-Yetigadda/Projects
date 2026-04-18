import { memo } from 'react'
import { Flame, Trophy } from 'lucide-react'
import useMediaQuery from '../hooks/useMediaQuery'

const quotes = [
  "Consistency is key.", "Focus on the process.", "Small wins matter.",
  "Day one or one day.", "Keep showing up.", "Progress, not perfection.",
  "Show up daily.", "Little by little."
]
export const dailyQuote = quotes[Math.floor(Math.random() * quotes.length)]

function ProgressRing({ id, gradId, color1, color2, percent, label, valueId }) {
  const radius = 34
  const circ = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, percent))
  const offset = circ - (clamped / 100) * circ
  return (
    <div className="ring-block">
      <div className="ring" id={id}>
        <svg viewBox="0 0 80 80">
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={color1} />
              <stop offset="100%" stopColor={color2} />
            </linearGradient>
          </defs>
          <circle className="ring-bg" cx="40" cy="40" r={radius} />
          <circle
            className="ring-progress"
            cx="40" cy="40" r={radius}
            strokeDasharray={`${circ} ${circ}`}
            strokeDashoffset={offset}
            stroke={`url(#${gradId})`}
          />
        </svg>
        <span id={valueId}>{Math.round(clamped)}%</span>
      </div>
      <div className="ring-label">{label}</div>
    </div>
  )
}

function AnalyticsRings({ stats }) {
  const isMobile = useMediaQuery('(max-width: 768px)')
  const { effPct, todayPct, momPct, streak, bestDay, todayNet } = stats || { 
    effPct:0, todayPct:0, momPct:0, streak:0, bestDay:0, todayNet:0 
  }
  const pbPct = bestDay > 0 ? Math.max(0, Math.min((todayNet / bestDay) * 100, 100)) : 0

  return (
    <section className="analytics">
      {/* Rings row — stays horizontal on both desktop and mobile */}
      <div className="rings-row">
        <ProgressRing
          id="ring-efficiency" gradId="grad-teal" label="Efficiency"
          color1="#2dd4bf" color2="#0d9488" percent={effPct} valueId="efficiencyPct"
        />
        <ProgressRing
          id="ring-today" gradId="grad-cyan" label="Today"
          color1="#3b82f6" color2="#2563eb" percent={todayPct} valueId="todayPct"
        />
        <ProgressRing
          id="ring-momentum" gradId="grad-yellow" label="Momentum"
          color1="#facc15" color2="#fbbf24" percent={momPct} valueId="momentumPct"
        />
      </div>

      {/* Streak + Quote — hidden on mobile via code instead of CSS to avoid duplicate DOM */}
      {!isMobile && (
        <div className="streak-widget">
          <div className="streak-info">
            <div className="streak-count">
              <Flame className="streak-icon" />
              <span id="streakValue">{streak}</span>
            </div>
            <div className="streak-label">Current Streak</div>
          </div>
          <div id="dailyQuote" className="quote-text">{dailyQuote}</div>
        </div>
      )}

      {/* Personal Best */}
      <div className="personal-best-widget">
        <div className="pb-header">
          <Trophy className="pb-icon" />
          <span className="pb-label">Personal Best</span>
        </div>
        <div className="pb-score">
          <span id="pbValue">{bestDay}</span>
          <span className="pb-unit">pts</span>
        </div>
        <div className="pb-bar-wrap">
          <div className="pb-bar">
            <div className="pb-fill" id="pbFill" style={{ width: pbPct + '%' }} />
          </div>
          <span className="pb-today" id="pbToday">Today: {todayNet > 0 ? '+' : ''}{todayNet}</span>
        </div>
      </div>
    </section>
  )
}

export default memo(AnalyticsRings)

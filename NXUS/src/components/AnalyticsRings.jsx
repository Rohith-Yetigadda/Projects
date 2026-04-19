import { memo, useState } from 'react'
import { Flame, Trophy } from 'lucide-react'
import useMediaQuery from '../hooks/useMediaQuery'

const quotes = [
  "Consistency is key.", "Focus on the process.", "Small wins matter.",
  "Day one or one day.", "Keep showing up.", "Progress, not perfection.",
  "Show up daily.", "Little by little."
]
export const dailyQuote = quotes[Math.floor(Math.random() * quotes.length)]

function ProgressRing({ id, gradId, color1, color2, percent, label, valueId, info }) {
  const [showInfo, setShowInfo] = useState(false)
  const radius = 34
  const circ = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, percent))
  const offset = circ - (clamped / 100) * circ
  return (
    <div 
      className="ring-block"
      onMouseEnter={() => setShowInfo(true)}
      onMouseLeave={() => setShowInfo(false)}
      onClick={() => setShowInfo(!showInfo)}
      style={{ position: 'relative', cursor: 'pointer' }}
    >
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
      {showInfo && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translate(-50%, -10px)',
          backgroundColor: '#1e293b',
          color: '#f8fafc',
          padding: '8px 12px',
          borderRadius: '8px',
          fontSize: '0.75rem',
          width: 'max-content',
          maxWidth: '200px',
          textAlign: 'center',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
          zIndex: 50,
          pointerEvents: 'none',
          lineHeight: '1.4'
        }}>
          {info}
          <div style={{
            position: 'absolute',
            bottom: '-4px',
            left: '50%',
            transform: 'translateX(-50%) rotate(45deg)',
            width: '8px',
            height: '8px',
            backgroundColor: '#1e293b'
          }} />
        </div>
      )}
    </div>
  )
}

function AnalyticsRings({ stats }) {
  const isMobile = useMediaQuery('(max-width: 768px)')
    const { effPct, todayPct, momPct, streak, bestDay, bestDayCount, todayNet, isCurrentMonth, isPastMonth } = stats || { 
      effPct:0, todayPct:0, momPct:0, streak:0, bestDay:0, bestDayCount:0, todayNet:0, isCurrentMonth: true, isPastMonth: false 
    }
    const pbPct = bestDay > 0 ? Math.max(0, Math.min((todayNet / bestDay) * 100, 100)) : 0
  
    const todayLabel = isCurrentMonth ? "Today" : isPastMonth ? "Month End" : "Day 1"
    const pbTodayLabel = isCurrentMonth ? "Today: " : isPastMonth ? "Month End: " : ""
  
    return (
      <section className="analytics">
        {/* Rings row — stays horizontal on both desktop and mobile */}
        <div className="rings-row">
          <ProgressRing
            id="ring-efficiency" gradId="grad-teal" label="Efficiency"
            color1="#2dd4bf" color2="#0d9488" percent={effPct} valueId="efficiencyPct"
            info="Measures overall habit consistency based on their weights and expected frequency."
          />
          <ProgressRing
            id="ring-today" gradId="grad-cyan" label={todayLabel}
            color1="#3b82f6" color2="#2563eb" percent={todayPct} valueId="todayPct"
            info="Shows your progress for today compared to the maximum possible points."
          />
          <ProgressRing
            id="ring-momentum" gradId="grad-yellow" label="Momentum"
            color1="#facc15" color2="#fbbf24" percent={momPct} valueId="momentumPct"
            info="Tracks your consistency over the past 5 days."
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
            {bestDayCount > 0 && <span className="pb-count" style={{ fontSize: '12px', marginLeft: '4px', color: 'var(--muted)', fontWeight: '600' }}>({bestDayCount}x)</span>}
          </div>
          <div className="pb-bar-wrap">
            <div className="pb-bar">
              <div className="pb-fill" id="pbFill" style={{ width: pbPct + '%' }} />
            </div>
            {pbTodayLabel && (
              <span className="pb-today" id="pbToday">{pbTodayLabel}{todayNet > 0 ? '+' : ''}{todayNet}</span>
            )}
          </div>
        </div>
      </section>
    )
  }

export default memo(AnalyticsRings)

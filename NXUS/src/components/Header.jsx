import { useState, useRef, useEffect, memo } from 'react'
import { TrendingUp, Zap, Target, AlertTriangle, Sunrise, Flame } from 'lucide-react'
import useMediaQuery from '../hooks/useMediaQuery'

const monthNames = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
]

function MonthDropdown({ currentMonth, onMonthChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handleOutside = (e) => { if (!ref.current?.contains(e.target)) setIsOpen(false) }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  return (
    <div ref={ref} className="dropdown">
      <button
        type="button"
        className={`dropdown-button ${isOpen ? 'active-dropdown-btn' : ''}`}
        onClick={() => setIsOpen(p => !p)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span>{monthNames[currentMonth]}</span>
      </button>
      {isOpen && (
        <div className="dropdown-menu open" style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, minWidth: 130 }}>
          {monthNames.map((name, i) => (
            <button
              key={name}
              type="button"
              className="dropdown-item"
              onClick={() => { onMonthChange(i); setIsOpen(false) }}
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const STATUS_MAP = [
  { min: 70, label: 'CRUSHING IT', Icon: Zap },
  { min: 50, label: 'ON TRACK',    Icon: TrendingUp },
  { min: 30, label: 'KEEP PUSHING',Icon: Target },
  { min: 20, label: 'NEEDS WORK',  Icon: AlertTriangle },
  { min: 0,  label: 'JUST STARTING', Icon: Sunrise },
]

function Header({ isMenuOpen, onMenuToggle, year, monthIndex, onYearChange, onMonthChange, habits, stats }) {
  const isMobile = useMediaQuery('(max-width: 768px)')
  const now = new Date()
  const effectiveYear = year || now.getFullYear()
  const isThisMonth = effectiveYear === now.getFullYear() && monthIndex === now.getMonth()
  const totalDays = new Date(effectiveYear, monthIndex + 1, 0).getDate()
  const todayIdx = isThisMonth ? now.getDate() - 1 : totalDays - 1
  const daysPassed = todayIdx + 1

  // Monthly progress (raw completion) — matches original script.js Section 4
  let totalChecks = 0, totalPossible = 0
  habits.forEach(h => {
    const checks = (h.days || []).slice(0, daysPassed).filter(Boolean).length
    if (h.type === 'positive') {
      totalChecks += checks
      totalPossible += daysPassed
    } else if (h.type === 'negative') {
      totalChecks += (daysPassed - checks) // 100% completion if none slipped
      totalPossible += daysPassed
    }
  })
  const monthlyProgress = totalPossible ? (totalChecks / totalPossible) * 100 : 0
  const pct = Math.round(monthlyProgress)

  const status = STATUS_MAP.find(s => monthlyProgress >= s.min) || STATUS_MAP[STATUS_MAP.length - 1]
  const { label, Icon } = status

  // Trend vs prev 7 days
  let recentScore = 0, recentMax = 0, prevScore = 0, prevMax = 0
  habits.forEach(h => {
    if (h.type !== 'positive') return
    for (let i = 0; i < 7; i++) {
      const d = todayIdx - i
      if (d >= 0) { recentMax++; if (h.days?.[d]) recentScore++ }
    }
    for (let i = 7; i < 14; i++) {
      const d = todayIdx - i
      if (d >= 0) { prevMax++; if (h.days?.[d]) prevScore++ }
    }
  })
  const recentPct = recentMax ? (recentScore / recentMax) * 100 : 0
  const prevPct   = prevMax  ? (prevScore  / prevMax)  * 100 : 0
  const trendDiff = Math.round(recentPct - prevPct)
  const trendText = prevMax === 0 ? null
    : trendDiff > 0 ? `↑ +${trendDiff}% vs last week`
    : trendDiff < 0 ? `↓ ${trendDiff}% vs last week`
    : `→ same as last week`
  const trendColor = trendDiff > 0 ? 'var(--accent)' : trendDiff < 0 ? '#ef4444' : 'var(--muted)'

  return (
    <header className="top">
      <div className="top-left">
        <button
          className={`hamburger-btn ${isMenuOpen ? 'open' : ''}`}
          onClick={onMenuToggle}
          type="button"
          aria-label="Toggle menu"
        >
          <span /><span /><span />
        </button>
        <div className="date-picker">
          <input
            type="number"
            value={year || ''}
            onChange={e => {
              const val = e.target.value
              onYearChange(val === '' ? '' : parseInt(val))
            }}
            onBlur={() => {
              if (!year || year < 2000 || year > 2100) onYearChange(now.getFullYear())
            }}
            placeholder="YYYY"
          />
          <MonthDropdown currentMonth={monthIndex} onMonthChange={onMonthChange} />
        </div>
      </div>

      <div className="top-logo">NXUS</div>

      <div className="headline">
        <div className="headline-label" id="statusLabel" style={{ color: 'var(--accent)' }}>
          <Icon className="headline-icon" />
          <span>{label}</span>
        </div>
        <h1 className="gradient-text">{pct}%</h1>
        {trendText && (
          <span className="trend-arrow" style={{ color: trendColor }}>{trendText}</span>
        )}
      </div>

      {isMobile && (
        <div className="streak-info mobile-view">
          <div className="streak-count">
            <Flame className="streak-icon" />
            <span id="streakValue">{stats?.streak || 0}</span>
          </div>
          <div className="streak-label">CURRENT STREAK</div>
        </div>
      )}
    </header>
  )
}

export default memo(Header)

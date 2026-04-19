import { useMemo, useRef, useState, useEffect, useCallback, memo } from 'react'

const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function ActivityGraph({ habits, year, monthIndex }) {
  const containerRef = useRef(null)
  const [width, setWidth] = useState(800)
  const [hovered, setHovered] = useState(null)
  const [isPinned, setIsPinned] = useState(false)

  const HEIGHT = 150
  const PADDING = 15
  const TOP_PAD = 30
  const BOTTOM_PAD = 20
  const GRAPH_BOTTOM = HEIGHT - BOTTOM_PAD

  const now = new Date()
  const totalDays = new Date(year, monthIndex + 1, 0).getDate()
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === monthIndex
  const isPastMonth = year < now.getFullYear() || (year === now.getFullYear() && monthIndex < now.getMonth())
  const isFutureMonth = year > now.getFullYear() || (year === now.getFullYear() && monthIndex > now.getMonth())
  const maxDotIndex = isCurrentMonth ? now.getDate() - 1 : isPastMonth ? totalDays - 1 : 0

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      setWidth(entries[0].contentRect.width || 800)
    })
    ro.observe(el)
    setWidth(el.getBoundingClientRect().width || 800)
    return () => ro.disconnect()
  }, [])

  const points = useMemo(() => {
    const scores = Array.from({ length: totalDays }, (_, d) => {
      let s = 0
      habits.forEach(h => { if (h.days?.[d]) s += h.type === 'negative' ? -1 : 1 })
      return s
    })
    const minVal = Math.min(...scores, 0)
    const maxVal = Math.max(...scores, 1)
    const range = maxVal - minVal || 1
    const drawWidth = width - PADDING * 2
    const mapY = v => GRAPH_BOTTOM - ((v - minVal) / range) * (GRAPH_BOTTOM - TOP_PAD)

    return scores.map((score, i) => {
      const x = PADDING + (i / Math.max(1, totalDays - 1)) * drawWidth
      const y = mapY(score)
      const pos = habits.filter(h => h.days?.[i] && h.type === 'positive').length
      const neg = habits.filter(h => h.days?.[i] && h.type === 'negative').length
      return { x, y, score, pos, neg, day: i + 1, index: i, mapY }
    })
  }, [habits, totalDays, width])

  const zeroY = useMemo(() => {
    if (!points.length) return GRAPH_BOTTOM
    return points[0].mapY(0)
  }, [points])

  const { pathD, areaD } = useMemo(() => {
    if (points.length < 2) return { pathD: '', areaD: '' }
    let d = `M ${points[0].x} ${points[0].y}`
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(i - 1, 0)]
      const p1 = points[i]
      const p2 = points[i + 1]
      const p3 = points[Math.min(i + 2, points.length - 1)]
      const cp1x = p1.x + (p2.x - p0.x) * 0.15
      const cp1y = p1.y + (p2.y - p0.y) * 0.15
      const cp2x = p2.x - (p3.x - p1.x) * 0.15
      const cp2y = p2.y - (p3.y - p1.y) * 0.15
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
    }
    const last = points[points.length - 1]
    const area = `${d} L ${last.x} ${GRAPH_BOTTOM} L ${points[0].x} ${GRAPH_BOTTOM} Z`
    return { pathD: d, areaD: area }
  }, [points])

  const todayNet = useMemo(() => {
    if (!points.length) return 0
    if (isFutureMonth) return 0
    const idx = isCurrentMonth ? now.getDate() - 1 : totalDays - 1
    return habits.reduce((s, h) => s + (h.days?.[idx] ? (h.type === 'positive' ? 1 : -1) : 0), 0)
  }, [habits, isCurrentMonth, isFutureMonth, totalDays, points.length])

  const findClosest = useCallback((relX) => {
    let closest = points[0], minDiff = Infinity
    points.forEach(p => {
      const diff = Math.abs(p.x - relX)
      if (diff < minDiff) { minDiff = diff; closest = p }
    })
    return closest
  }, [points])

  const handleMove = useCallback((e) => {
    if (isPinned) return
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const relX = (clientX - rect.left) / rect.width * width
    setHovered(findClosest(relX))
  }, [isPinned, width, findClosest])

  const handleClick = useCallback((e) => {
    e.preventDefault()
    if (isPinned) { setIsPinned(false); setHovered(null); return }
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const relX = (e.clientX - rect.left) / rect.width * width
    setHovered(findClosest(relX))
    setIsPinned(true)
  }, [isPinned, width, findClosest])

  const handleLeave = useCallback(() => {
    if (!isPinned) setHovered(null)
  }, [isPinned])

  useEffect(() => {
    const handler = (e) => {
      if (isPinned && containerRef.current && !containerRef.current.contains(e.target)) {
        setIsPinned(false); setHovered(null)
      }
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [isPinned])

  const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#63e6a4'

  const scoreEl = todayNet > 0 ? {
    bg: 'rgba(99,230,164,0.15)', border: 'rgba(99,230,164,0.3)', color: '#63e6a4', shadow: '0 0 12px rgba(99,230,164,0.15)'
  } : todayNet < 0 ? {
    bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)', color: '#ef4444', shadow: '0 0 12px rgba(239,68,68,0.15)'
  } : {
    bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', shadow: 'none'
  }

  return (
    <section className="today-focus">
      <div className="today-header">
        <div className="today-header-title">
          <h2>Activity Graph</h2>
        </div>
        <div
          className="graph-summary"
          style={{ background: scoreEl.bg, borderColor: scoreEl.border, color: scoreEl.color, boxShadow: scoreEl.shadow }}
        >
          {isPastMonth ? 'Month End ' : isFutureMonth ? '' : 'Today '}{todayNet > 0 ? '+' : ''}{todayNet}
        </div>
      </div>

      <div className="graph-container" ref={containerRef}>
        {hovered && hovered.index <= maxDotIndex && (
          <div
            className="graph-tooltip"
            style={{ 
              opacity: 1, 
              left: (hovered.x / width * 100) + '%', 
              top: (hovered.y / HEIGHT * 100) - 30 + '%',
              transform: hovered.x > width - 100 ? 'translateX(-100%)' : hovered.x < 100 ? 'translateX(0)' : 'translateX(-50%)'
            }}
          >
            <span className="tooltip-date">{monthNames[monthIndex]} {hovered.day}</span>
            <div className="tooltip-stats">
              {hovered.pos > 0 && <span className="stat-item" style={{ color: 'var(--accent)' }}>{hovered.pos} done</span>}
              {hovered.neg > 0 && <span className="stat-item" style={{ color: '#ef4444' }}>{hovered.neg} slip</span>}
              {hovered.pos === 0 && hovered.neg === 0 && <span className="stat-item" style={{ color: 'var(--muted)' }}>No activity</span>}
            </div>
          </div>
        )}

        <svg
          id="activityGraph"
          viewBox={`0 0 ${width} ${HEIGHT}`}
          preserveAspectRatio="none"
          onMouseMove={handleMove}
          onMouseLeave={handleLeave}
          onClick={handleClick}
          onTouchMove={handleMove}
        >
          <defs>
            <linearGradient id="gradient-area" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={accentColor} stopOpacity="0.3" />
              <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
            </linearGradient>
          </defs>

          <line
            x1="0" y1={zeroY} x2={width} y2={zeroY}
            stroke="rgba(128,128,128,0.2)" strokeWidth="1" strokeDasharray="4 4"
          />

          {areaD && <path className="graph-area" d={areaD} />}
          {pathD  && <path className="graph-path"  d={pathD}  />}

          <g>
            {points.map(p => (
              <circle
                key={p.day}
                className="graph-dot"
                cx={p.x} cy={p.y} r="3"
                style={{ display: p.index > maxDotIndex ? 'none' : 'block' }}
              />
            ))}
          </g>

          {hovered && (
            <circle
              id="activeDot"
              className={hovered.index <= maxDotIndex ? 'is-active' : ''}
              cx={hovered.x} cy={hovered.y}
            />
          )}

          <rect
            className="graph-overlay"
            width={width} height={HEIGHT}
          />
        </svg>
      </div>
    </section>
  )
}

export default memo(ActivityGraph)

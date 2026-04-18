/**
 * HeatmapGrid
 * -----------
 * Renders a monthly activity heatmap inside the side menu.
 * Each cell is colored by the net activity score for that day:
 *
 *   score < 0  → red   (active-neg)
 *   score > 0
 *     intensity < 0.4  → active-low  (faint accent)
 *     intensity < 0.7  → active-med  (medium accent)
 *     intensity ≥ 0.7  → active-high (full accent glow)
 *   score = 0  → empty (default heat-box)
 *
 * Props
 * -----
 * habits     – array of habit objects (with .days[] and .type)
 * year       – number
 * monthIndex – 0-based month index
 */
function HeatmapGrid({ habits, year, monthIndex }) {
  const totalDays  = new Date(year, monthIndex + 1, 0).getDate()
  const posCount   = habits.filter(h => h.type === 'positive').length

  const cells = Array.from({ length: totalDays }, (_, i) => {
    let score = 0
    habits.forEach(h => {
      if (h.days?.[i]) score += h.type === 'positive' ? 1 : -1
    })

    if (score < 0) return 'active-neg'
    if (score > 0) {
      const intensity = score / (posCount || 1)
      if (intensity < 0.4) return 'active-low'
      if (intensity < 0.7) return 'active-med'
      return 'active-high'
    }
    return ''
  })

  return (
    <div className="heatmap-grid" id="streakHeatmap">
      {cells.map((cls, i) => (
        <div key={i} className={`heat-box ${cls}`} />
      ))}
    </div>
  )
}

export default HeatmapGrid

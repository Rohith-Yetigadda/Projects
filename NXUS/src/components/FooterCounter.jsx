import { useMemo } from 'react'

const classifyHabit = (h) => {
  const ratio = (h.goal || h.days.length) / h.days.length
  if (ratio >= 0.65) return 'daily'
  if (ratio >= 0.25) return 'regular'
  return 'periodic'
}

function FooterCounter({ habits, year, monthIndex }) {
  const now = new Date()
  const isThisMonth = now.getFullYear() === year && now.getMonth() === monthIndex
  const totalDays = new Date(year, monthIndex + 1, 0).getDate()
  const todayIdx = isThisMonth ? now.getDate() - 1 : totalDays - 1
  const daysPassed = todayIdx + 1

  const stats = useMemo(() => {
    let dailyDone = 0, dailyTotal = 0
    let periodicOnPace = 0, periodicTotal = 0
    let todaySlips = 0, negTotal = 0

    habits.forEach(h => {
      if (h.type === 'negative') {
        negTotal++
        if (h.days?.[todayIdx]) todaySlips++
        return
      }
      const tier = classifyHabit(h)
      if (tier === 'daily' || tier === 'regular') {
        dailyTotal++
        if (h.days?.[todayIdx]) dailyDone++
      } else {
        periodicTotal++
        const goal = h.goal || h.days.length
        const expected = (goal / h.days.length) * daysPassed
        const checks = (h.days || []).slice(0, daysPassed).filter(Boolean).length
        if (checks >= expected - 1) periodicOnPace++
      }
    })
    return { dailyDone, dailyTotal, periodicOnPace, periodicTotal, todaySlips, negTotal }
  }, [habits, todayIdx, daysPassed])

  const { dailyDone, dailyTotal, periodicOnPace, periodicTotal, todaySlips, negTotal } = stats

  return (
    <div className="counter">
      <span>Today: </span>
      <span style={{ color: '#63e6a4' }}>{dailyDone}/{dailyTotal}</span>
      <span> done</span>
      {periodicTotal > 0 && (
        <>
          <span style={{ opacity: 0.3, margin: '0 6px' }}>|</span>
          <span style={{ color: 'var(--cyan)' }}>{periodicOnPace}/{periodicTotal}</span>
          <span> on pace</span>
        </>
      )}
      {negTotal > 0 && (
        <>
          <span style={{ opacity: 0.3, margin: '0 6px' }}>|</span>
          <span style={{ color: '#ef4444' }}>{todaySlips}/{negTotal}</span>
          <span> slips</span>
        </>
      )}
    </div>
  )
}

export default FooterCounter

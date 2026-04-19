import { useMemo } from 'react'

const classifyHabit = (h) => {
  const ratio = (h.goal || h.days.length) / h.days.length
  if (ratio >= 0.65) return 'daily'
  if (ratio >= 0.25) return 'regular'
  return 'periodic'
}

const getHabitEfficiency = (h, daysPassed) => {
  const goal = h.goal || h.days.length
  const checks = (h.days || []).slice(0, daysPassed).filter(Boolean).length
  if (h.type === 'negative') {
    if (daysPassed === 0) return 1.0
    return (daysPassed - checks) / daysPassed
  }
  const tier = classifyHabit(h)
  const expectedNow = (goal / h.days.length) * daysPassed
  if (tier === 'daily') return checks / daysPassed
  if (tier === 'regular') {
    if (expectedNow < 0.5) return 1.0
    return Math.min(checks / (expectedNow * 0.75), 1.0)
  }
  if (expectedNow < 0.8) return 1.0
  return Math.min(checks / (expectedNow * 0.6), 1.0)
}

const checkStreakDay = (habits, dayIdx) => {
  let posScore = 0, posMax = 0
  habits.forEach(h => {
    if (h.type !== 'positive') return
    const w = Number(h.weight) || 2
    const tier = classifyHabit(h)
    if (tier === 'daily' || tier === 'regular') {
      posMax += w
      if (h.days?.[dayIdx]) posScore += w
    }
  })
  const posPass = posMax === 0 || (posScore / posMax) >= 0.50

  let negSlipWeight = 0, negTotalWeight = 0
  habits.forEach(h => {
    if (h.type !== 'negative') return
    const w = Number(h.weight) || 2
    negTotalWeight += w
    if (h.days?.[dayIdx]) negSlipWeight += w
  })
  const negPass = negTotalWeight === 0 || (negSlipWeight / negTotalWeight) <= 0.50
  return posPass && negPass
}

export default function useHabitStats(habits, year, monthIndex) {
  const now = new Date()
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === monthIndex
  const isPastMonth = year < now.getFullYear() || (year === now.getFullYear() && monthIndex < now.getMonth())
  const isFutureMonth = year > now.getFullYear() || (year === now.getFullYear() && monthIndex > now.getMonth())
  const totalDays = new Date(year, monthIndex + 1, 0).getDate()
  
  let todayIdx = -1
  let daysPassed = 0
  
  if (isCurrentMonth) {
    todayIdx = now.getDate() - 1
    daysPassed = todayIdx + 1
  } else if (isPastMonth) {
    todayIdx = totalDays - 1
    daysPassed = totalDays
  } else if (isFutureMonth) {
    todayIdx = 0
    daysPassed = 0
  }

  return useMemo(() => {
    if (!habits || habits.length === 0) {
      return { effPct: 0, todayPct: 0, momPct: 0, streak: 0, bestDay: 0, todayNet: 0, daysPassed, todayIdx, isCurrentMonth, isPastMonth, isFutureMonth }
    }

    let totalEfficiency = 0, totalWeight = 0
    let todayScore = 0, todayMax = 0

    habits.forEach(h => {
      const w = Number(h.weight) || 2
      totalEfficiency += getHabitEfficiency(h, daysPassed) * w
      totalWeight += w
      if (h.type === 'negative') {
        todayScore += h.days?.[todayIdx] ? 0 : w
        todayMax += w
      } else {
        todayScore += h.days?.[todayIdx] ? w : 0
        todayMax += w
      }
    })

    const effPct = totalWeight ? (totalEfficiency / totalWeight) * 100 : 0
    const todayPct = todayMax ? (todayScore / todayMax) * 100 : 0

    const lookback = Math.min(5, daysPassed)
    let momentumSum = 0, momentumMax = 0
    for (let i = 0; i < lookback; i++) {
      const d = todayIdx - i
      if (d < 0) break
      habits.forEach(h => {
        const w = Number(h.weight) || 2
        momentumMax += w
        if (h.type === 'negative') { if (!h.days?.[d]) momentumSum += w }
        else { if (h.days?.[d]) momentumSum += w }
      })
    }
    const momPct = momentumMax ? (momentumSum / momentumMax) * 100 : 0

    let streak = 0
    for (let d = todayIdx - 1; d >= 0; d--) {
      if (checkStreakDay(habits, d)) streak++
      else break
    }
    if (checkStreakDay(habits, todayIdx)) streak++

    let bestDay = 0
    let bestDayCount = 0
    for (let d = 0; d < totalDays; d++) {
      let dayScore = 0
      habits.forEach(h => { if (h.days?.[d]) dayScore += h.type === 'positive' ? 1 : -1 })
      if (dayScore > bestDay) {
        bestDay = dayScore
        bestDayCount = 1
      } else if (dayScore === bestDay && bestDay > 0) {
        bestDayCount++
      }
    }

    const todayNet = habits.reduce((s, h) => s + (h.days?.[todayIdx] ? (h.type === 'positive' ? 1 : -1) : 0), 0)

    return { effPct, todayPct, momPct, streak, bestDay, bestDayCount, todayNet, daysPassed, todayIdx, isCurrentMonth, isPastMonth, isFutureMonth }
  }, [habits, year, monthIndex, totalDays, todayIdx, daysPassed, isCurrentMonth, isPastMonth, isFutureMonth])
}

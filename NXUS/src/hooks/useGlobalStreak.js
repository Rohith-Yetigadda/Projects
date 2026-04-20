import { useState, useEffect } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../services/firebase'
import { checkStreakDay, getMomentumDay } from './useHabitStats'

function getDaysInMonth(y, m) {
  return new Date(y, m + 1, 0).getDate()
}

export default function useGlobalStreak(userUid, currentHabits, initialYear, initialMonthIndex) {
  const [globalStats, setGlobalStats] = useState({ globalStreak: 0, globalMomPct: 0 })

  useEffect(() => {
    if (!userUid || !currentHabits || currentHabits.length === 0) {
      setGlobalStats({ globalStreak: 0, globalMomPct: 0 })
      return
    }

    let isSubscribed = true

    const calculate = async () => {
      const now = new Date()
      const isFutureMonth = initialYear > now.getFullYear() || (initialYear === now.getFullYear() && initialMonthIndex > now.getMonth())
      
      if (isFutureMonth) {
        if (isSubscribed) setGlobalStats({ globalStreak: 0, globalMomPct: 0 })
        return
      }

      const y = initialYear
      const m = initialMonthIndex
      const isCurrentMonth = now.getFullYear() === y && now.getMonth() === m
      const checkIdx = isCurrentMonth ? now.getDate() - 1 : getDaysInMonth(y, m) - 1

      let totalStreak = 0
      let broken = false

      let mSum = 0
      let mMax = 0
      let daysChecked = 0 // Needs exactly 5 for rolling momentum

      // 1. Check current month today
      if (checkStreakDay(currentHabits, checkIdx)) {
        totalStreak++
      }
      const momToday = getMomentumDay(currentHabits, checkIdx)
      mSum += momToday.mSum
      mMax += momToday.mMax
      daysChecked++

      // Check remaining trailing days in current month
      for (let d = checkIdx - 1; d >= 0; d--) {
        if (!broken) {
          if (checkStreakDay(currentHabits, d)) totalStreak++
          else broken = true
        }
        if (daysChecked < 5) {
          const mom = getMomentumDay(currentHabits, d)
          mSum += mom.mSum
          mMax += mom.mMax
          daysChecked++
        }
        if (broken && daysChecked >= 5) break
      }

      // 2. Traverse previous months iteratively if the streak hasn't broken OR we haven't grabbed 5 days
      let fetchY = y
      let fetchM = m
      
      while ((!broken || daysChecked < 5) && isSubscribed) {
        fetchM--
        if (fetchM < 0) {
          fetchM = 11
          fetchY--
        }

        try {
          const snap = await getDoc(doc(db, 'users', userUid, 'monthly_data', `${fetchY}-${fetchM}`))
          if (!snap.exists()) {
            break // No more history found
          }
          
          const pastHabits = snap.data()?.habits || []
          if (pastHabits.length === 0) {
            break // No habits configured for this month
          }

          const daysInPastMonth = getDaysInMonth(fetchY, fetchM)
          for (let d = daysInPastMonth - 1; d >= 0; d--) {
            if (!broken) {
              if (checkStreakDay(pastHabits, d)) totalStreak++
              else broken = true
            }
            if (daysChecked < 5) {
              const mom = getMomentumDay(pastHabits, d)
              mSum += mom.mSum
              mMax += mom.mMax
              daysChecked++
            }
            if (broken && daysChecked >= 5) break
          }
        } catch (e) {
          console.error("Failed to fetch historical stats", e)
          break 
        }
      }

      if (isSubscribed) {
        const globalMomPct = mMax ? (mSum / mMax) * 100 : 0
        setGlobalStats({ globalStreak: totalStreak, globalMomPct })
      }
    }

    calculate()

    return () => { isSubscribed = false }
  }, [userUid, currentHabits, initialYear, initialMonthIndex])

  return globalStats
}

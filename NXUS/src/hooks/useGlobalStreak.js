import { useState, useEffect } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../services/firebase'
import { checkStreakDay } from './useHabitStats'

function getDaysInMonth(y, m) {
  return new Date(y, m + 1, 0).getDate()
}

export default function useGlobalStreak(userUid, currentHabits, initialYear, initialMonthIndex) {
  const [globalStreak, setGlobalStreak] = useState(0)

  useEffect(() => {
    if (!userUid || !currentHabits || currentHabits.length === 0) {
      setGlobalStreak(0)
      return
    }

    let isSubscribed = true

    const calculate = async () => {
      const now = new Date()
      const isFutureMonth = initialYear > now.getFullYear() || (initialYear === now.getFullYear() && initialMonthIndex > now.getMonth())
      
      if (isFutureMonth) {
        if (isSubscribed) setGlobalStreak(0)
        return
      }

      const y = initialYear
      const m = initialMonthIndex
      const isCurrentMonth = now.getFullYear() === y && now.getMonth() === m
      const checkIdx = isCurrentMonth ? now.getDate() - 1 : getDaysInMonth(y, m) - 1

      let totalStreak = 0
      let broken = false

      // 1. Check current month
      // The current day is evaluated separately to allow trailing streaks if today is incomplete
      if (checkStreakDay(currentHabits, checkIdx)) {
        totalStreak++
      }

      // Check remaining trailing days in the current month
      for (let d = checkIdx - 1; d >= 0; d--) {
        if (checkStreakDay(currentHabits, d)) {
          totalStreak++
        } else {
          broken = true
          break
        }
      }

      // 2. Traverse previous months iteratively if the streak hasn't broken
      let fetchY = y
      let fetchM = m
      
      while (!broken && isSubscribed) {
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
            if (checkStreakDay(pastHabits, d)) {
              totalStreak++
            } else {
              broken = true
              break
            }
          }
        } catch (e) {
          console.error("Failed to fetch historical streak", e)
          break // Stop on error securely
        }
      }

      if (isSubscribed) {
        setGlobalStreak(totalStreak)
      }
    }

    calculate()

    return () => { isSubscribed = false }
  }, [userUid, currentHabits, initialYear, initialMonthIndex])

  return globalStreak
}

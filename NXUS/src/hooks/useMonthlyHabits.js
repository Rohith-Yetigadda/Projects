import { useCallback, useEffect, useState, useRef } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../services/firebase'

const normalizeHabit = (habit, daysInMonth) => {
  const days = Array.isArray(habit?.days) ? habit.days.slice(0, daysInMonth) : []
  const paddedDays = [...days, ...Array(Math.max(0, daysInMonth - days.length)).fill(false)]

  return {
    id: habit?.id || Date.now().toString() + Math.random().toString(36).substring(2, 5),
    name: habit?.name || 'New Habit',
    type: habit?.type || 'positive',
    weight: habit?.weight || 2,
    goal: habit?.goal || 28,
    days: paddedDays,
  }
}

const getDaysInMonth = (year, monthIndex) => new Date(year, monthIndex + 1, 0).getDate()

function useMonthlyHabits(uid, year, monthIndex) {
  const [habits, setHabits] = useState([])
  const [isHabitsLoading, setIsHabitsLoading] = useState(false)
  const [habitsError, setHabitsError] = useState(null)

  useEffect(() => {
    if (!uid || !year || Number.isNaN(year) || Number.isNaN(monthIndex)) {
      setHabits([])
      return
    }

    let isMounted = true

    const loadMonthlyHabits = async () => {
      setIsHabitsLoading(true)
      setHabitsError(null)

      try {
        const currentDocId = `${year}-${monthIndex}`
        const currentDocRef = doc(db, 'users', uid, 'monthly_data', currentDocId)
        const currentDocSnap = await getDoc(currentDocRef)
        const daysInCurrentMonth = getDaysInMonth(year, monthIndex)

        if (currentDocSnap.exists()) {
          const currentData = currentDocSnap.data()
          const currentHabits = Array.isArray(currentData?.habits) ? currentData.habits : []
          if (isMounted) setHabits(currentHabits.map((h) => normalizeHabit(h, daysInCurrentMonth)))
          return
        }

        let previousMonth = monthIndex - 1
        let previousYear = year
        if (previousMonth < 0) {
          previousMonth = 11
          previousYear = year - 1
        }

        const previousDocId = `${previousYear}-${previousMonth}`
        const previousDocRef = doc(db, 'users', uid, 'monthly_data', previousDocId)
        const previousDocSnap = await getDoc(previousDocRef)

        if (!previousDocSnap.exists()) {
          if (isMounted) setHabits([])
          return
        }

        const previousData = previousDocSnap.data()
        const previousHabits = Array.isArray(previousData?.habits) ? previousData.habits : []
        const copiedHabits = previousHabits.map((habit) => ({
          ...normalizeHabit(habit, daysInCurrentMonth),
          days: Array(daysInCurrentMonth).fill(false),
        }))

        await setDoc(currentDocRef, { habits: copiedHabits }, { merge: true })
        if (isMounted) setHabits(copiedHabits)
      } catch (error) {
        if (isMounted) setHabitsError(error)
      } finally {
        if (isMounted) setIsHabitsLoading(false)
      }
    }

    loadMonthlyHabits()

    return () => {
      isMounted = false
    }
  }, [uid, year, monthIndex])

  const saveHabits = useCallback(
    async (nextHabits) => {
      if (!uid || !year || Number.isNaN(year) || Number.isNaN(monthIndex)) return
      const currentDocId = `${year}-${monthIndex}`
      const currentDocRef = doc(db, 'users', uid, 'monthly_data', currentDocId)
      await setDoc(currentDocRef, { habits: nextHabits }, { merge: true })
    },
    [uid, year, monthIndex],
  )

  const saveTimeoutRef = useRef(null)

  const commitHabitsUpdate = useCallback((updater) => {
    setHabits((prevHabits) => {
      const nextHabitsSnapshot = updater(prevHabits)

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          await saveHabits(nextHabitsSnapshot)
        } catch (error) {
          setHabitsError(error)
        }
      }, 500)

      return nextHabitsSnapshot
    })
  }, [saveHabits])

  const toggleHabitDay = useCallback(
    (habitIndex, dayIndex, checked) => {
      commitHabitsUpdate((prevHabits) =>
        prevHabits.map((habit, index) => {
          if (index !== habitIndex) return habit
          const nextDays = Array.isArray(habit.days) ? [...habit.days] : []
          nextDays[dayIndex] = checked
          return { ...habit, days: nextDays }
        }),
      )
    },
    [commitHabitsUpdate],
  )

  const updateHabitField = useCallback(
    (habitIndex, field, value) => {
      commitHabitsUpdate((prevHabits) =>
        prevHabits.map((habit, index) => {
          if (index !== habitIndex) return habit
          return { ...habit, [field]: value }
        }),
      )
    },
    [commitHabitsUpdate],
  )

  const deleteHabit = useCallback(
    (habitIndex) => {
      commitHabitsUpdate((prevHabits) => prevHabits.filter((_, index) => index !== habitIndex))
    },
    [commitHabitsUpdate],
  )

  const moveHabit = useCallback(
    (habitIndex, direction) => {
      commitHabitsUpdate((prevHabits) => {
        const targetIndex = habitIndex + direction
        if (targetIndex < 0 || targetIndex >= prevHabits.length) return prevHabits
        const nextHabits = [...prevHabits]
        ;[nextHabits[habitIndex], nextHabits[targetIndex]] = [nextHabits[targetIndex], nextHabits[habitIndex]]
        return nextHabits
      })
    },
    [commitHabitsUpdate],
  )

  const addHabit = useCallback(() => {
    const daysInCurrentMonth = getDaysInMonth(year, monthIndex)
    commitHabitsUpdate((prevHabits) => [
      ...prevHabits,
      {
        id: Date.now().toString(),
        name: 'New Habit',
        type: 'positive',
        weight: 2,
        goal: 28,
        days: Array(daysInCurrentMonth).fill(false),
      },
    ])
  }, [commitHabitsUpdate, year, monthIndex])

  return {
    habits,
    setHabits,
    toggleHabitDay,
    updateHabitField,
    deleteHabit,
    moveHabit,
    addHabit,
    isHabitsLoading,
    habitsError,
  }
}

export default useMonthlyHabits

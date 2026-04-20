import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../services/firebase'
import { useAuthContext } from '../context/AuthContext'
import { useThemeContext } from '../context/ThemeContext'
import Header from './Header'
import ActivityGraph from './ActivityGraph'
import AnalyticsRings, { dailyQuote } from './AnalyticsRings'
import HabitTable from './HabitTable'
import FooterCounter from './FooterCounter'
import ConfirmModal from './ConfirmModal'
import SideMenu from './SideMenu'
import useMonthlyHabits from '../hooks/useMonthlyHabits'
import useExportCSV from '../hooks/useExportCSV'
import useMediaQuery from '../hooks/useMediaQuery'
import { LogOut, RefreshCw, Trash2 } from 'lucide-react'
import useHabitStats from '../hooks/useHabitStats'
import useGlobalStreak from '../hooks/useGlobalStreak'

const monthNames = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
]

function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate() }

function AppLayout() {
  const now = new Date()

  // ── Context consumers ────────────────────────────
  const { user, displayName, handleSaveName, handleSignOut: authSignOut } = useAuthContext()
  const { theme, toggleTheme, palette, applyPalette, density, toggleDensity } = useThemeContext()

  const [year,       setYear]       = useState(now.getFullYear())
  const [monthIndex, setMonthIndex] = useState(now.getMonth())
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [lastAddedHabitIndex, setLastAddedHabitIndex] = useState(null)

  const isMobile = useMediaQuery('(max-width: 768px)')

  // Export CSV
  const exportCSV = useExportCSV()

  // Global confirm modal state
  const [modal, setModal] = useState(null)

  const { habits, setHabits, addHabit, toggleHabitDay, updateHabitField, deleteHabit, moveHabit, habitsError } =
    useMonthlyHabits(user?.uid, year, monthIndex)

  const syncStats = useHabitStats(habits, year, monthIndex)
  const { globalStreak, globalMomPct } = useGlobalStreak(user?.uid, habits, year, monthIndex)
  const stats = { ...syncStats, streak: globalStreak, momPct: globalMomPct }

  useEffect(() => {
    if (habitsError) {
      setModal({
        icon: AlertTriangle, iconColor: '#ef4444', iconBg: 'rgba(239,68,68,0.15)',
        title: 'Sync Error',
        message: 'Could not sync habits with the server. Please check your connection.',
        confirmText: 'Dismiss', confirmColor: '#ef4444',
        onConfirm: () => setModal(null),
      })
    }
  }, [habitsError])


  // Show app container once auth is confirmed
  useEffect(() => {
    const app = document.querySelector('.app')
    if (app) app.style.display = 'block'
    return () => { if (app) app.style.display = 'none' }
  }, [])

  // Open side menu when navigating back from Settings
  const location = useLocation()
  useEffect(() => {
    if (location.state?.openMenu) {
      setIsMenuOpen(true)
      // Clear the state so refreshing doesn't re-open
      window.history.replaceState({}, '')
    }
  }, [location.state])

  // ── Habits ──────────────────────────────────────
  const handleAddHabit = async () => {
    setLastAddedHabitIndex(habits.length)
    await addHabit()
    setIsEditMode(true)
    setTimeout(() => setLastAddedHabitIndex(null), 500)
  }

  // ── Export CSV ──────────────────────────────────
  const handleExportCSV = () => {
    exportCSV(habits, year, monthIndex)
    setIsMenuOpen(false)
  }

  // ── Sync from last month ─────────────────────────
  const handleSync = () => {
    setModal({
      icon: RefreshCw, iconColor: '#60a5fa', iconBg: 'rgba(96,165,250,0.15)',
      title: 'Sync from Last Month',
      message: 'This will copy habit settings from last month while keeping your current progress.',
      confirmText: 'Sync', confirmColor: '#60a5fa',
      onConfirm: async () => {
        try {
          let prevM = monthIndex - 1, prevY = year
          if (prevM < 0) { prevM = 11; prevY = year - 1 }
          const snap = await getDoc(doc(db, 'users', user.uid, 'monthly_data', `${prevY}-${prevM}`))
          if (!snap.exists()) { alert('No previous month data found.'); setModal(null); return }

          const prevData = snap.data()
          const daysInMonth = getDaysInMonth(year, monthIndex)
          const synced = prevData.habits.map(ph => {
            return {
              name: ph.name,
              type: ph.type || 'positive',
              weight: ph.weight || 2,
              goal: ph.goal || 28,
              days: Array(daysInMonth).fill(false)
            }
          })
          setHabits(synced)
          await setDoc(doc(db, 'users', user.uid, 'monthly_data', `${year}-${monthIndex}`), { habits: synced }, { merge: true })
        } catch (e) { alert('Sync failed: ' + e.message) }
        setModal(null)
      },
    })
  }

  // ── Reset all data ───────────────────────────────
  const handleReset = () => {
    setModal({
      icon: Trash2, iconColor: '#fb923c', iconBg: 'rgba(251,146,60,0.15)',
      title: 'Reset All Data',
      message: 'This will permanently delete all habits and data. This cannot be undone.',
      confirmText: 'Reset', confirmColor: '#fb923c',
      onConfirm: async () => {
        setHabits([])
        await setDoc(doc(db, 'users', user.uid, 'monthly_data', `${year}-${monthIndex}`), { habits: [] }, { merge: true })
        setModal(null)
      },
    })
  }

  // ── Sign out ─────────────────────────────────────
  const handleSignOut = () => {
    setModal({
      icon: LogOut, iconColor: '#ef4444', iconBg: 'rgba(239,68,68,0.15)',
      title: 'Sign Out',
      message: 'Are you sure you want to sign out of NXUS?',
      confirmText: 'Sign Out', confirmColor: '#ef4444',
      onConfirm: () => { authSignOut(); setModal(null) },
    })
  }


  return (
    <div className="app">

      {/* ── SIDE MENU ─────────────────────────────────── */}
      <SideMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        displayName={displayName}
        email={user?.email}
        onSaveName={handleSaveName}
        habits={habits}
        year={year}
        monthIndex={monthIndex}
        theme={theme}
        onToggleTheme={toggleTheme}
        density={density}
        onToggleDensity={toggleDensity}
        palette={palette}
        onChangePalette={applyPalette}
        onExportCSV={handleExportCSV}
        onSync={handleSync}
        onReset={handleReset}
        onSignOut={handleSignOut}
      />

      {/* ── HEADER ────────────────────────────────────── */}
      <Header
        stats={stats}
        isMenuOpen={isMenuOpen}
        onMenuToggle={() => setIsMenuOpen(p => !p)}
        year={year}
        monthIndex={monthIndex}
        onYearChange={y => { setYear(y); setIsEditMode(false) }}
        onMonthChange={m => { setMonthIndex(m); setIsEditMode(false) }}
        habits={habits}
      />

      {/* ── ACTIVITY GRAPH ────────────────────────────── */}
      <ActivityGraph habits={habits} year={year} monthIndex={monthIndex} />

      {/* ── MOBILE QUOTE ──────────────────────────────── */}
      {isMobile && (
        <div id="dailyQuote" className="quote-text mobile-view">
          {dailyQuote}
        </div>
      )}

      {/* ── ANALYTICS ─────────────────────────────────── */}
      <AnalyticsRings habits={habits} year={year} monthIndex={monthIndex} stats={stats} />

      {/* ── HABITS TABLE ──────────────────────────────── */}
      <section className="habits">
        <div className="section-title">Monthly Overview</div>
        <HabitTable
          habits={habits}
          year={year}
          monthIndex={monthIndex}
          isEditMode={isEditMode}
          onToggleEditMode={() => setIsEditMode(p => !p)}
          onToggleDay={toggleHabitDay}
          onUpdateHabitField={updateHabitField}
          onDeleteHabit={deleteHabit}
          onMoveHabit={moveHabit}
          lastAddedHabitIndex={lastAddedHabitIndex}
        />
        <div className="footer">
          <button id="addHabit" type="button" onClick={handleAddHabit}>
            Add Habit
          </button>
          <div className="footer-right" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <FooterCounter habits={habits} year={year} monthIndex={monthIndex} />
          </div>
        </div>
      </section>

      {/* ── GLOBAL CONFIRM MODAL ──────────────────────── */}
      {modal && (
        <ConfirmModal
          isOpen
          icon={modal.icon}
          iconColor={modal.iconColor}
          iconBg={modal.iconBg}
          title={modal.title}
          message={modal.message}
          confirmText={modal.confirmText}
          confirmColor={modal.confirmColor}
          onCancel={() => setModal(null)}
          onConfirm={modal.onConfirm}
        />
      )}
    </div>
  )
}

export default AppLayout

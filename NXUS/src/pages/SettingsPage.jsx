import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../services/firebase'
import { useAuthContext } from '../context/AuthContext'
import { useThemeContext } from '../context/ThemeContext'
import {
  ArrowLeft, User, Shield, BarChart3,
  Calendar, TrendingUp, Award, Flame, Target, Edit2, Check
} from 'lucide-react'

function SettingsPage() {
  const navigate = useNavigate()
  const { displayName, handleSaveName, user } = useAuthContext()
  const { theme } = useThemeContext()

  const [allTimeStats, setAllTimeStats] = useState(null)
  const [isLoadingStats, setIsLoadingStats] = useState(true)

  const [isEditingName, setIsEditingName] = useState(false)
  const [tempName, setTempName] = useState(displayName)

  const handleNameSubmit = () => {
    const trimmed = tempName.trim()
    if (trimmed && trimmed !== displayName) {
      handleSaveName(trimmed)
    } else {
      setTempName(displayName)
    }
    setIsEditingName(false)
  }

  // Load all-time stats from Firestore across all months
  useEffect(() => {
    if (!user) return
    const loadAllTimeStats = async () => {
      setIsLoadingStats(true)
      try {
        const now = new Date()
        const currentYear = now.getFullYear()
        const currentMonth = now.getMonth()
        let totalChecks = 0
        let totalHabits = 0
        let totalMonths = 0
        let bestMonth = { name: '—', score: 0 }
        let longestStreak = 0
        let totalSlips = 0
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

        // Scan last 12 months in parallel
        const queries = []
        for (let offset = 0; offset < 12; offset++) {
          let m = currentMonth - offset
          let y = currentYear
          if (m < 0) { m += 12; y -= 1 }
          queries.push(
            getDoc(doc(db, 'users', user.uid, 'monthly_data', `${y}-${m}`))
              .then(snap => ({ snap, m, y }))
          )
        }

        const snapshots = await Promise.all(queries)
        let currentSnap = null

        snapshots.forEach(({ snap, m, y }) => {
          if (m === currentMonth && y === currentYear) {
            currentSnap = snap
          }

          if (!snap.exists()) return

          const data = snap.data()
          const habits = Array.isArray(data?.habits) ? data.habits : []
          if (habits.length === 0) return

          totalMonths++
          totalHabits += habits.length

          let monthChecks = 0
          let monthSlips = 0
          habits.forEach(h => {
            const days = h.days || []
            days.forEach(d => {
              if (d) {
                if (h.type === 'negative') monthSlips++
                else monthChecks++
              }
            })
          })

          totalChecks += monthChecks
          totalSlips += monthSlips

          if (monthChecks > bestMonth.score) {
            bestMonth = { name: `${monthNames[m]} ${y}`, score: monthChecks }
          }
        })

        // Calculate streak using same weighted algorithm as dashboard (checkStreakDay)
        if (currentSnap && currentSnap.exists()) {
          const habits = currentSnap.data()?.habits || []
          const today = now.getDate()
          const todayIdx = today - 1

          // Replicates checkStreakDay from useHabitStats.js exactly
          const checkStreakDay = (allHabits, dayIdx) => {
            const classifyHabit = (h) => {
              const ratio = (h.goal || h.days?.length || 1) / (h.days?.length || 1)
              if (ratio >= 0.65) return 'daily'
              if (ratio >= 0.25) return 'regular'
              return 'periodic'
            }

            let posScore = 0, posMax = 0
            allHabits.forEach(h => {
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
            allHabits.forEach(h => {
              if (h.type !== 'negative') return
              const w = Number(h.weight) || 2
              negTotalWeight += w
              if (h.days?.[dayIdx]) negSlipWeight += w
            })
            const negPass = negTotalWeight === 0 || (negSlipWeight / negTotalWeight) <= 0.50
            return posPass && negPass
          }

          let streak = 0
          let broken = false

          for (let offset = 0; offset < snapshots.length; offset++) {
            const { snap: s, m: fetchM, y: fetchY } = snapshots[offset]
            if (!s.exists()) break
            
            const monthHabits = s.data()?.habits || []
            if (monthHabits.length === 0) break

            const daysInMonth = new Date(fetchY, fetchM + 1, 0).getDate()
            let startIdx = daysInMonth - 1

            // If it's the very first month we're checking (offset 0), we start from todayIdx
            if (offset === 0) {
              if (checkStreakDay(monthHabits, todayIdx)) {
                streak++
              }
              startIdx = todayIdx - 1
            }

            for (let d = startIdx; d >= 0; d--) {
              if (checkStreakDay(monthHabits, d)) {
                streak++
              } else {
                broken = true
                break
              }
            }

            if (broken) break
          }

          longestStreak = streak
        }

        setAllTimeStats({ totalChecks, totalHabits, totalMonths, bestMonth, longestStreak, totalSlips })
      } catch {
        setAllTimeStats(null)
      } finally {
        setIsLoadingStats(false)
      }
    }
    loadAllTimeStats()
  }, [user])

  const memberSince = useMemo(() => {
    if (!user?.metadata?.creationTime) return '—'
    const d = new Date(user.metadata.creationTime)
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }, [user])

  return (
    <div className="settings-page">
      <div className="settings-header">
        <button className="settings-back-btn" onClick={() => navigate('/', { state: { openMenu: true } })} type="button">
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
        <h1 className="settings-title">Profile & Insights</h1>
      </div>

      <div className="settings-sections">

        {/* ── PROFILE CARD ────────────────────── */}
        <section className="settings-section">
          <div className="settings-section-title">
            <User size={16} />
            <span>Account</span>
          </div>
          <div className="settings-card">
            <div className="profile-hero">
              <div className="profile-avatar-lg">
                {(displayName || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="profile-hero-info">
                {isEditingName ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      className="profile-name-input"
                      type="text"
                      value={tempName}
                      onChange={e => setTempName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleNameSubmit() }}
                      onBlur={handleNameSubmit}
                      autoFocus
                      placeholder="Your name"
                      style={{ 
                        background: 'rgba(255, 255, 255, 0.05)', 
                        padding: '4px 8px', 
                        borderRadius: '6px', 
                        border: '1px solid rgba(255, 255, 255, 0.2)' 
                      }}
                    />
                    <button 
                      type="button" 
                      onMouseDown={e => { e.preventDefault(); handleNameSubmit(); }}
                      style={{
                        background: 'var(--accent)',
                        color: '#000',
                        border: 'none',
                        borderRadius: '6px',
                        width: '28px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <Check size={16} strokeWidth={3} />
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span 
                      style={{ 
                        fontSize: '17px', 
                        fontWeight: '700', 
                        color: 'var(--text)',
                        fontFamily: "'Inter', sans-serif"
                      }}
                    >
                      {displayName}
                    </span>
                    <button 
                      type="button" 
                      onClick={() => { setTempName(displayName); setIsEditingName(true) }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        padding: 0,
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      aria-label="Edit name"
                    >
                      <Edit2 size={14} style={{ opacity: 0.8 }} />
                    </button>
                  </div>
                )}
                <span className="profile-email">{user?.email || '—'}</span>
              </div>
            </div>
            <div className="settings-row">
              <span className="settings-label">Member Since</span>
              <span className="settings-value">{memberSince}</span>
            </div>
            <div className="settings-row">
              <span className="settings-label">User ID</span>
              <span className="settings-value settings-uid">{user?.uid?.slice(0, 12)}...</span>
            </div>
          </div>
        </section>

        {/* ── ALL-TIME INSIGHTS ────────────────── */}
        <section className="settings-section">
          <div className="settings-section-title">
            <BarChart3 size={16} />
            <span>All-Time Insights (12 Months)</span>
          </div>
          {isLoadingStats ? (
            <div className="settings-card" style={{ padding: 24, textAlign: 'center' }}>
              <div className="loading-spinner" style={{ margin: '0 auto', width: 24, height: 24 }} />
            </div>
          ) : allTimeStats ? (
            <div className="insights-grid">
              <div className="insight-card">
                <div className="insight-icon" style={{ background: 'rgba(99,230,164,0.12)' }}>
                  <Target size={18} style={{ color: '#63e6a4' }} />
                </div>
                <div className="insight-value">{allTimeStats.totalChecks.toLocaleString()}</div>
                <div className="insight-label">Total Check-ins</div>
              </div>
              <div className="insight-card">
                <div className="insight-icon" style={{ background: 'rgba(251,146,60,0.12)' }}>
                  <Flame size={18} style={{ color: '#fb923c' }} />
                </div>
                <div className="insight-value">{allTimeStats.longestStreak}</div>
                <div className="insight-label">Current Streak</div>
              </div>
              <div className="insight-card">
                <div className="insight-icon" style={{ background: 'rgba(96,165,250,0.12)' }}>
                  <Calendar size={18} style={{ color: '#60a5fa' }} />
                </div>
                <div className="insight-value">{allTimeStats.totalMonths}</div>
                <div className="insight-label">Active Months</div>
              </div>
              <div className="insight-card">
                <div className="insight-icon" style={{ background: 'rgba(250,204,21,0.12)' }}>
                  <Award size={18} style={{ color: '#facc15' }} />
                </div>
                <div className="insight-value">{allTimeStats.bestMonth.name}</div>
                <div className="insight-label">Best Month ({allTimeStats.bestMonth.score})</div>
              </div>
              <div className="insight-card">
                <div className="insight-icon" style={{ background: 'rgba(167,139,250,0.12)' }}>
                  <TrendingUp size={18} style={{ color: '#a78bfa' }} />
                </div>
                <div className="insight-value">{allTimeStats.totalHabits}</div>
                <div className="insight-label">Total Habits Tracked</div>
              </div>
              <div className="insight-card">
                <div className="insight-icon" style={{ background: 'rgba(239,68,68,0.12)' }}>
                  <Shield size={18} style={{ color: '#ef4444' }} />
                </div>
                <div className="insight-value">{allTimeStats.totalSlips}</div>
                <div className="insight-label">Total Slips</div>
              </div>
            </div>
          ) : (
            <div className="settings-card" style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>
              No data available yet
            </div>
          )}
        </section>

        {/* ── ABOUT ───────────────────────────── */}
        <section className="settings-section">
          <div className="settings-section-title">
            <Shield size={16} />
            <span>About</span>
          </div>
          <div className="settings-card">
            <div className="settings-row">
              <span className="settings-label">App</span>
              <span className="settings-value">NXUS Habit Tracker</span>
            </div>
            <div className="settings-row">
              <span className="settings-label">Version</span>
              <span className="settings-value">1.2.1</span>
            </div>
            <div className="settings-row">
              <span className="settings-label">Stack</span>
              <span className="settings-value">React 19 + Firebase</span>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}

export default SettingsPage

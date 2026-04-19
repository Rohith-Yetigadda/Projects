import { useEffect, useRef, useState, memo } from 'react'
import { Settings2, Check, ArrowUp, ArrowDown, Trash2 } from 'lucide-react'
import Dropdown from './Dropdown'
import ConfirmModal from './ConfirmModal'

function HabitTable({
  habits, year, monthIndex,
  isEditMode, onToggleEditMode,
  onToggleDay, onUpdateHabitField,
  onDeleteHabit, onMoveHabit,
  lastAddedHabitIndex,
}) {
  const [deleteTargetIndex, setDeleteTargetIndex] = useState(null)
  const [deletingRowIndex, setDeletingRowIndex] = useState(null)
  const wrapperRef = useRef(null)

  const now         = new Date()
  const totalDays   = new Date(year, monthIndex + 1, 0).getDate()
  const isThisMonth = now.getFullYear() === year && now.getMonth() === monthIndex
  const isFutureMonth = year > now.getFullYear() || (year === now.getFullYear() && monthIndex > now.getMonth())
  const today = now.getDate()
  const daysPassed = isThisMonth ? today : totalDays

  // Scroll to today on mount / month change
  useEffect(() => {
    if (!isThisMonth || isEditMode) return
    const timer = setTimeout(() => {
      const wrapper = wrapperRef.current
      const todayTh = document.getElementById(`header-day-${today}`)
      const stickyTh = wrapper?.querySelector('th:first-child')
      if (wrapper && todayTh && stickyTh) {
        const scrollPos = todayTh.offsetLeft - stickyTh.offsetWidth - 50
        wrapper.scrollTo({ left: Math.max(0, scrollPos), behavior: 'smooth' })
      }
    }, 200)
    return () => clearTimeout(timer)
  }, [isThisMonth, isEditMode, monthIndex, year])

  const getProgress = (habit) => {
    const goal = Math.max(1, Number(habit.goal) || totalDays)
    const checks = (habit.days || []).slice(0, daysPassed).filter(Boolean).length
    if (habit.type === 'negative') {
      const pct = (checks / goal) * 100
      return { pct: Math.min(pct, 100), isNeg: true }
    }
    return { pct: Math.min((checks / goal) * 100, 100), isNeg: false }
  }

  return (
    <>
      <div className="table-wrapper" ref={wrapperRef}>
        <table>
          <thead>
            <tr id="dayHeader">
              <th>
                <div className="sticky-header-content">
                  <button
                    className="toggle-edit-btn"
                    type="button"
                    onClick={onToggleEditMode}
                    title={isEditMode ? 'Done' : 'Settings'}
                  >
                    {isEditMode ? <Check size={16} /> : <Settings2 size={16} />}
                  </button>
                  <span>Habit</span>
                </div>
              </th>

              {isEditMode && (
                <>
                  <th>Type</th>
                  <th>Imp</th>
                  <th>Goal</th>
                </>
              )}

              {Array.from({ length: totalDays }, (_, idx) => {
                const d = idx + 1
                return (
                  <th
                    key={d}
                    id={`header-day-${d}`}
                    className={isThisMonth && d === today ? 'today-col' : ''}
                  >
                    {d}
                  </th>
                )
              })}

              <th style={{ minWidth: isEditMode ? 90 : 'auto' }}>
                {isEditMode ? 'Act' : ''}
              </th>
            </tr>
          </thead>

          <tbody id="habitBody">
            {habits.map((habit, habitIndex) => {
              const { pct, isNeg } = getProgress(habit)
                const rowClass = [
                  habitIndex === lastAddedHabitIndex ? 'row-enter-anim' : '',
                  habitIndex === deletingRowIndex    ? 'row-exit-anim'  : '',
                ].filter(Boolean).join(' ')

              return (
                <tr key={habit.id || habitIndex} className={rowClass}>
                  {/* NAME CELL — contentEditable in edit mode */}
                  <td
                    contentEditable={isEditMode}
                    suppressContentEditableWarning
                    style={{ 
                      cursor: isEditMode ? 'text' : 'default',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                    onInput={e => onUpdateHabitField(habitIndex, 'name', e.currentTarget.textContent)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() } }}
                    onPaste={e => {
                      e.preventDefault()
                      const text = e.clipboardData.getData('text/plain').replace(/\n/g, ' ')
                      document.execCommand('insertText', false, text.substring(0, 50))
                    }}
                  >
                    {habit.name}
                  </td>

                  {isEditMode && (
                    <>
                      <td>
                        <Dropdown
                          className="cell-dropdown"
                          options={[
                            { label: 'Positive', value: 'positive' },
                            { label: 'Negative', value: 'negative' },
                          ]}
                          value={habit.type}
                          onChange={v => onUpdateHabitField(habitIndex, 'type', v)}
                        />
                      </td>
                      <td>
                        <Dropdown
                          className="cell-dropdown"
                          options={[
                            { label: 'Low',    value: 1 },
                            { label: 'Medium', value: 2 },
                            { label: 'High',   value: 3 },
                          ]}
                          value={habit.weight}
                          onChange={v => onUpdateHabitField(habitIndex, 'weight', Number(v))}
                        />
                      </td>
                      <td>
                        <input
                          className="goal-input"
                          type="number"
                          min="1"
                          value={habit.goal === '' ? '' : habit.goal}
                          onChange={e => {
                            const val = e.target.value
                            onUpdateHabitField(habitIndex, 'goal', val === '' ? '' : Number(val))
                          }}
                          onBlur={e => {
                            if (e.target.value === '' || Number(e.target.value) < 1) {
                              onUpdateHabitField(habitIndex, 'goal', totalDays)
                            }
                          }}
                        />
                      </td>
                    </>
                  )}

                  {/* DAY CELLS */}
                  {Array.from({ length: totalDays }, (_, dayIndex) => {
                    const d = dayIndex + 1
                    const isTodayCol  = isThisMonth && d === today
                    const isFutureDay = isFutureMonth || (isThisMonth && d > today)
                    const checked     = Boolean(habit.days?.[dayIndex])

                    return (
                      <td
                        key={`${habitIndex}-${dayIndex}`}
                        className={[
                          isTodayCol  ? 'today-col'     : '',
                          isFutureDay ? 'disabled-cell' : '',
                        ].filter(Boolean).join(' ')}
                        style={{ cursor: isFutureDay ? 'default' : 'pointer' }}
                        onClick={e => {
                          if (isFutureDay || e.target.tagName.toLowerCase() === 'input') return
                          onToggleDay(habitIndex, dayIndex, !checked)
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={isFutureDay}
                          className={[
                            habit.type === 'negative' ? 'neg-habit' : '',
                            isFutureDay               ? 'future-day': '',
                          ].filter(Boolean).join(' ')}
                          onChange={e => onToggleDay(habitIndex, dayIndex, e.target.checked)}
                        />
                      </td>
                    )
                  })}

                  {/* ACTIONS / PROGRESS */}
                  <td>
                    {isEditMode ? (
                      <div className="action-buttons">
                        <button
                          className="toggle-edit-btn table-action-btn"
                          type="button"
                          disabled={habitIndex === 0}
                          onClick={() => onMoveHabit(habitIndex, -1)}
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          className="toggle-edit-btn table-action-btn"
                          type="button"
                          disabled={habitIndex === habits.length - 1}
                          onClick={() => onMoveHabit(habitIndex, 1)}
                        >
                          <ArrowDown size={14} />
                        </button>
                        <button
                          className="toggle-edit-btn table-action-btn danger"
                          type="button"
                          style={{ color: '#ef4444' }}
                          onClick={() => setDeleteTargetIndex(habitIndex)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="progress-bar">
                        <div
                          className={`progress-fill${isNeg ? ' negative' : ''}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {habits.length === 0 && (
        <div style={{
          padding: '40px 20px',
          textAlign: 'center',
          color: 'var(--muted)',
          fontStyle: 'italic',
          width: '100%',
        }}>
          No habits found. Click "Add Habit" below to start.
        </div>
      )}

      <ConfirmModal
        isOpen={deleteTargetIndex != null}
        icon={Trash2}
        iconColor="#ef4444"
        iconBg="rgba(239,68,68,0.15)"
        title="Delete Habit"
        message={
          deleteTargetIndex != null
            ? `"${habits[deleteTargetIndex]?.name || 'Habit'}" will be permanently deleted.`
            : ''
        }
        confirmText="Delete"
        confirmColor="#ef4444"
        onCancel={() => setDeleteTargetIndex(null)}
        onConfirm={async () => {
          if (deleteTargetIndex == null) return
          setDeletingRowIndex(deleteTargetIndex)
          setTimeout(async () => {
            await onDeleteHabit(deleteTargetIndex)
            setDeletingRowIndex(null)
            setDeleteTargetIndex(null)
          }, 400)
        }}
      />
    </>
  )
}

export default memo(HabitTable)

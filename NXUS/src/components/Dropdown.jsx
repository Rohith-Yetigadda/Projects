import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

function Dropdown({ options, value, onChange, className = '' }) {
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef(null)
  const btnRef = useRef(null)
  const menuRef = useRef(null)

  const selectedOption = options.find(o => String(o.value).toLowerCase() === String(value).toLowerCase()) || options[0]

  const getBadgeClass = () => {
    const v = String(value).toLowerCase()
    if (v === 'positive') return 'badge-pos'
    if (v === 'negative') return 'badge-neg'
    if (v === '1') return 'badge-imp-low'
    if (v === '2') return 'badge-imp-med'
    if (v === '3') return 'badge-imp-high'
    return ''
  }

  // Item color
  const getItemColor = (label) => {
    if (label === 'Positive') return '#63e6a4'
    if (label === 'Negative') return '#ef4444'
    if (label === 'High')     return '#f87171'
    if (label === 'Medium')   return '#facc15'
    if (label === 'Low')      return '#4fd1ff'
    return undefined
  }

  useEffect(() => {
    const handleOutside = (e) => {
      if (!rootRef.current?.contains(e.target) && !menuRef.current?.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  // Position the dropdown menu using fixed positioning like original
  const [menuStyle, setMenuStyle] = useState({})
  useEffect(() => {
    if (!isOpen || !btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    const menuWidth = 140
    const menuHeight = options.length * 40
    let top = rect.bottom + 6
    let left = rect.left
    if (top + menuHeight > window.innerHeight - 10) top = rect.top - menuHeight - 6
    if (left + menuWidth > window.innerWidth - 10) left = rect.right - menuWidth
    setMenuStyle({ top, left, minWidth: Math.max(rect.width, menuWidth) })
  }, [isOpen, options.length])

  return (
    <div ref={rootRef} className={`dropdown ${className}`.trim()}>
      <button
        ref={btnRef}
        type="button"
        className={`dropdown-button ${getBadgeClass()} ${isOpen ? 'active-dropdown-btn' : ''}`}
        onClick={() => setIsOpen(p => !p)}
      >
        <span>{selectedOption?.label ?? 'Select'}</span>
      </button>

      {isOpen && createPortal(
        <div
          ref={menuRef}
          className="dropdown-menu open"
          style={{ position: 'fixed', zIndex: 99999, ...menuStyle }}
        >
          {options.map(opt => (
            <button
              key={`${opt.value}`}
              type="button"
              className="dropdown-item"
              style={{ color: getItemColor(opt.label) }}
              onClick={() => { onChange(opt.value); setIsOpen(false) }}
            >
              {opt.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}

export default Dropdown

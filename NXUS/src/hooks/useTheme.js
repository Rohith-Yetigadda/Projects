import { useState } from 'react'

const STORAGE_KEY = 'nxus-theme'

// Apply immediately on module load (before first render) to avoid flash
const initial = localStorage.getItem(STORAGE_KEY) || 'dark'
document.documentElement.setAttribute('data-theme', initial)

/**
 * useTheme — manages light/dark mode.
 * - Reads from localStorage on init
 * - Writes to localStorage on change
 * - Applies `data-theme` attribute to <html> for CSS variable switching
 */
function useTheme() {
  const [theme, setTheme] = useState(initial)

  const applyTheme = (next) => {
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem(STORAGE_KEY, next)
    setTheme(next)
  }

  const toggleTheme = () => applyTheme(theme === 'dark' ? 'light' : 'dark')

  return { theme, toggleTheme, applyTheme }
}

export default useTheme

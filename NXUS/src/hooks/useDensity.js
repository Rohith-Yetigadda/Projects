import { useState } from 'react'

const STORAGE_KEY = 'nxus-density'

const initial = (() => {
  const saved = localStorage.getItem(STORAGE_KEY) || 'comfortable'
  document.documentElement.setAttribute('data-density', saved)
  return saved
})()

function useDensity() {
  const [density, setDensity] = useState(initial)

  const applyDensity = (next) => {
    document.documentElement.setAttribute('data-density', next)
    localStorage.setItem(STORAGE_KEY, next)
    setDensity(next)
  }

  const toggleDensity = () => applyDensity(density === 'compact' ? 'comfortable' : 'compact')

  return { density, toggleDensity, applyDensity }
}

export default useDensity

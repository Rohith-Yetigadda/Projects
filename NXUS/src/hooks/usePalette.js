import { useState } from 'react'

const STORAGE_KEY = 'nxus-palette'
const PALETTE_NAMES = ['emerald', 'cyan', 'violet', 'sunset', 'rose']

const initial = (() => {
  const saved = localStorage.getItem(STORAGE_KEY) || 'emerald'
  document.documentElement.setAttribute('data-palette', saved)
  return saved
})()

function usePalette() {
  const [palette, setPalette] = useState(initial)

  const applyPalette = (name) => {
    if (!PALETTE_NAMES.includes(name)) return
    document.documentElement.setAttribute('data-palette', name)
    localStorage.setItem(STORAGE_KEY, name)
    setPalette(name)
  }

  return { palette, applyPalette, PALETTE_NAMES }
}

export default usePalette

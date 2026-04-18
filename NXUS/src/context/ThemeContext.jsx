import { createContext, useContext } from 'react'
import useTheme from '../hooks/useTheme'
import usePalette from '../hooks/usePalette'
import useDensity from '../hooks/useDensity'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const { theme, toggleTheme } = useTheme()
  const { palette, applyPalette } = usePalette()
  const { density, toggleDensity } = useDensity()

  return (
    <ThemeContext.Provider value={{
      theme,
      toggleTheme,
      palette,
      applyPalette,
      density,
      toggleDensity,
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useThemeContext() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useThemeContext must be used within ThemeProvider')
  return ctx
}

export default ThemeContext

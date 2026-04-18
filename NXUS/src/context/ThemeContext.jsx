import { createContext, useContext, useEffect, useRef } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../services/firebase'
import { useAuthContext } from './AuthContext'
import useTheme from '../hooks/useTheme'
import usePalette from '../hooks/usePalette'
import useDensity from '../hooks/useDensity'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const { theme, toggleTheme, applyTheme } = useTheme()
  const { palette, applyPalette } = usePalette()
  const { density, toggleDensity, applyDensity } = useDensity()

  const { user } = useAuthContext()
  const settingFromDbRef = useRef(false)
  const isInitialLoadRef = useRef(true)

  // Fetch preferences on user login
  useEffect(() => {
    if (!user) return
    const fetchPrefs = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid, 'profile', 'info'))
        if (snap.exists()) {
          const data = snap.data()
          settingFromDbRef.current = true
          
          if (data.theme && data.theme !== theme) applyTheme(data.theme)
          if (data.palette && data.palette !== palette) applyPalette(data.palette)
          if (data.density && data.density !== density) applyDensity(data.density)
          
          setTimeout(() => { settingFromDbRef.current = false }, 100)
        }
      } catch (e) {
        // Silently fail if unable to fetch settings
      }
    }
    fetchPrefs()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Save preferences when they change
  useEffect(() => {
    // Skip saving on the very first mount cycle
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false
      return
    }
    
    // Skip if the change was triggered by loading DB settings
    if (!user || settingFromDbRef.current) return
    
    const savePrefs = async () => {
      try {
        await setDoc(
          doc(db, 'users', user.uid, 'profile', 'info'),
          { theme, palette, density },
          { merge: true }
        )
      } catch (e) {
        // Silently fail
      }
    }
    
    // Debounce or save directly since these don't update multiple times rapidly
    savePrefs()
  }, [theme, palette, density, user])

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

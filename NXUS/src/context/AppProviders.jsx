import { AuthProvider } from './AuthContext'
import { ThemeProvider } from './ThemeContext'

function AppProviders({ children }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </AuthProvider>
  )
}

export default AppProviders

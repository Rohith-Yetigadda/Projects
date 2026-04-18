import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuthContext } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import ProtectedRoute from './components/ProtectedRoute'

// Lazy-loaded route components for code splitting
const LoginPage = lazy(() => import('./pages/LoginPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-spinner" />
    </div>
  )
}

function AppRoutes() {
  const { user, isAuthLoading } = useAuthContext()

  if (isAuthLoading) return <LoadingScreen />

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* Public route */}
        <Route
          path="/login"
          element={user ? <Navigate to="/" replace /> : <LoginPage />}
        />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <AppRoutes />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App

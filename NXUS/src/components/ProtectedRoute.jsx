import { Navigate } from 'react-router-dom'
import { useAuthContext } from '../context/AuthContext'

/**
 * ProtectedRoute
 * Wraps routes that require authentication.
 * Redirects to /login if the user is not authenticated.
 */
function ProtectedRoute({ children }) {
  const { user, isAuthLoading } = useAuthContext()

  if (isAuthLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default ProtectedRoute

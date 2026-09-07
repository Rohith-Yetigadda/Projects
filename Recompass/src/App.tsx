import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import Login from "./pages/auth/Login"
import Signup from "./pages/auth/Signup"
import { AuthProvider, useAuth } from "./contexts/AuthContext"

// Protected Route wrapper
function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { currentUser, loading } = useAuth();
  
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!currentUser) return <Navigate to="/login" replace />;
  
  return children;
}

// Placeholder components for routes
function Landing() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4 text-center">
      <h1 className="text-5xl font-extrabold mb-4 tracking-tight">RECOMPASS</h1>
      <p className="text-2xl text-muted-foreground mb-8">Your mess. Your macros. Your plan.</p>
      <div className="flex gap-4">
        <a href="/login" className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition">Login</a>
        <a href="/signup" className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-medium hover:opacity-90 transition">Sign Up</a>
      </div>
    </div>
  )
}

function Dashboard() {
  const { userProfile } = useAuth();
  return <div className="p-4">Welcome back, {userProfile?.name || 'User'}! Home Dashboard (Under construction)</div>
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          {/* App Routes */}
          <Route path="/app" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/app/week" element={<ProtectedRoute><div className="p-4">This Week</div></ProtectedRoute>} />
          <Route path="/app/log" element={<ProtectedRoute><div className="p-4">Daily Log</div></ProtectedRoute>} />
          <Route path="/app/compass" element={<ProtectedRoute><div className="p-4">Compass AI</div></ProtectedRoute>} />
          <Route path="/app/groceries" element={<ProtectedRoute><div className="p-4">Groceries</div></ProtectedRoute>} />
          <Route path="/app/cook" element={<ProtectedRoute><div className="p-4">Cook</div></ProtectedRoute>} />
          <Route path="/app/pantry" element={<ProtectedRoute><div className="p-4">Pantry</div></ProtectedRoute>} />
          <Route path="/app/progress" element={<ProtectedRoute><div className="p-4">Progress</div></ProtectedRoute>} />
          <Route path="/app/profile" element={<ProtectedRoute><div className="p-4">Profile</div></ProtectedRoute>} />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App

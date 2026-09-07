import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"

// Placeholder components for routes
function Landing() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground">
      <h1 className="text-4xl font-bold mb-4 tracking-tight">RECOMPASS</h1>
      <p className="text-xl text-muted-foreground mb-8">Your mess. Your macros. Your plan.</p>
      <div className="flex gap-4">
        <a href="/login" className="px-6 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:opacity-90 transition">Login</a>
        <a href="/app" className="px-6 py-2 bg-secondary text-secondary-foreground rounded-md font-medium hover:opacity-90 transition">Demo Mode</a>
      </div>
    </div>
  )
}

function Dashboard() {
  return <div className="p-4">Home Dashboard (Under construction)</div>
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<div className="p-4">Login Page</div>} />
        <Route path="/signup" element={<div className="p-4">Signup Page</div>} />
        
        {/* App Routes */}
        <Route path="/app" element={<Dashboard />} />
        <Route path="/app/week" element={<div className="p-4">This Week</div>} />
        <Route path="/app/log" element={<div className="p-4">Daily Log</div>} />
        <Route path="/app/compass" element={<div className="p-4">Compass AI</div>} />
        <Route path="/app/groceries" element={<div className="p-4">Groceries</div>} />
        <Route path="/app/cook" element={<div className="p-4">Cook</div>} />
        <Route path="/app/pantry" element={<div className="p-4">Pantry</div>} />
        <Route path="/app/progress" element={<div className="p-4">Progress</div>} />
        <Route path="/app/profile" element={<div className="p-4">Profile</div>} />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App

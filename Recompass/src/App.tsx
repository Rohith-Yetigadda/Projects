import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { type ReactElement } from "react"
import Login from "./pages/auth/Login"
import Signup from "./pages/auth/Signup"
import Onboarding from "./pages/onboarding/Onboarding"
import { AuthProvider, useAuth } from "./contexts/AuthContext"
import { AppShell } from "./components/layout/AppShell"

// ─── Protected Route ─────────────────────────────────────────────
function ProtectedRoute({ children }: { children: ReactElement }) {
  const { currentUser, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground">
      Loading...
    </div>
  );
  if (!currentUser) return <Navigate to="/login" replace />;
  return children;
}

// ─── App Route (protected + shell) ───────────────────────────────
function AppRoute({ children }: { children: ReactElement }) {
  const { currentUser, userProfile, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground">
      Loading...
    </div>
  );
  if (!currentUser) return <Navigate to="/login" replace />;
  if (userProfile && !userProfile.onboardingComplete) return <Navigate to="/onboarding" replace />;
  return <AppShell>{children}</AppShell>;
}

// ─── Landing Page ────────────────────────────────────────────────
function Landing() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4 text-center">
      <div className="mb-3 text-xs font-semibold tracking-widest uppercase text-primary/70">
        AI Nutrition Operating System
      </div>
      <h1 className="text-6xl font-extrabold mb-4 tracking-tight bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
        RECOMPASS
      </h1>
      <p className="text-xl text-muted-foreground mb-10 max-w-sm">
        Your mess. Your macros. Your plan.
      </p>
      <div className="flex gap-3">
        <a
          href="/signup"
          className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition shadow-lg shadow-primary/25"
        >
          Get Started
        </a>
        <a
          href="/login"
          className="px-6 py-3 bg-secondary text-secondary-foreground rounded-xl font-semibold hover:bg-secondary/70 transition"
        >
          Sign In
        </a>
      </div>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────────
function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Onboarding (protected, no shell) */}
          <Route path="/onboarding" element={
            <ProtectedRoute><Onboarding /></ProtectedRoute>
          } />

          {/* App (protected + AppShell) */}
          <Route path="/app" element={
            <AppRoute><div className="space-y-2"><h2 className="text-2xl font-bold">Home Dashboard</h2><p className="text-muted-foreground">Coming soon — Phase 5</p></div></AppRoute>
          } />
          <Route path="/app/week" element={
            <AppRoute><div className="space-y-2"><h2 className="text-2xl font-bold">This Week</h2><p className="text-muted-foreground">Coming soon</p></div></AppRoute>
          } />
          <Route path="/app/log" element={
            <AppRoute><div className="space-y-2"><h2 className="text-2xl font-bold">Daily Log</h2><p className="text-muted-foreground">Coming soon</p></div></AppRoute>
          } />
          <Route path="/app/compass" element={
            <AppRoute><div className="space-y-2"><h2 className="text-2xl font-bold">Compass AI</h2><p className="text-muted-foreground">Coming soon</p></div></AppRoute>
          } />
          <Route path="/app/groceries" element={
            <AppRoute><div className="space-y-2"><h2 className="text-2xl font-bold">Groceries</h2><p className="text-muted-foreground">Coming soon</p></div></AppRoute>
          } />
          <Route path="/app/cook" element={
            <AppRoute><div className="space-y-2"><h2 className="text-2xl font-bold">Recipes</h2><p className="text-muted-foreground">Coming soon</p></div></AppRoute>
          } />
          <Route path="/app/pantry" element={
            <AppRoute><div className="space-y-2"><h2 className="text-2xl font-bold">Pantry</h2><p className="text-muted-foreground">Coming soon</p></div></AppRoute>
          } />
          <Route path="/app/progress" element={
            <AppRoute><div className="space-y-2"><h2 className="text-2xl font-bold">Progress</h2><p className="text-muted-foreground">Coming soon</p></div></AppRoute>
          } />
          <Route path="/app/profile" element={
            <AppRoute><div className="space-y-2"><h2 className="text-2xl font-bold">Profile</h2><p className="text-muted-foreground">Coming soon</p></div></AppRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App

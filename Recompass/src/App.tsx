import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { type ReactElement } from "react"
import Login from "./pages/auth/Login"
import Signup from "./pages/auth/Signup"
import Onboarding from "./pages/onboarding/Onboarding"
import Home from "./pages/dashboard/Home"
import { AuthProvider, useAuth } from "./contexts/AuthContext"
import { AppShell } from "./components/layout/AppShell"
import { Sparkles, ArrowRight } from "lucide-react"

// ─── Protected Route ─────────────────────────────────────────────
function ProtectedRoute({ children }: { children: ReactElement }) {
  const { currentUser, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
        <p className="text-sm font-medium tracking-widest uppercase">Loading</p>
      </div>
    </div>
  );
  if (!currentUser) return <Navigate to="/login" replace />;
  return children;
}

// ─── App Route (protected + shell) ───────────────────────────────
function AppRoute({ children }: { children: ReactElement }) {
  const { currentUser, userProfile, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
        <p className="text-sm font-medium tracking-widest uppercase">Loading</p>
      </div>
    </div>
  );
  if (!currentUser) return <Navigate to="/login" replace />;
  if (userProfile && !userProfile.onboardingComplete) return <Navigate to="/onboarding" replace />;
  return <AppShell>{children}</AppShell>;
}

// ─── Landing Page ────────────────────────────────────────────────
function Landing() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4 text-center relative overflow-hidden">
      
      {/* Background glowing orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-white/5 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="glass-card px-4 py-2 rounded-full mb-8 inline-flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <Sparkles className="w-4 h-4 text-white" />
        <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
          AI Nutrition Operating System
        </span>
      </div>
      
      <h1 className="text-6xl md:text-8xl font-extrabold mb-6 tracking-tighter text-gradient leading-tight max-w-4xl animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-150">
        Your mess. Your macros. Your plan.
      </h1>
      
      <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl font-medium animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
        Recompass takes the guesswork out of nutrition. Built for students who don't control their food environment, but want to control their results.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-500">
        <a
          href="/signup"
          className="group px-8 py-4 bg-white text-black rounded-full font-bold hover:bg-white/90 transition-all duration-300 shadow-[0_0_40px_rgba(255,255,255,0.15)] hover:shadow-[0_0_60px_rgba(255,255,255,0.25)] flex items-center justify-center gap-2"
        >
          Get Started
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </a>
        <a
          href="/login"
          className="px-8 py-4 glass text-white rounded-full font-bold hover:bg-white/10 transition-all duration-300 flex items-center justify-center"
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
            <AppRoute><Home /></AppRoute>
          } />
          <Route path="/app/week" element={
            <AppRoute><div className="space-y-4"><h2 className="text-3xl font-bold tracking-tight text-gradient">This Week</h2><p className="text-muted-foreground font-medium">Coming soon</p></div></AppRoute>
          } />
          <Route path="/app/log" element={
            <AppRoute><div className="space-y-4"><h2 className="text-3xl font-bold tracking-tight text-gradient">Daily Log</h2><p className="text-muted-foreground font-medium">Coming soon</p></div></AppRoute>
          } />
          <Route path="/app/compass" element={
            <AppRoute><div className="space-y-4"><h2 className="text-3xl font-bold tracking-tight text-gradient">Compass AI</h2><p className="text-muted-foreground font-medium">Coming soon</p></div></AppRoute>
          } />
          <Route path="/app/groceries" element={
            <AppRoute><div className="space-y-4"><h2 className="text-3xl font-bold tracking-tight text-gradient">Groceries</h2><p className="text-muted-foreground font-medium">Coming soon</p></div></AppRoute>
          } />
          <Route path="/app/cook" element={
            <AppRoute><div className="space-y-4"><h2 className="text-3xl font-bold tracking-tight text-gradient">Recipes</h2><p className="text-muted-foreground font-medium">Coming soon</p></div></AppRoute>
          } />
          <Route path="/app/pantry" element={
            <AppRoute><div className="space-y-4"><h2 className="text-3xl font-bold tracking-tight text-gradient">Pantry</h2><p className="text-muted-foreground font-medium">Coming soon</p></div></AppRoute>
          } />
          <Route path="/app/progress" element={
            <AppRoute><div className="space-y-4"><h2 className="text-3xl font-bold tracking-tight text-gradient">Progress</h2><p className="text-muted-foreground font-medium">Coming soon</p></div></AppRoute>
          } />
          <Route path="/app/profile" element={
            <AppRoute><div className="space-y-4"><h2 className="text-3xl font-bold tracking-tight text-gradient">Profile</h2><p className="text-muted-foreground font-medium">Coming soon</p></div></AppRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App

import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { type ReactElement } from "react";
import Landing from "./pages/marketing/Landing";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import Onboarding from "./pages/onboarding/Onboarding";
import Home from "./pages/dashboard/Home";
import MenuUpload from "./pages/dashboard/MenuUpload";
import ThisWeek from "./pages/dashboard/ThisWeek";
import DailyLog from "./pages/dashboard/DailyLog";
import Profile from "./pages/dashboard/Profile";
import CompassChat from "./pages/dashboard/CompassChat";
import Progress from "./pages/dashboard/Progress";
import Groceries from "./pages/dashboard/Groceries";
import Pantry from "./pages/dashboard/Pantry";
import Cook from "./pages/dashboard/Cook";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AppShell } from "./components/layout/AppShell";

// ─── Guest Route (Strict: Authenticated users can NEVER see landing/login/signup) ─
function GuestRoute({ children }: { children: ReactElement }) {
  const { currentUser, userProfile, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0b0e] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
          <p className="text-[10px] font-bold tracking-widest uppercase text-white/40">Loading Recompass</p>
        </div>
      </div>
    );
  }

  // If user is already authenticated, redirect immediately into the app
  if (currentUser) {
    if (userProfile && !userProfile.onboardingComplete) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to="/app" replace />;
  }

  return children;
}

// ─── Protected Route (Requires authentication) ───────────────────
function ProtectedRoute({ children }: { children: ReactElement }) {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0b0e] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
          <p className="text-[10px] font-bold tracking-widest uppercase text-white/40">Loading Recompass</p>
        </div>
      </div>
    );
  }

  if (!currentUser) return <Navigate to="/login" replace />;
  return children;
}

// ─── App Route (Protected + AppShell) ─────────────────────────────
function AppRoute({ children }: { children: ReactElement }) {
  const { currentUser, userProfile, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0b0e] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
          <p className="text-[10px] font-bold tracking-widest uppercase text-white/40">Loading Recompass</p>
        </div>
      </div>
    );
  }

  if (!currentUser) return <Navigate to="/login" replace />;
  if (userProfile && !userProfile.onboardingComplete) return <Navigate to="/onboarding" replace />;
  return <AppShell>{children}</AppShell>;
}

// ─── Fallback Route (Redirects based on session) ──────────────────
function FallbackRoute() {
  const { currentUser, userProfile, loading } = useAuth();
  if (loading) return null;
  if (currentUser) {
    if (userProfile && !userProfile.onboardingComplete) return <Navigate to="/onboarding" replace />;
    return <Navigate to="/app" replace />;
  }
  return <Navigate to="/" replace />;
}

// ─── App Component ───────────────────────────────────────────────
function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Guest Only Routes (If signed in, automatically forwards to /app) */}
          <Route path="/" element={<GuestRoute><Landing /></GuestRoute>} />
          <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
          <Route path="/signup" element={<GuestRoute><Signup /></GuestRoute>} />

          {/* Onboarding (protected, no shell) */}
          <Route path="/onboarding" element={
            <ProtectedRoute><Onboarding /></ProtectedRoute>
          } />

          {/* App (protected + AppShell) */}
          <Route path="/app" element={
            <AppRoute><Home /></AppRoute>
          } />
          <Route path="/app/menu-upload" element={
            <AppRoute><MenuUpload /></AppRoute>
          } />
          <Route path="/app/week" element={
            <AppRoute><ThisWeek /></AppRoute>
          } />
          <Route path="/app/this-week" element={<Navigate to="/app/week" replace />} />
          <Route path="/app/log" element={
            <AppRoute><DailyLog /></AppRoute>
          } />
          <Route path="/app/profile" element={
            <AppRoute><Profile /></AppRoute>
          } />
          <Route path="/app/compass" element={
            <AppRoute><CompassChat /></AppRoute>
          } />
          <Route path="/app/groceries" element={
            <AppRoute><Groceries /></AppRoute>
          } />
          <Route path="/app/pantry" element={
            <AppRoute><Pantry /></AppRoute>
          } />
          <Route path="/app/cook" element={
            <AppRoute><Cook /></AppRoute>
          } />
          <Route path="/app/progress" element={
            <AppRoute><Progress /></AppRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<FallbackRoute />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

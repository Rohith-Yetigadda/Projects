import { useState } from "react";
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth, db } from "@/lib/firebase/config";
import { setDoc, doc, getDoc } from "firebase/firestore";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Compass, Eye, EyeOff, AlertCircle, ArrowLeft, Loader2, Check } from "lucide-react";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const provider = new GoogleAuthProvider();

  // If already logged in, redirect to app or onboarding
  if (currentUser) {
    if (userProfile && !userProfile.onboardingComplete) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to="/app" replace />;
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) return;
    try {
      setError("");
      setLoading(true);
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await setDoc(doc(db, "users", userCredential.user.uid, "profile", "main"), {
        name: name.trim(),
        email: email.trim(),
        onboardingComplete: false,
        createdAt: new Date().toISOString(),
      });
      navigate("/onboarding");
    } catch (err: any) {
      console.error("Signup error:", err);
      if (err.code === "auth/email-already-in-use") {
        setError("This email address is already in use. Try signing in.");
      } else if (err.code === "auth/weak-password") {
        setError("Password should be at least 6 characters.");
      } else {
        setError(err.message || "Failed to create account. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setError("");
      setGoogleLoading(true);
      const result = await signInWithPopup(auth, provider);
      const docRef = doc(db, "users", result.user.uid, "profile", "main");
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        await setDoc(docRef, {
          name: result.user.displayName || "User",
          email: result.user.email,
          onboardingComplete: false,
          createdAt: new Date().toISOString(),
        });
        navigate("/onboarding");
      } else {
        navigate("/app");
      }
    } catch (err: any) {
      if (err.code !== "auth/popup-closed-by-user") {
        setError(`Google sign-up error: ${err.message || "Could not sign up"}`);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0b0e] text-white flex flex-col justify-center items-center p-4 relative overflow-hidden selection:bg-emerald-500/30 selection:text-emerald-300 font-sans">
      
      {/* Ambient background glows */}
      <div className="absolute top-1/4 -right-40 w-96 h-96 bg-emerald-500/[0.04] rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 -left-40 w-96 h-96 bg-blue-500/[0.04] rounded-full blur-[140px] pointer-events-none" />

      {/* Top Left Back Navigation */}
      <div className="absolute top-6 left-6 z-20">
        <Link 
          to="/" 
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-xs font-semibold text-white/60 hover:text-white transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Home</span>
        </Link>
      </div>

      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-500">
        
        {/* Branding header */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white text-black shadow-lg shadow-white/10 mb-3 hover:scale-105 transition-transform duration-200">
            <Compass className="w-6 h-6 stroke-[2.2]" />
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Create your account</h1>
          <p className="text-xs sm:text-sm text-white/50 mt-1">Start tracking hostel macros in minutes</p>
        </div>

        {/* Card */}
        <div className="rounded-3xl bg-[#121418] border border-white/[0.08] p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-5">
          
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {/* Google Sign In */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading || googleLoading}
            className="w-full h-11 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-white text-xs font-semibold flex items-center justify-center gap-3 transition-all disabled:opacity-50"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            <span>Sign up with Google</span>
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-4">
            <div className="w-full border-t border-white/[0.06]" />
            <span className="absolute bg-[#121418] px-3 text-[10px] uppercase font-bold tracking-widest text-white/30">
              Or with email
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-white/70 block uppercase tracking-wider">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Rohith Kumar"
                className="w-full h-11 px-3.5 rounded-xl bg-[#0c0e12] border border-white/[0.08] focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 text-white placeholder-white/25 text-xs transition-all outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-white/70 block uppercase tracking-wider">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@university.edu"
                className="w-full h-11 px-3.5 rounded-xl bg-[#0c0e12] border border-white/[0.08] focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 text-white placeholder-white/25 text-xs transition-all outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-white/70 block uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full h-11 px-3.5 pr-10 rounded-xl bg-[#0c0e12] border border-white/[0.08] focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 text-white placeholder-white/25 text-xs transition-all outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Quick value props */}
            <div className="pt-1 space-y-1 text-[11px] text-white/50">
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Zero food scales needed — log in rotis and paddles</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Instant AI mess menu timetable scanner</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full h-11 rounded-xl bg-white text-black font-bold text-xs hover:bg-white/90 active:scale-[0.99] transition-all shadow-md flex items-center justify-center gap-2 mt-3 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating account...</span>
                </>
              ) : (
                <span>Create Free Account</span>
              )}
            </button>
          </form>

          {/* Footer inside card */}
          <div className="pt-4 border-t border-white/[0.06] text-center text-xs text-white/50">
            Already have an account?{" "}
            <Link to="/login" className="text-white font-semibold hover:underline transition-colors ml-1">
              Sign in
            </Link>
          </div>

        </div>

      </div>

    </div>
  );
}

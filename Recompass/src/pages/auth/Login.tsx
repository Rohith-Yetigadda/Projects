import { useState, useEffect } from "react";
import { signInWithEmailAndPassword, signInWithRedirect, getRedirectResult, GoogleAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const provider = new GoogleAuthProvider();

  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result) navigate("/app", { replace: true });
      })
      .catch((error) => {
        setError(`Google login failed: ${error.message}`);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [navigate]);

  if (currentUser && !loading) {
    return <Navigate to="/app" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError("");
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/app");
    } catch (err: any) {
      setError("Failed to sign in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    setLoading(true);
    signInWithRedirect(auth, provider).catch(err => {
      setLoading(false);
      setError(`Redirect failed: ${err.message}`);
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-[120px] pointer-events-none translate-x-1/3 -translate-y-1/3"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-[120px] pointer-events-none -translate-x-1/3 translate-y-1/3"></div>

      <Card className="w-full max-w-md glass-card border-none text-white relative z-10 animate-in fade-in zoom-in-95 duration-500">
        <CardHeader className="space-y-2 pb-8">
          <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(255,255,255,0.2)]">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z"/><circle cx="12" cy="12" r="10"/></svg>
          </div>
          <CardTitle className="text-3xl font-extrabold tracking-tight">Welcome back</CardTitle>
          <CardDescription className="text-muted-foreground font-medium">
            Sign in to continue your nutrition journey.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-5">
            {error && <div className="text-sm font-semibold text-destructive bg-destructive/10 p-3 rounded-lg">{error}</div>}
            
            <Button 
              type="button" 
              onClick={handleGoogleSignIn} 
              disabled={loading}
              className="w-full h-12 rounded-xl bg-white/10 text-white font-bold text-base hover:bg-white/20 transition-all duration-300 border border-white/10 flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#0a0a0a] px-2 text-white/50 font-semibold tracking-wider">Or continue with</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/70 font-semibold">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-black/40 border-white/10 text-white placeholder:text-white/30 h-12 rounded-xl focus-visible:ring-white/20 focus-visible:border-white/30 transition-all"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-white/70 font-semibold">Password</Label>
                <a href="#" className="text-xs font-semibold text-white/50 hover:text-white transition-colors">
                  Forgot password?
                </a>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-black/40 border-white/10 text-white placeholder:text-white/30 h-12 rounded-xl focus-visible:ring-white/20 focus-visible:border-white/30 transition-all"
              />
            </div>
            <Button type="submit" className="w-full h-12 rounded-xl bg-white text-black font-bold text-base hover:bg-white/90 hover:scale-[1.02] transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.15)] mt-4" disabled={loading}>
              {loading ? "Signing in..." : "Sign in with Email"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t border-white/10 p-6 mt-4">
          <div className="text-sm font-medium text-white/50">
            Don't have an account?{" "}
            <Link to="/signup" className="text-white hover:text-white hover:underline transition-colors">
              Sign up
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

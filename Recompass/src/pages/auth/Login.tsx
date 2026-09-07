import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { useNavigate, Link } from "react-router-dom";
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
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/app");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to log in.");
    } finally {
      setLoading(false);
    }
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
              {loading ? "Signing in..." : "Sign in"}
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

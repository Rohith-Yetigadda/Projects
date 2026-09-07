import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { db } from "@/lib/firebase/config";
import { doc, updateDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Onboarding() {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [data, setData] = useState({
    goal: "",
    age: "",
    weight: "",
    height: "",
    bodyFat: "",
    diet: "",
    cookingSkill: "",
    budget: "",
  });

  const updateData = (key: string, value: string) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const nextStep = () => setStep((s) => Math.min(s + 1, 4));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const completeOnboarding = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, "users", currentUser.uid, "profile", "main"), {
        ...data,
        onboardingComplete: true,
      });
      navigate("/app");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Already done onboarding
  if (userProfile?.onboardingComplete) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-[120px] pointer-events-none translate-x-1/3 -translate-y-1/3"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-[120px] pointer-events-none -translate-x-1/3 translate-y-1/3"></div>

      <Card className="w-full max-w-lg glass-card border-none text-white relative z-10 animate-in fade-in zoom-in-95 duration-500">
        <CardHeader className="pb-8">
          <CardTitle className="text-3xl font-extrabold tracking-tight">
            Welcome, {userProfile?.name?.split(" ")[0] ?? "User"}
          </CardTitle>
          <CardDescription className="text-muted-foreground font-medium text-base mt-2">
            Let's personalize your experience — Step {step} of 4
          </CardDescription>
          {/* Progress bar */}
          <div className="w-full h-1 bg-white/10 rounded-full mt-6 overflow-hidden">
            <div className="h-full bg-white transition-all duration-500 ease-out" style={{ width: `${(step / 4) * 100}%` }}></div>
          </div>
        </CardHeader>

        <CardContent className="min-h-[300px]">
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
              <h3 className="text-xl font-bold">What is your primary goal?</h3>
              <Select value={data.goal} onValueChange={(v: string) => updateData("goal", v)}>
                <SelectTrigger className="bg-black/40 border-white/10 text-white h-14 rounded-xl focus:ring-white/20 text-lg">
                  <SelectValue placeholder="Select a goal" />
                </SelectTrigger>
                <SelectContent className="bg-black border-white/10 text-white rounded-xl">
                  <SelectItem value="fat_loss" className="focus:bg-white/10 py-3 cursor-pointer">Lose fat</SelectItem>
                  <SelectItem value="muscle_gain" className="focus:bg-white/10 py-3 cursor-pointer">Build muscle</SelectItem>
                  <SelectItem value="recomp" className="focus:bg-white/10 py-3 cursor-pointer">Body recomposition</SelectItem>
                  <SelectItem value="maintain" className="focus:bg-white/10 py-3 cursor-pointer">Maintain weight</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
              <h3 className="text-xl font-bold">Your body data</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-white/70 font-semibold text-sm">Age</Label>
                  <Input
                    type="number"
                    value={data.age}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateData("age", e.target.value)}
                    placeholder="18"
                    className="bg-black/40 border-white/10 text-white placeholder:text-white/30 h-12 rounded-xl focus-visible:ring-white/20"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-white/70 font-semibold text-sm">Weight (kg)</Label>
                  <Input
                    type="number"
                    value={data.weight}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateData("weight", e.target.value)}
                    placeholder="76"
                    className="bg-black/40 border-white/10 text-white placeholder:text-white/30 h-12 rounded-xl focus-visible:ring-white/20"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-white/70 font-semibold text-sm">Height (cm)</Label>
                  <Input
                    type="number"
                    value={data.height}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateData("height", e.target.value)}
                    placeholder="175"
                    className="bg-black/40 border-white/10 text-white placeholder:text-white/30 h-12 rounded-xl focus-visible:ring-white/20"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-white/70 font-semibold text-sm">Est. Body Fat %</Label>
                  <Input
                    type="number"
                    value={data.bodyFat}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateData("bodyFat", e.target.value)}
                    placeholder="20"
                    className="bg-black/40 border-white/10 text-white placeholder:text-white/30 h-12 rounded-xl focus-visible:ring-white/20"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
              <h3 className="text-xl font-bold">Food &amp; Diet</h3>
              <div className="space-y-3">
                <Label className="text-white/70 font-semibold text-sm">Diet Type</Label>
                <Select value={data.diet} onValueChange={(v: string) => updateData("diet", v)}>
                  <SelectTrigger className="bg-black/40 border-white/10 text-white h-12 rounded-xl focus:ring-white/20">
                    <SelectValue placeholder="Select diet" />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-white/10 text-white rounded-xl">
                    <SelectItem value="veg" className="focus:bg-white/10 cursor-pointer">Vegetarian</SelectItem>
                    <SelectItem value="eggetarian" className="focus:bg-white/10 cursor-pointer">Eggetarian</SelectItem>
                    <SelectItem value="non_veg" className="focus:bg-white/10 cursor-pointer">Non-vegetarian</SelectItem>
                    <SelectItem value="vegan" className="focus:bg-white/10 cursor-pointer">Vegan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3 pt-4">
                <Label className="text-white/70 font-semibold text-sm">Cooking Skill</Label>
                <Select value={data.cookingSkill} onValueChange={(v: string) => updateData("cookingSkill", v)}>
                  <SelectTrigger className="bg-black/40 border-white/10 text-white h-12 rounded-xl focus:ring-white/20">
                    <SelectValue placeholder="Select skill" />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-white/10 text-white rounded-xl">
                    <SelectItem value="none" className="focus:bg-white/10 cursor-pointer">Cannot cook</SelectItem>
                    <SelectItem value="basic" className="focus:bg-white/10 cursor-pointer">Very basic</SelectItem>
                    <SelectItem value="beginner" className="focus:bg-white/10 cursor-pointer">Beginner</SelectItem>
                    <SelectItem value="intermediate" className="focus:bg-white/10 cursor-pointer">Comfortable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
              <h3 className="text-xl font-bold">Weekly Grocery Budget</h3>
              <p className="text-white/60 text-sm -mt-4 mb-4">This helps us recommend recipes that fit your wallet.</p>
              <Select value={data.budget} onValueChange={(v: string) => updateData("budget", v)}>
                <SelectTrigger className="bg-black/40 border-white/10 text-white h-14 rounded-xl focus:ring-white/20 text-lg">
                  <SelectValue placeholder="Select weekly budget" />
                </SelectTrigger>
                <SelectContent className="bg-black border-white/10 text-white rounded-xl">
                  <SelectItem value="500" className="focus:bg-white/10 py-3 cursor-pointer">₹500 / week</SelectItem>
                  <SelectItem value="750" className="focus:bg-white/10 py-3 cursor-pointer">₹750 / week</SelectItem>
                  <SelectItem value="1000" className="focus:bg-white/10 py-3 cursor-pointer">₹1,000 / week</SelectItem>
                  <SelectItem value="1500" className="focus:bg-white/10 py-3 cursor-pointer">₹1,500 / week</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between border-t border-white/10 p-6">
          <Button variant="ghost" onClick={prevStep} disabled={step === 1} className="text-white hover:bg-white/10 rounded-xl px-6 h-12 font-semibold">
            Back
          </Button>
          {step < 4 ? (
            <Button onClick={nextStep} className="bg-white text-black rounded-xl px-8 h-12 font-bold hover:bg-white/90 hover:scale-[1.02] transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)]">
              Continue
            </Button>
          ) : (
            <Button onClick={completeOnboarding} disabled={loading} className="bg-white text-black rounded-xl px-8 h-12 font-bold hover:bg-white/90 hover:scale-[1.02] transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)]">
              {loading ? "Saving..." : "Complete Setup"}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

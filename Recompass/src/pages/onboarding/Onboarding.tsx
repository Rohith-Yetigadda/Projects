import { useState } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { db } from "@/lib/firebase/config";
import { doc, setDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Compass, 
  Flame, 
  Dumbbell, 
  Target, 
  ShieldCheck, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Loader2,
  Sparkles,
  Utensils,
  Wallet
} from "lucide-react";

export default function Onboarding() {
  const { currentUser, userProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [data, setData] = useState({
    goal: "recomp",
    age: "20",
    weight: "70",
    height: "175",
    gender: "male",
    bodyFat: "",
    diet: "eggetarian",
    cookingSkill: "basic",
    budget: "3000",
  });

  const updateData = (key: string, value: string) => {
    setData((prev) => ({ ...prev, [key]: value }));
    setError("");
  };

  const nextStep = () => {
    if (step === 2) {
      if (!data.age || !data.weight || !data.height) {
        setError("Please fill in your age, weight, and height.");
        return;
      }
    }
    setError("");
    setStep((s) => Math.min(s + 1, 4));
  };

  const prevStep = () => {
    setError("");
    setStep((s) => Math.max(s - 1, 1));
  };

  const completeOnboarding = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const parsedBf = data.bodyFat && data.bodyFat.trim() !== "" ? parseFloat(data.bodyFat) : null;
      await setDoc(doc(db, "users", currentUser.uid, "profile", "main"), {
        ...data,
        name: currentUser.displayName || "Student",
        email: currentUser.email || "",
        weight: parseFloat(data.weight) || 70,
        height: parseFloat(data.height) || 175,
        age: parseInt(data.age) || 20,
        gender: data.gender || "male",
        bodyFat: parsedBf !== null && !isNaN(parsedBf) ? parsedBf : null,
        onboardingComplete: true,
      }, { merge: true });
      await refreshProfile();
      navigate("/app");
    } catch (e: any) {
      console.error(e);
      setError("Failed to save profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Already completed onboarding
  if (userProfile?.onboardingComplete) {
    return <Navigate to="/app" replace />;
  }

  const goalOptions = [
    {
      id: "fat_loss",
      label: "Lose Fat",
      desc: "Caloric deficit with elevated protein to preserve lean muscle.",
      icon: Flame,
      color: "text-rose-400",
      borderActive: "border-rose-500/50 bg-rose-500/[0.06]"
    },
    {
      id: "muscle_gain",
      label: "Build Muscle",
      desc: "Controlled caloric surplus with high protein (2.2g/kg) for hypertrophy.",
      icon: Dumbbell,
      color: "text-amber-400",
      borderActive: "border-amber-500/50 bg-amber-500/[0.06]"
    },
    {
      id: "recomp",
      label: "Body Recomp",
      desc: "Near-maintenance calories with high protein (2.0g/kg) to build muscle and drop fat.",
      icon: Target,
      color: "text-emerald-400",
      borderActive: "border-emerald-500/50 bg-emerald-500/[0.06]"
    },
    {
      id: "maintain",
      label: "Maintain Weight",
      desc: "True energy balance (1.6g/kg protein) to sustain current physique and energy.",
      icon: ShieldCheck,
      color: "text-sky-400",
      borderActive: "border-sky-500/50 bg-sky-500/[0.06]"
    },
  ];

  const dietOptions = [
    { id: "veg", label: "Vegetarian", desc: "Plant foods, dairy, paneer, lentils" },
    { id: "eggetarian", label: "Eggetarian", desc: "Vegetarian plus whole eggs & egg whites" },
    { id: "non_veg", label: "Non-Vegetarian", desc: "Chicken, fish, eggs, and dairy" },
    { id: "vegan", label: "Vegan", desc: "100% plant-based, soy, legumes, grains" },
  ];

  const cookingOptions = [
    { id: "none", label: "Mess & Dining Hall Only", desc: "I don't cook — entirely campus food" },
    { id: "dorm", label: "Dorm Essentials", desc: "Electric kettle, shaker, microwave" },
    { id: "basic", label: "Induction / Small Stove", desc: "Oats, eggs, rice, simple meals" },
    { id: "full", label: "Full Kitchen Access", desc: "Complete cooking equipment" },
  ];

  const budgetOptions = [
    { id: "1500", label: "₹1,500 / month", desc: "Lean essentials (eggs, bananas, bread, milk)" },
    { id: "3000", label: "₹3,000 / month", desc: "Whole-food protein pantry (eggs, milk, curd, oats, peanut butter, sattu)" },
    { id: "5000", label: "₹5,000 / month", desc: "Whey protein & essentials (1kg whey protein, eggs, oats, peanut butter)" },
    { id: "8000", label: "₹8,000+ / month", desc: "Athlete & fitness stack (premium whey isolate, creatine, nuts, supplements)" },
  ];

  return (
    <div className="min-h-screen bg-[#0a0b0e] text-white flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      
      {/* Ambient background glows */}
      <div className="fixed top-1/4 -right-40 w-96 h-96 bg-emerald-500/[0.04] rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed bottom-1/4 -left-40 w-96 h-96 bg-teal-500/[0.03] rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-xl relative z-10 animate-in fade-in zoom-in-95 duration-500">
        
        {/* Top Branding & Progress */}
        <div className="flex items-center justify-between mb-6 px-1">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-white text-black flex items-center justify-center shadow-md">
              <Compass className="w-4 h-4 stroke-[2.2]" />
            </div>
            <span className="font-extrabold text-sm tracking-tight text-white font-sans">Recompass</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-white/50 tracking-wider uppercase">
              Step {step} of 4
            </span>
            <div className="w-20 h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-400 rounded-full transition-all duration-300 ease-out" 
                style={{ width: `${(step / 4) * 100}%` }} 
              />
            </div>
          </div>
        </div>

        {/* Main Card */}
        <div className="rounded-3xl bg-[#121418] border border-white/[0.08] p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
          
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* STEP 1: FITNESS GOAL */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] font-bold tracking-widest uppercase text-emerald-400 mb-2">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  <span>Target Calibration</span>
                </div>
                <h2 className="text-2xl font-extrabold text-white tracking-tight">What is your primary goal?</h2>
                <p className="text-xs text-white/50 mt-1">We calibrate your caloric expenditure and daily macronutrients based on this choice.</p>
              </div>

              <div className="grid grid-cols-1 gap-3 pt-2">
                {goalOptions.map((g) => {
                  const Icon = g.icon;
                  const isSelected = data.goal === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => updateData("goal", g.id)}
                      className={`w-full p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 group ${
                        isSelected 
                          ? `${g.borderActive} ring-1 ring-white/20` 
                          : "bg-[#0c0e12] border-white/[0.06] hover:border-white/[0.14] hover:bg-white/[0.02]"
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-white/[0.08] bg-white/[0.04] ${isSelected ? g.color : "text-white/60"}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-white tracking-tight">{g.label}</p>
                          {isSelected && <Check className="w-4 h-4 text-emerald-400 stroke-[2.5]" />}
                        </div>
                        <p className="text-[11px] text-white/50 mt-0.5 leading-relaxed">{g.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: BODY VITALS */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] font-bold tracking-widest uppercase text-emerald-400 mb-2">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  <span>Physical Vitals</span>
                </div>
                <h2 className="text-2xl font-extrabold text-white tracking-tight">Your body measurements</h2>
                <p className="text-xs text-white/50 mt-1">Used to accurately calculate your Basal Metabolic Rate (BMR) and daily expenditure.</p>
              </div>

              {/* Gender Selection */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] font-semibold text-white/70 uppercase tracking-wider block">Biological Sex (for metabolic baseline)</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { id: "male", label: "Male" },
                    { id: "female", label: "Female" },
                  ].map((sex) => {
                    const isSelected = data.gender === sex.id;
                    return (
                      <button
                        key={sex.id}
                        type="button"
                        onClick={() => updateData("gender", sex.id)}
                        className={`h-11 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                          isSelected
                            ? "bg-white text-black border-white shadow-sm"
                            : "bg-[#0c0e12] border-white/[0.08] text-white/70 hover:border-white/20 hover:text-white"
                        }`}
                      >
                        {sex.label}
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5 pt-1">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-white/70 uppercase tracking-wider block">Age</label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      value={data.age}
                      onChange={(e) => updateData("age", e.target.value)}
                      placeholder="20"
                      className="w-full h-11 px-3.5 pr-12 rounded-xl bg-[#0c0e12] border border-white/[0.08] focus:border-white/30 text-white text-xs font-semibold outline-none"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-white/40">yrs</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-white/70 uppercase tracking-wider block">Weight</label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      value={data.weight}
                      onChange={(e) => updateData("weight", e.target.value)}
                      placeholder="70"
                      className="w-full h-11 px-3.5 pr-10 rounded-xl bg-[#0c0e12] border border-white/[0.08] focus:border-white/30 text-white text-xs font-semibold outline-none"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-white/40">kg</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-white/70 uppercase tracking-wider block">Height</label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      value={data.height}
                      onChange={(e) => updateData("height", e.target.value)}
                      placeholder="175"
                      className="w-full h-11 px-3.5 pr-10 rounded-xl bg-[#0c0e12] border border-white/[0.08] focus:border-white/30 text-white text-xs font-semibold outline-none"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-white/40">cm</span>
                  </div>
                </div>

                {/* Body Fat is purely optional */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-white/70 uppercase tracking-wider block">Body Fat %</label>
                    <span className="text-[10px] text-emerald-400 font-medium">Optional</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      value={data.bodyFat}
                      onChange={(e) => updateData("bodyFat", e.target.value)}
                      placeholder="Optional"
                      className="w-full h-11 px-3.5 pr-8 rounded-xl bg-[#0c0e12] border border-white/[0.08] focus:border-white/30 text-white text-xs font-semibold outline-none"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-white/40">%</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[11px] text-white/45 leading-relaxed">
                {data.bodyFat && data.bodyFat.trim() !== "" ? (
                  <span className="text-emerald-400 font-medium">
                    ✓ Body fat provided: BMR will be calculated using the Katch-McArdle formula (Lean Body Mass).
                  </span>
                ) : (
                  <span>
                    💡 <strong className="text-white/70">Body fat is optional:</strong> If left empty, BMR will be accurately derived using the standard Mifflin-St Jeor formula.
                  </span>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: DIET & COOKING */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] font-bold tracking-widest uppercase text-emerald-400 mb-2">
                  <Utensils className="w-3 h-3 text-emerald-400" />
                  <span>Diet & Setup</span>
                </div>
                <h2 className="text-2xl font-extrabold text-white tracking-tight">Food preferences & dining</h2>
                <p className="text-xs text-white/50 mt-1">Helps Compass AI tailor mess recommendations to what you actually eat.</p>
              </div>

              <div className="space-y-3 pt-1">
                <label className="text-[11px] font-semibold text-white/70 uppercase tracking-wider block">Diet Type</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {dietOptions.map((d) => {
                    const isSelected = data.diet === d.id;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => updateData("diet", d.id)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? "bg-white/[0.08] border-white text-white shadow-sm ring-1 ring-white/20"
                            : "bg-[#0c0e12] border-white/[0.06] text-white/70 hover:border-white/[0.12]"
                        }`}
                      >
                        <p className="text-xs font-bold text-white">{d.label}</p>
                        <p className="text-[10px] text-white/40 mt-0.5 truncate">{d.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <label className="text-[11px] font-semibold text-white/70 uppercase tracking-wider block">Cooking Setup</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {cookingOptions.map((c) => {
                    const isSelected = data.cookingSkill === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => updateData("cookingSkill", c.id)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? "bg-white/[0.08] border-white text-white shadow-sm ring-1 ring-white/20"
                            : "bg-[#0c0e12] border-white/[0.06] text-white/70 hover:border-white/[0.12]"
                        }`}
                      >
                        <p className="text-xs font-bold text-white">{c.label}</p>
                        <p className="text-[10px] text-white/40 mt-0.5 truncate">{c.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: BUDGET & FINALIZATION */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] font-bold tracking-widest uppercase text-emerald-400 mb-2">
                  <Wallet className="w-3 h-3 text-emerald-400" />
                  <span>Monthly Grocery Budget</span>
                </div>
                <h2 className="text-2xl font-extrabold text-white tracking-tight">Monthly grocery & food budget</h2>
                <p className="text-xs text-white/50 mt-1">Helps Compass assist with dorm pantry restocking and smart grocery planning.</p>
              </div>

              <div className="grid grid-cols-1 gap-2.5 pt-2">
                {budgetOptions.map((b) => {
                  const isSelected = data.budget === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => updateData("budget", b.id)}
                      className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                        isSelected
                          ? "bg-emerald-500/[0.06] border-emerald-500/50 ring-1 ring-emerald-500/30 text-white"
                          : "bg-[#0c0e12] border-white/[0.06] hover:border-white/[0.12] text-white/70"
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold text-white tracking-tight">{b.label}</p>
                        <p className="text-[11px] text-white/50 mt-0.5">{b.desc}</p>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-emerald-400 stroke-[2.5]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Navigation Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-white/[0.06] gap-3">
            {step > 1 ? (
              <button
                type="button"
                onClick={prevStep}
                className="px-5 py-2.5 rounded-full border border-white/[0.08] bg-white/[0.03] text-white/70 hover:text-white hover:bg-white/[0.06] text-xs font-semibold transition-all flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={nextStep}
                className="px-7 py-2.5 rounded-full bg-white text-black font-bold text-xs hover:bg-neutral-200 active:scale-[0.98] transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={completeOnboarding}
                disabled={loading}
                className="px-8 py-2.5 rounded-full bg-white text-black font-bold text-xs hover:bg-neutral-200 active:scale-[0.98] transition-all shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Finalizing Setup...</span>
                  </>
                ) : (
                  <>
                    <span>Complete Setup</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db, auth } from "@/lib/firebase/config";
import { doc, setDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { User, Target, Activity, LogOut, Check, Loader2, Sparkles, PieChart, Flame, Wallet, RotateCcw } from "lucide-react";
import { calculateMacroTargets } from "@/lib/nutritionCalculator";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export default function Profile() {
  const { userProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<"vitals" | "targets">("vitals");
  
  const [data, setData] = useState({
    name: "",
    age: "",
    weight: "",
    height: "",
    gender: "male",
    activity: "moderate",
    bodyFat: "",
    goal: "maintain",
    budget: "3000",
    customTargetsEnabled: false,
    customCalories: "",
    customProtein: "",
    customCarbs: "",
    customFats: ""
  });

  useEffect(() => {
    if (userProfile) {
      setData({
        name: userProfile.name || "",
        age: userProfile.age ? String(userProfile.age) : "",
        weight: userProfile.weight ? String(userProfile.weight) : "",
        height: userProfile.height ? String(userProfile.height) : "",
        gender: userProfile.gender || "male",
        activity: userProfile.activity || "moderate",
        bodyFat: userProfile.bodyFat !== undefined && userProfile.bodyFat !== null ? String(userProfile.bodyFat) : "",
        goal: userProfile.goal || "maintain",
        budget: userProfile.budget || "3000",
        customTargetsEnabled: userProfile.targetOverrides?.enabled === true || String(userProfile.targetOverrides?.enabled) === "true",
        customCalories: userProfile.targetOverrides?.calories ? String(userProfile.targetOverrides.calories) : "",
        customProtein: userProfile.targetOverrides?.protein ? String(userProfile.targetOverrides.protein) : "",
        customCarbs: userProfile.targetOverrides?.carbs ? String(userProfile.targetOverrides.carbs) : "",
        customFats: userProfile.targetOverrides?.fats ? String(userProfile.targetOverrides.fats) : "",
      });
    }
  }, [userProfile]);

  // Auto-calculated preview via centralized sports nutrition target engine (always passes current bio + goal)
  const macroCalc = calculateMacroTargets({
    weight: data.weight,
    height: data.height,
    age: data.age,
    gender: data.gender,
    activity: data.activity,
    bodyFat: data.bodyFat,
    goal: data.goal,
    targetOverrides: { enabled: false }, // force calculate formula targets for preview
  });

  const autoCalories = macroCalc.calories;
  const autoProtein = macroCalc.protein;
  const autoCarbs = macroCalc.carbs;
  const autoFats = macroCalc.fats;

  // Active target calculation for energy distribution
  const activeCalories = data.customTargetsEnabled ? (parseInt(data.customCalories) || autoCalories) : autoCalories;
  const activeProtein = data.customTargetsEnabled ? (parseInt(data.customProtein) || autoProtein) : autoProtein;
  const activeCarbs = data.customTargetsEnabled ? (parseInt(data.customCarbs) || autoCarbs) : autoCarbs;
  const activeFats = data.customTargetsEnabled ? (parseInt(data.customFats) || autoFats) : autoFats;

  const proteinCal = activeProtein * 4;
  const carbsCal = activeCarbs * 4;
  const fatsCal = activeFats * 9;
  const totalMacroCal = (proteinCal + carbsCal + fatsCal) || 1;

  const proteinPct = Math.round((proteinCal / totalMacroCal) * 100);
  const carbsPct = Math.round((carbsCal / totalMacroCal) * 100);
  const fatsPct = Math.max(0, 100 - proteinPct - carbsPct);

  const syncCustomWithGoal = () => {
    setData((prev) => ({
      ...prev,
      customCalories: String(autoCalories),
      customProtein: String(autoProtein),
      customCarbs: String(autoCarbs),
      customFats: String(autoFats),
    }));
  };

  const handleSave = async () => {
    if (!auth.currentUser) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      const parsedBf = data.bodyFat.trim() !== "" ? parseFloat(data.bodyFat) : null;
      const updates = {
        name: data.name,
        age: parseInt(data.age) || 20,
        weight: parseFloat(data.weight) || 70,
        height: parseFloat(data.height) || 170,
        gender: data.gender || "male",
        activity: data.activity || "moderate",
        bodyFat: parsedBf !== null && !isNaN(parsedBf) ? parsedBf : null,
        goal: data.goal,
        budget: data.budget,
        targetOverrides: {
          enabled: data.customTargetsEnabled,
          calories: parseInt(data.customCalories) || autoCalories,
          protein: parseInt(data.customProtein) || autoProtein,
          carbs: parseInt(data.customCarbs) || autoCarbs,
          fats: parseInt(data.customFats) || autoFats,
        }
      };
      await setDoc(doc(db, "users", auth.currentUser.uid, "profile", "main"), updates, { merge: true });
      await refreshProfile();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 md:space-y-7 animate-in fade-in duration-500 pb-4">
      
      {/* Compact Editorial Header */}
      <header className="flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] font-bold tracking-widest uppercase text-white/50 mb-1.5">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>Profile & Preferences</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tightest font-sans">
            Account Settings
          </h1>
          <p className="text-xs md:text-sm font-normal text-white/45 mt-0.5">
            Manage your physical stats, fitness goals, and metabolic targets.
          </p>
        </div>

        <button 
          onClick={() => setShowSignOutConfirm(true)} 
          title="Sign out"
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-white/50 hover:text-rose-400 hover:border-rose-500/20 hover:bg-rose-500/10 transition-all shrink-0 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      
      {/* High-Density Segmented Tab Switcher (Reduces Mobile Scrolling by 50%) */}
      <div className="grid grid-cols-2 p-1 rounded-2xl bg-[#121418] border border-white/[0.06] gap-1">
        <button
          type="button"
          onClick={() => setActiveTab("vitals")}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "vitals"
              ? "bg-white text-black shadow-md font-extrabold"
              : "text-white/60 hover:text-white"
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Biometrics & Goal</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("targets")}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "targets"
              ? "bg-white text-black shadow-md font-extrabold"
              : "text-white/60 hover:text-white"
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Targets & Budget</span>
        </button>
      </div>

      <div className="space-y-5">
        {activeTab === "vitals" ? (
          <div className="space-y-5 animate-in fade-in duration-300">
            {/* Personal Details */}
        <section className="rounded-2xl sm:rounded-3xl bg-[#121418] border border-white/[0.06] p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-white/[0.06] pb-3.5">
            <div className="w-7 h-7 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-white/80">
              <User className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-white tracking-tight">Personal Details</h2>
              <p className="text-[10px] sm:text-[11px] text-white/40">Physical vitals used to derive energy expenditure</p>
            </div>
          </div>
          
          <div className="space-y-3.5">
            <div>
              <label className="text-[10px] font-semibold text-white/40 uppercase tracking-widest block mb-1.5">Display Name</label>
              <input 
                type="text" 
                value={data.name} 
                onChange={e=>setData({...data, name: e.target.value})} 
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-white font-sans font-medium text-xs sm:text-sm focus:outline-none focus:border-white/30 focus:bg-white/[0.05] transition-all" 
                placeholder="Your Name" 
              />
            </div>

            {/* Biological Sex Selector */}
            <div>
              <label className="text-[10px] font-semibold text-white/40 uppercase tracking-widest block mb-1.5">Biological Sex (for metabolic baseline)</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "male", label: "Male" },
                  { id: "female", label: "Female" },
                ].map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setData({ ...data, gender: s.id })}
                    className={`h-9 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      data.gender === s.id
                        ? "bg-white text-black border-white shadow-sm"
                        : "bg-white/[0.02] border-white/[0.06] text-white/60 hover:text-white"
                    }`}
                  >
                    <span>{s.label}</span>
                    {data.gender === s.id && <Check className="w-3 h-3 stroke-[3]" />}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
              <div>
                <label className="text-[10px] font-semibold text-white/40 uppercase tracking-widest block mb-1.5">Age</label>
                <input 
                  type="number" 
                  value={data.age} 
                  onChange={e=>setData({...data, age: e.target.value})} 
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-white font-sans font-semibold text-xs sm:text-sm focus:outline-none focus:border-white/30" 
                  placeholder="20" 
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-white/40 uppercase tracking-widest block mb-1.5">Weight (kg)</label>
                <input 
                  type="number" 
                  value={data.weight} 
                  onChange={e=>setData({...data, weight: e.target.value})} 
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-white font-sans font-semibold text-xs sm:text-sm focus:outline-none focus:border-white/30" 
                  placeholder="70" 
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-white/40 uppercase tracking-widest block mb-1.5">Height (cm)</label>
                <input 
                  type="number" 
                  value={data.height} 
                  onChange={e=>setData({...data, height: e.target.value})} 
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-white font-sans font-semibold text-xs sm:text-sm focus:outline-none focus:border-white/30" 
                  placeholder="175" 
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-semibold text-white/40 uppercase tracking-widest block">Body Fat %</label>
                  <span className="text-[9px] font-bold text-emerald-400">Optional</span>
                </div>
                <input 
                  type="number" 
                  value={data.bodyFat} 
                  onChange={e=>setData({...data, bodyFat: e.target.value})} 
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-white font-sans font-semibold text-xs sm:text-sm focus:outline-none focus:border-white/30" 
                  placeholder="Optional" 
                />
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between text-[10px] sm:text-[11px] text-white/45">
              <span>Active BMR Formula:</span>
              <span className="font-semibold text-white/70">
                {macroCalc.formula === "katch_mcardle" ? "Katch-McArdle (LBM Active)" : "Mifflin-St Jeor (Standard)"}
              </span>
            </div>
          </div>
        </section>
            {/* Goal Settings */}
        <section className="rounded-2xl sm:rounded-3xl bg-[#121418] border border-white/[0.06] p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-white/[0.06] pb-3.5">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Target className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-white tracking-tight">Primary Fitness Goal</h2>
              <p className="text-[10px] sm:text-[11px] text-white/40">Directs the automated macro distribution formula</p>
            </div>
          </div>
          
          <div className="p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] grid grid-cols-4 gap-1">
            {[
              { id: "fat_loss", label: "Fat Loss", short: "Fat Loss" },
              { id: "muscle_gain", label: "Build Muscle", short: "Muscle" },
              { id: "recomp", label: "Recomp", short: "Recomp" },
              { id: "maintain", label: "Maintenance", short: "Maintain" }
            ].map(g => (
              <button 
                key={g.id} 
                type="button"
                onClick={() => setData({...data, goal: g.id})}
                className={`py-2 px-1 rounded-lg text-center text-[10px] sm:text-xs font-bold transition-all truncate select-none cursor-pointer ${
                  data.goal === g.id 
                    ? "bg-white text-black shadow-sm font-extrabold" 
                    : "text-white/50 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                <span className="hidden sm:inline">{g.label}</span>
                <span className="sm:hidden">{g.short}</span>
              </button>
            ))}
          </div>
          
          <p className="text-[11px] text-white/40 text-center font-medium px-1">
            {data.goal === "fat_loss" && "Fat Loss • Caloric deficit (-350 kcal) with 2.0g/kg protein to preserve lean muscle."}
            {data.goal === "muscle_gain" && "Build Muscle • Controlled surplus (+300 kcal) with 2.2g/kg protein for hypertrophy."}
            {data.goal === "recomp" && "Body Recomp • Slight deficit (-175 kcal) with 2.0g/kg protein to build muscle while dropping body fat."}
            {data.goal === "maintain" && "Maintenance • Energy balance (100% TDEE) with 1.6g/kg protein to sustain your current physique."}
          </p>
        </section>
          </div>
        ) : (
          <div className="space-y-5 animate-in fade-in duration-300">
            {/* Nutrition Targets */}
        <section className="rounded-2xl sm:rounded-3xl bg-[#121418] border border-white/[0.06] p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                <Activity className="w-3.5 h-3.5" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-white tracking-tight">Daily Nutritional Targets</h2>
                <p className="text-[10px] sm:text-[11px] text-white/40">Caloric and macronutrient limits</p>
              </div>
            </div>
            
            {/* Apple iOS Style Toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <span className="text-[11px] font-medium text-white/50 hidden sm:inline">Manual Override</span>
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="sr-only" 
                  checked={data.customTargetsEnabled} 
                  onChange={e=>setData({...data, customTargetsEnabled: e.target.checked})} 
                />
                <div className={`w-10 h-5.5 rounded-full transition-colors duration-200 ${
                  data.customTargetsEnabled ? "bg-white" : "bg-white/15"
                }`} />
                <div className={`absolute left-0.5 top-0.5 w-4.5 h-4.5 rounded-full transition-transform duration-200 ${
                  data.customTargetsEnabled ? "translate-x-4.5 bg-black" : "bg-white"
                }`} />
              </div>
            </label>
          </div>

          {!data.customTargetsEnabled ? (
            <div className="animate-in fade-in duration-300 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400/90">
                    Auto-Calculated for {data.goal === "recomp" ? "Body Recomp" : data.goal === "fat_loss" ? "Fat Loss" : data.goal === "muscle_gain" ? "Build Muscle" : "Maintenance"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <p className="text-[9px] text-white/40 font-semibold uppercase tracking-widest mb-0.5">Calories</p>
                  <p className="font-sans font-bold text-white text-lg sm:text-xl">{autoCalories}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <p className="text-[9px] text-orange-400/70 font-semibold uppercase tracking-widest mb-0.5">Protein</p>
                  <p className="font-sans font-bold text-orange-400 text-lg sm:text-xl">{autoProtein}<span className="text-xs text-orange-400/50 ml-0.5">g</span></p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <p className="text-[9px] text-sky-400/70 font-semibold uppercase tracking-widest mb-0.5">Carbs</p>
                  <p className="font-sans font-bold text-sky-400 text-lg sm:text-xl">{autoCarbs}<span className="text-xs text-sky-400/50 ml-0.5">g</span></p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <p className="text-[9px] text-emerald-400/70 font-semibold uppercase tracking-widest mb-0.5">Fats</p>
                  <p className="font-sans font-bold text-emerald-400 text-lg sm:text-xl">{autoFats}<span className="text-xs text-emerald-400/50 ml-0.5">g</span></p>
                </div>
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in duration-300 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">
                    Custom Targets Active
                  </p>
                </div>
                <button
                  type="button"
                  onClick={syncCustomWithGoal}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-white/50 hover:text-white transition-colors cursor-pointer"
                  title="Reset custom values to auto-calculated goal values"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Sync with Goal</span>
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="text-[9px] font-semibold text-white/40 uppercase tracking-widest block mb-1">Calories</label>
                  <input 
                    type="number" 
                    value={data.customCalories} 
                    onChange={e=>setData({...data, customCalories: e.target.value})} 
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-white font-sans font-bold text-sm focus:outline-none focus:border-white/30" 
                    placeholder={String(autoCalories)}
                  />
                </div>
                <div>
                  <label className="text-[9px] font-semibold text-orange-400/70 uppercase tracking-widest block mb-1">Protein (g)</label>
                  <input 
                    type="number" 
                    value={data.customProtein} 
                    onChange={e=>setData({...data, customProtein: e.target.value})} 
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-orange-400 font-sans font-bold text-sm focus:outline-none focus:border-white/30" 
                    placeholder={String(autoProtein)}
                  />
                </div>
                <div>
                  <label className="text-[9px] font-semibold text-sky-400/70 uppercase tracking-widest block mb-1">Carbs (g)</label>
                  <input 
                    type="number" 
                    value={data.customCarbs} 
                    onChange={e=>setData({...data, customCarbs: e.target.value})} 
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-sky-400 font-sans font-bold text-sm focus:outline-none focus:border-white/30" 
                    placeholder={String(autoCarbs)}
                  />
                </div>
                <div>
                  <label className="text-[9px] font-semibold text-emerald-400/70 uppercase tracking-widest block mb-1">Fats (g)</label>
                  <input 
                    type="number" 
                    value={data.customFats} 
                    onChange={e=>setData({...data, customFats: e.target.value})} 
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-emerald-400 font-sans font-bold text-sm focus:outline-none focus:border-white/30" 
                    placeholder={String(autoFats)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Live Macro Energy Split Ratio Bar */}
          <div className="pt-3 border-t border-white/[0.06] space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-white/60 font-medium">
                <PieChart className="w-3.5 h-3.5 text-white/40" />
                <span className="text-[11px]">Macro Energy Split</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-semibold text-white/40">
                <Flame className="w-3 h-3 text-orange-400/70" />
                <span>{activeCalories} kcal target</span>
              </div>
            </div>

            {/* Segmented Progress Bar */}
            <div className="h-2.5 w-full rounded-full bg-white/[0.04] p-0.5 overflow-hidden flex gap-1">
              <div 
                style={{ width: `${Math.max(5, proteinPct)}%` }} 
                className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-300"
                title={`Protein: ${proteinPct}%`}
              />
              <div 
                style={{ width: `${Math.max(5, carbsPct)}%` }} 
                className="h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-500 transition-all duration-300"
                title={`Carbs: ${carbsPct}%`}
              />
              <div 
                style={{ width: `${Math.max(5, fatsPct)}%` }} 
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                title={`Fats: ${fatsPct}%`}
              />
            </div>

            {/* Split Legend */}
            <div className="grid grid-cols-3 gap-2 pt-0.5 text-center">
              <div className="p-2 rounded-xl bg-orange-500/5 border border-orange-500/10">
                <p className="text-[9px] font-bold text-orange-400 tracking-wider uppercase">Protein</p>
                <p className="text-xs font-bold text-white mt-0.5">{proteinPct}% <span className="text-[10px] text-white/40 font-normal">({activeProtein}g)</span></p>
              </div>
              <div className="p-2 rounded-xl bg-sky-500/5 border border-sky-500/10">
                <p className="text-[9px] font-bold text-sky-400 tracking-wider uppercase">Carbs</p>
                <p className="text-xs font-bold text-white mt-0.5">{carbsPct}% <span className="text-[10px] text-white/40 font-normal">({activeCarbs}g)</span></p>
              </div>
              <div className="p-2 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                <p className="text-[9px] font-bold text-emerald-400 tracking-wider uppercase">Fats</p>
                <p className="text-xs font-bold text-white mt-0.5">{fatsPct}% <span className="text-[10px] text-white/40 font-normal">({activeFats}g)</span></p>
              </div>
            </div>
          </div>
        </section>
            {/* Monthly Grocery Budget - High-Density 2x2 Grid on Mobile */}
        <section className="rounded-2xl sm:rounded-3xl bg-[#121418] border border-white/[0.06] p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-white/[0.06] pb-3.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Wallet className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-white tracking-tight">Monthly Grocery & Food Budget</h2>
              <p className="text-[10px] sm:text-[11px] text-white/40">Used for groceries restocking, protein staples, and meal recommendations</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
            {[
              { id: "1500", label: "₹1,500 / mo", desc: "Lean essentials (eggs, bananas, bread, milk)" },
              { id: "3000", label: "₹3,000 / mo", desc: "Whole-food protein (eggs, curd, oats, peanut butter, sattu)" },
              { id: "5000", label: "₹5,000 / mo", desc: "Whey & essentials (1kg whey, eggs, oats, peanut butter)" },
              { id: "8000", label: "₹8,000+ / mo", desc: "Athlete stack (premium whey, creatine, supplements)" }
            ].map(b => {
              const isSelected = data.budget === b.id;
              return (
                <button 
                  key={b.id} 
                  type="button"
                  onClick={() => setData({...data, budget: b.id})}
                  className={`p-3 rounded-xl sm:rounded-2xl text-left border transition-all flex flex-col justify-between cursor-pointer ${
                    isSelected 
                      ? "bg-white text-black border-white shadow-sm" 
                      : "bg-white/[0.02] border-white/[0.06] text-white/70 hover:border-white/20 hover:text-white"
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold leading-tight">{b.label}</p>
                    <p className={`text-[10px] mt-1 leading-normal ${isSelected ? "text-neutral-700 font-medium" : "text-white/40"}`}>{b.desc}</p>
                  </div>
                  {isSelected && (
                    <div className="flex items-center gap-1 text-[9px] font-bold text-black mt-2">
                      <Check className="w-3 h-3 stroke-[3]" />
                      <span>Active</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>
          </div>
        )}
      </div>
  
        {/* Save Button */}
        <div className="pt-1 pb-4">
          <button 
            type="button"
            onClick={handleSave} 
            disabled={saving} 
            className="w-full h-11 sm:h-12 bg-white text-black rounded-xl sm:rounded-2xl font-bold text-xs tracking-wider uppercase hover:bg-white/90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saveSuccess ? (
              <><Check className="w-4 h-4 text-emerald-600 stroke-[3]" /> Saved Successfully</>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>

      {/* Sign Out Confirmation Modal */}
      <ConfirmDialog
        open={showSignOutConfirm}
        title="Sign out?"
        description="You'll need to sign back in to access your nutrition data and meal plans."
        confirmLabel="Sign out"
        cancelLabel="Cancel"
        variant="danger"
        icon="logout"
        onConfirm={handleLogout}
        onCancel={() => setShowSignOutConfirm(false)}
      />

    </div>
  );
}

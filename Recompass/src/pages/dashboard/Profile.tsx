import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db, auth } from "@/lib/firebase/config";
import { doc, setDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { User, Target, Activity, LogOut, Check, Loader2, Sparkles, PieChart, Flame } from "lucide-react";

export default function Profile() {
  const { userProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const [data, setData] = useState({
    name: "",
    age: "",
    weight: "",
    height: "",
    goal: "maintain",
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
        age: userProfile.age || "",
        weight: userProfile.weight || "",
        height: userProfile.height || "",
        goal: userProfile.goal || "maintain",
        customTargetsEnabled: userProfile.targetOverrides?.enabled || false,
        customCalories: userProfile.targetOverrides?.calories?.toString() || "",
        customProtein: userProfile.targetOverrides?.protein?.toString() || "",
        customCarbs: userProfile.targetOverrides?.carbs?.toString() || "",
        customFats: userProfile.targetOverrides?.fats?.toString() || "",
      });
    }
  }, [userProfile]);

  const handleSave = async () => {
    if (!auth.currentUser) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      const updates = {
        name: data.name,
        age: data.age,
        weight: data.weight,
        height: data.height,
        goal: data.goal,
        targetOverrides: {
          enabled: data.customTargetsEnabled,
          calories: parseInt(data.customCalories) || 2000,
          protein: parseInt(data.customProtein) || 120,
          carbs: parseInt(data.customCarbs) || 200,
          fats: parseInt(data.customFats) || 60,
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

  // Auto-calculated preview
  const w = parseFloat(data.weight) || 70;
  const h = parseFloat(data.height) || 170;
  const a = parseFloat(data.age) || 25;
  const bmr = (10 * w) + (6.25 * h) - (5 * a) + 5;
  let tdee = bmr * 1.55;
  let autoProtein = w * 1.6;
  if (data.goal === "muscle_gain") { tdee += 300; autoProtein = w * 2.2; }
  else if (data.goal === "fat_loss") tdee -= 300;
  const autoCalories = Math.round(tdee);
  const autoFats = Math.round((autoCalories * 0.25) / 9);
  const autoCarbs = Math.round((autoCalories - (autoProtein * 4) - (autoFats * 9)) / 4);

  // Active target calculation for energy distribution
  const activeCalories = data.customTargetsEnabled ? (parseInt(data.customCalories) || 2000) : autoCalories;
  const activeProtein = data.customTargetsEnabled ? (parseInt(data.customProtein) || 120) : Math.round(autoProtein);
  const activeCarbs = data.customTargetsEnabled ? (parseInt(data.customCarbs) || 200) : autoCarbs;
  const activeFats = data.customTargetsEnabled ? (parseInt(data.customFats) || 60) : autoFats;

  const proteinCal = activeProtein * 4;
  const carbsCal = activeCarbs * 4;
  const fatsCal = activeFats * 9;
  const totalMacroCal = (proteinCal + carbsCal + fatsCal) || 1;

  const proteinPct = Math.round((proteinCal / totalMacroCal) * 100);
  const carbsPct = Math.round((carbsCal / totalMacroCal) * 100);
  const fatsPct = Math.max(0, 100 - proteinPct - carbsPct);

  return (
    <div className="max-w-2xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-24 md:pb-6">
      
      {/* Editorial Header */}
      <header className="flex items-end justify-between">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] font-bold tracking-widest uppercase text-white/50 mb-2.5">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>Profile & Preferences</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tightest font-sans">
            Account Settings
          </h1>
          <p className="text-sm font-normal text-white/45 mt-1.5">
            Manage your physical stats, fitness goals, and metabolic targets.
          </p>
        </div>

        <button 
          onClick={handleLogout} 
          title="Sign out"
          className="w-10 h-10 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-white/50 hover:text-rose-400 hover:border-rose-500/20 hover:bg-rose-500/10 transition-all"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      <div className="space-y-6">
        
        {/* Personal Details */}
        <section className="rounded-3xl bg-[#121418] border border-white/[0.06] p-5 sm:p-7 space-y-5">
          <div className="flex items-center gap-3 border-b border-white/[0.06] pb-4">
            <div className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-white/80">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Personal Details</h2>
              <p className="text-[11px] text-white/40">Basic physical stats used to derive energy expenditure</p>
            </div>
          </div>
          
          <div>
            <label className="text-[11px] font-semibold text-white/40 uppercase tracking-widest block mb-2">Display Name</label>
            <input 
              type="text" 
              value={data.name} 
              onChange={e=>setData({...data, name: e.target.value})} 
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-4 py-3 text-white font-sans font-medium text-sm focus:outline-none focus:border-white/30 focus:bg-white/[0.05] transition-all" 
              placeholder="Your Name" 
            />
          </div>
          
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="text-[10px] sm:text-[11px] font-semibold text-white/40 uppercase tracking-widest block mb-2">Age</label>
              <input 
                type="number" 
                value={data.age} 
                onChange={e=>setData({...data, age: e.target.value})} 
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-3 sm:px-4 py-3 text-white font-sans font-semibold text-sm focus:outline-none focus:border-white/30 focus:bg-white/[0.05] transition-all" 
                placeholder="20" 
              />
            </div>
            <div>
              <label className="text-[10px] sm:text-[11px] font-semibold text-white/40 uppercase tracking-widest block mb-2">Weight (kg)</label>
              <input 
                type="number" 
                value={data.weight} 
                onChange={e=>setData({...data, weight: e.target.value})} 
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-3 sm:px-4 py-3 text-white font-sans font-semibold text-sm focus:outline-none focus:border-white/30 focus:bg-white/[0.05] transition-all" 
                placeholder="70" 
              />
            </div>
            <div>
              <label className="text-[10px] sm:text-[11px] font-semibold text-white/40 uppercase tracking-widest block mb-2">Height (cm)</label>
              <input 
                type="number" 
                value={data.height} 
                onChange={e=>setData({...data, height: e.target.value})} 
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-3 sm:px-4 py-3 text-white font-sans font-semibold text-sm focus:outline-none focus:border-white/30 focus:bg-white/[0.05] transition-all" 
                placeholder="175" 
              />
            </div>
          </div>
        </section>

        {/* Goal Settings */}
        <section className="rounded-3xl bg-[#121418] border border-white/[0.06] p-5 sm:p-7 space-y-5">
          <div className="flex items-center gap-3 border-b border-white/[0.06] pb-4">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Primary Fitness Goal</h2>
              <p className="text-[11px] text-white/40">Directs the automated macro distribution formula</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { id: "fat_loss", label: "Fat Loss", desc: "Deficit • High Protein" },
              { id: "muscle_gain", label: "Build Muscle", desc: "Surplus • 2.2g/kg Protein" },
              { id: "recomp", label: "Recomp", desc: "Maintenance • Lean Mass" },
              { id: "maintain", label: "Maintenance", desc: "Energy Balance" }
            ].map(g => (
              <button 
                key={g.id} 
                type="button"
                onClick={() => setData({...data, goal: g.id})}
                className={`py-3 px-3 rounded-2xl text-left transition-all duration-200 border flex flex-col justify-between min-h-[72px] ${
                  data.goal === g.id 
                    ? "bg-white text-black border-white shadow-sm" 
                    : "bg-white/[0.03] border-white/[0.06] text-white/60 hover:text-white hover:bg-white/[0.06]"
                }`}
              >
                <span className={`text-xs font-bold ${data.goal === g.id ? "text-black" : "text-white"}`}>{g.label}</span>
                <span className={`text-[10px] mt-1 line-clamp-1 ${data.goal === g.id ? "text-black/60 font-medium" : "text-white/35"}`}>{g.desc}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Nutrition Targets */}
        <section className="rounded-3xl bg-[#121418] border border-white/[0.06] p-5 sm:p-7 space-y-6">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white tracking-tight">Daily Nutritional Targets</h2>
                <p className="text-[11px] text-white/40">Caloric and macronutrient limits</p>
              </div>
            </div>
            
            {/* Apple iOS Style Toggle */}
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <span className="text-xs font-medium text-white/50 hidden sm:inline">Manual Override</span>
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="sr-only" 
                  checked={data.customTargetsEnabled} 
                  onChange={e=>setData({...data, customTargetsEnabled: e.target.checked})} 
                />
                <div className={`w-11 h-6 rounded-full transition-colors duration-200 ${
                  data.customTargetsEnabled ? "bg-white" : "bg-white/15"
                }`} />
                <div className={`absolute left-0.5 top-0.5 w-5 h-5 rounded-full transition-transform duration-200 ${
                  data.customTargetsEnabled ? "translate-x-5 bg-black" : "bg-white"
                }`} />
              </div>
            </label>
          </div>

          {!data.customTargetsEnabled ? (
            <div className="animate-in fade-in duration-300 space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400/90">
                  Auto-Calculated Profile Active
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                  <p className="text-[10px] text-white/40 font-semibold uppercase tracking-widest mb-1">Calories</p>
                  <p className="font-sans font-bold text-white text-xl sm:text-2xl">{autoCalories}</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                  <p className="text-[10px] text-orange-400/70 font-semibold uppercase tracking-widest mb-1">Protein</p>
                  <p className="font-sans font-bold text-orange-400 text-xl sm:text-2xl">{Math.round(autoProtein)}<span className="text-xs text-orange-400/50 ml-0.5">g</span></p>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                  <p className="text-[10px] text-sky-400/70 font-semibold uppercase tracking-widest mb-1">Carbs</p>
                  <p className="font-sans font-bold text-sky-400 text-xl sm:text-2xl">{autoCarbs}<span className="text-xs text-sky-400/50 ml-0.5">g</span></p>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                  <p className="text-[10px] text-emerald-400/70 font-semibold uppercase tracking-widest mb-1">Fats</p>
                  <p className="font-sans font-bold text-emerald-400 text-xl sm:text-2xl">{autoFats}<span className="text-xs text-emerald-400/50 ml-0.5">g</span></p>
                </div>
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in duration-300 space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">
                  Custom Targets Active
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-white/40 uppercase tracking-widest block mb-1.5">Calories</label>
                  <input 
                    type="number" 
                    value={data.customCalories} 
                    onChange={e=>setData({...data, customCalories: e.target.value})} 
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-3.5 py-2.5 text-white font-sans font-bold text-base focus:outline-none focus:border-white/30" 
                    placeholder="2000"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-orange-400/70 uppercase tracking-widest block mb-1.5">Protein (g)</label>
                  <input 
                    type="number" 
                    value={data.customProtein} 
                    onChange={e=>setData({...data, customProtein: e.target.value})} 
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-3.5 py-2.5 text-orange-400 font-sans font-bold text-base focus:outline-none focus:border-white/30" 
                    placeholder="120"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-sky-400/70 uppercase tracking-widest block mb-1.5">Carbs (g)</label>
                  <input 
                    type="number" 
                    value={data.customCarbs} 
                    onChange={e=>setData({...data, customCarbs: e.target.value})} 
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-3.5 py-2.5 text-sky-400 font-sans font-bold text-base focus:outline-none focus:border-white/30" 
                    placeholder="200"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-emerald-400/70 uppercase tracking-widest block mb-1.5">Fats (g)</label>
                  <input 
                    type="number" 
                    value={data.customFats} 
                    onChange={e=>setData({...data, customFats: e.target.value})} 
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-3.5 py-2.5 text-emerald-400 font-sans font-bold text-base focus:outline-none focus:border-white/30" 
                    placeholder="60"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Live Macro Energy Split Ratio Bar */}
          <div className="pt-4 border-t border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-white/60 font-medium">
                <PieChart className="w-3.5 h-3.5 text-white/40" />
                <span>Macro Energy Split</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-white/40">
                <Flame className="w-3 h-3 text-orange-400/70" />
                <span>{activeCalories} kcal target</span>
              </div>
            </div>

            {/* Segmented Progress Bar */}
            <div className="h-3 w-full rounded-full bg-white/[0.04] p-0.5 overflow-hidden flex gap-1">
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
            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="p-2 rounded-xl bg-orange-500/5 border border-orange-500/10">
                <p className="text-[10px] font-bold text-orange-400 tracking-wider uppercase">Protein</p>
                <p className="text-xs font-bold text-white mt-0.5">{proteinPct}% <span className="text-[10px] text-white/40 font-normal">({activeProtein}g)</span></p>
              </div>
              <div className="p-2 rounded-xl bg-sky-500/5 border border-sky-500/10">
                <p className="text-[10px] font-bold text-sky-400 tracking-wider uppercase">Carbs</p>
                <p className="text-xs font-bold text-white mt-0.5">{carbsPct}% <span className="text-[10px] text-white/40 font-normal">({activeCarbs}g)</span></p>
              </div>
              <div className="p-2 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                <p className="text-[10px] font-bold text-emerald-400 tracking-wider uppercase">Fats</p>
                <p className="text-xs font-bold text-white mt-0.5">{fatsPct}% <span className="text-[10px] text-white/40 font-normal">({activeFats}g)</span></p>
              </div>
            </div>
          </div>
        </section>

        {/* Desktop Save Button */}
        <div className="hidden md:block">
          <button 
            onClick={handleSave} 
            disabled={saving} 
            className="w-full h-12 bg-white text-black rounded-full font-bold text-xs tracking-wide uppercase hover:bg-white/90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
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

      </div>

      {/* Sticky Mobile Save Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#0a0a0c]/90 backdrop-blur-2xl border-t border-white/[0.08] z-30 md:hidden animate-in slide-in-from-bottom duration-300">
        <button 
          onClick={handleSave} 
          disabled={saving} 
          className="w-full h-12 bg-white text-black rounded-full font-bold text-xs tracking-wide uppercase hover:bg-white/90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-xl disabled:opacity-50"
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

    </div>
  );
}
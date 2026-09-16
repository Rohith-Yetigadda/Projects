import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db, auth } from "@/lib/firebase/config";
import { doc, setDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { User, Target, Activity, Settings, LogOut, Check, Loader2 } from "lucide-react";

export default function Profile() {
  const { userProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
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

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-28 md:pb-0">
      
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Profile</h1>
          <p className="text-muted-foreground font-medium text-sm">Manage your goals and body metrics</p>
        </div>
        <button onClick={handleLogout} className="w-10 h-10 rounded-full glass flex items-center justify-center text-white/50 hover:text-white transition-colors">
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      <div className="space-y-6">
        
        {/* Personal Details */}
        <section className="glass-card rounded-3xl p-6 md:p-8 space-y-8">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-emerald-400" />
              <h2 className="font-bold text-white">Personal Details</h2>
            </div>
          </div>
          
          <div className="group relative">
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-1 transition-colors group-focus-within:text-emerald-400">Display Name</label>
            <input type="text" value={data.name} onChange={e=>setData({...data, name: e.target.value})} className="w-full bg-transparent border-b border-white/10 group-focus-within:border-emerald-500 pb-2 text-white font-sans font-semibold text-xl focus:outline-none transition-colors" placeholder="Your Name" />
          </div>
          
          <div className="grid grid-cols-3 gap-6 md:gap-8">
            <div className="group relative">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-1 transition-colors group-focus-within:text-emerald-400">Age</label>
              <input type="number" value={data.age} onChange={e=>setData({...data, age: e.target.value})} className="w-full bg-transparent border-b border-white/10 group-focus-within:border-emerald-500 pb-2 text-white font-sans font-semibold text-xl focus:outline-none transition-colors" placeholder="18" />
            </div>
            <div className="group relative">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-1 transition-colors group-focus-within:text-emerald-400">Weight (kg)</label>
              <input type="number" value={data.weight} onChange={e=>setData({...data, weight: e.target.value})} className="w-full bg-transparent border-b border-white/10 group-focus-within:border-emerald-500 pb-2 text-white font-sans font-semibold text-xl focus:outline-none transition-colors" placeholder="70" />
            </div>
            <div className="group relative">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-1 transition-colors group-focus-within:text-emerald-400">Height (cm)</label>
              <input type="number" value={data.height} onChange={e=>setData({...data, height: e.target.value})} className="w-full bg-transparent border-b border-white/10 group-focus-within:border-emerald-500 pb-2 text-white font-sans font-semibold text-xl focus:outline-none transition-colors" placeholder="170" />
            </div>
          </div>
        </section>

        {/* Goal Settings */}
        <section className="glass-card rounded-3xl p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
              <Target className="w-5 h-5 text-blue-400" />
              <h2 className="font-bold text-white">Fitness Goal</h2>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { id: "fat_loss", label: "Lose Fat" },
              { id: "muscle_gain", label: "Build Muscle" },
              { id: "recomp", label: "Recomposition" },
              { id: "maintain", label: "Maintain" }
            ].map(g => (
              <button key={g.id} onClick={() => setData({...data, goal: g.id})}
                className={`p-3 rounded-xl border text-sm font-semibold transition-all ${data.goal === g.id ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}>
                {g.label}
              </button>
            ))}
          </div>
        </section>

        {/* Nutrition Targets */}
        <section className="glass-card rounded-3xl p-6 md:p-8 space-y-8">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-orange-400" />
              <h2 className="font-bold text-white">Daily Targets</h2>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <span className="text-sm font-semibold text-white/60">Override limits manually</span>
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={data.customTargetsEnabled} onChange={e=>setData({...data, customTargetsEnabled: e.target.checked})} />
                <div className={`block w-10 h-6 rounded-full transition-colors ${data.customTargetsEnabled ? 'bg-orange-500' : 'bg-white/20'}`}></div>
                <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${data.customTargetsEnabled ? 'translate-x-4' : ''}`}></div>
              </div>
            </label>
          </div>

          {!data.customTargetsEnabled ? (
            <div className="pt-2 animate-in fade-in duration-300">
              <div className="flex items-center gap-2 mb-6">
                <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/80">Auto-Calculated Profile Active</p>
              </div>
              <div className="grid grid-cols-4 gap-4 px-2">
                <div>
                  <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mb-2">Cals</p>
                  <p className="font-sans font-semibold text-white tracking-tight text-2xl">{autoCalories}</p>
                </div>
                <div>
                  <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mb-2">Pro</p>
                  <p className="font-sans font-semibold text-white tracking-tight text-2xl">{Math.round(autoProtein)}<span className="text-white/20 text-sm ml-1 font-bold">g</span></p>
                </div>
                <div>
                  <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mb-2">Carbs</p>
                  <p className="font-sans font-semibold text-white tracking-tight text-2xl">{autoCarbs}<span className="text-white/20 text-sm ml-1 font-bold">g</span></p>
                </div>
                <div>
                  <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mb-2">Fats</p>
                  <p className="font-sans font-semibold text-white tracking-tight text-2xl">{autoFats}<span className="text-white/20 text-sm ml-1 font-bold">g</span></p>
                </div>
              </div>
            </div>
          ) : (
            <div className="pt-2 animate-in fade-in duration-300">
              <div className="flex items-center gap-2 mb-6">
                <div className="h-2 w-2 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]"></div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-orange-500/80">Manual Override Active</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-6 px-2">
                
                {/* Calories */}
                <div className="group relative">
                  <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-1 transition-colors group-focus-within:text-orange-400">Calories</label>
                  <div className="flex items-baseline gap-1 border-b border-white/10 group-focus-within:border-orange-500 transition-colors pb-1">
                    <input 
                      type="number" 
                      value={data.customCalories} 
                      onChange={e=>setData({...data, customCalories: e.target.value})} 
                      className="w-full bg-transparent text-white font-sans font-semibold tracking-tight text-2xl outline-none p-0 focus:ring-0 placeholder:text-white/10" 
                      placeholder="2000"
                    />
                  </div>
                </div>

                {/* Protein */}
                <div className="group relative">
                  <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-1 transition-colors group-focus-within:text-orange-400">Protein</label>
                  <div className="flex items-baseline gap-1 border-b border-white/10 group-focus-within:border-orange-500 transition-colors pb-1">
                    <input 
                      type="number" 
                      value={data.customProtein} 
                      onChange={e=>setData({...data, customProtein: e.target.value})} 
                      className="w-full bg-transparent text-white font-sans font-semibold tracking-tight text-2xl outline-none p-0 focus:ring-0 placeholder:text-white/10" 
                      placeholder="120"
                    />
                    <span className="text-white/20 text-sm font-bold">g</span>
                  </div>
                </div>

                {/* Carbs */}
                <div className="group relative">
                  <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-1 transition-colors group-focus-within:text-orange-400">Carbs</label>
                  <div className="flex items-baseline gap-1 border-b border-white/10 group-focus-within:border-orange-500 transition-colors pb-1">
                    <input 
                      type="number" 
                      value={data.customCarbs} 
                      onChange={e=>setData({...data, customCarbs: e.target.value})} 
                      className="w-full bg-transparent text-white font-sans font-semibold tracking-tight text-2xl outline-none p-0 focus:ring-0 placeholder:text-white/10" 
                      placeholder="200"
                    />
                    <span className="text-white/20 text-sm font-bold">g</span>
                  </div>
                </div>

                {/* Fats */}
                <div className="group relative">
                  <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-1 transition-colors group-focus-within:text-orange-400">Fats</label>
                  <div className="flex items-baseline gap-1 border-b border-white/10 group-focus-within:border-orange-500 transition-colors pb-1">
                    <input 
                      type="number" 
                      value={data.customFats} 
                      onChange={e=>setData({...data, customFats: e.target.value})} 
                      className="w-full bg-transparent text-white font-sans font-semibold tracking-tight text-2xl outline-none p-0 focus:ring-0 placeholder:text-white/10" 
                      placeholder="60"
                    />
                    <span className="text-white/20 text-sm font-bold">g</span>
                  </div>
                </div>

              </div>
            </div>
          )}
        </section>

        {/* Save Button */}
        <button onClick={handleSave} disabled={saving} className="w-full h-12 bg-white/5 border border-white/10 text-white rounded-2xl font-bold text-sm hover:bg-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 text-emerald-400" /> Save Changes</>}
        </button>

      </div>
    </div>
  );
}
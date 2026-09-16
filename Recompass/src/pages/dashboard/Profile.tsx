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
        <section className="glass-card rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-4">
            <User className="w-5 h-5 text-emerald-400" />
            <h2 className="font-bold text-white">Personal Details</h2>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-white/40">Display Name</label>
            <input type="text" value={data.name} onChange={e=>setData({...data, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30" />
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-white/40">Age</label>
              <input type="number" value={data.age} onChange={e=>setData({...data, age: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-white/40">Weight (kg)</label>
              <input type="number" value={data.weight} onChange={e=>setData({...data, weight: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-white/40">Height (cm)</label>
              <input type="number" value={data.height} onChange={e=>setData({...data, height: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30" />
            </div>
          </div>
        </section>

        {/* Goal Settings */}
        <section className="glass-card rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-4">
            <Target className="w-5 h-5 text-blue-400" />
            <h2 className="font-bold text-white">Fitness Goal</h2>
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
        <section className="glass-card rounded-3xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
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
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">Auto-Calculated Mode</p>
                  <p className="text-sm text-white/60 mt-1">Based on Mifflin-St Jeor equation & your stats.</p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4 pt-2">
                <div><p className="text-xs text-white/40 font-bold mb-1">CALS</p><p className="font-mono font-bold text-white text-lg">{autoCalories}</p></div>
                <div><p className="text-xs text-white/40 font-bold mb-1">PRO</p><p className="font-mono font-bold text-white text-lg">{Math.round(autoProtein)}g</p></div>
                <div><p className="text-xs text-white/40 font-bold mb-1">CARBS</p><p className="font-mono font-bold text-white text-lg">{autoCarbs}g</p></div>
                <div><p className="text-xs text-white/40 font-bold mb-1">FAT</p><p className="font-mono font-bold text-white text-lg">{autoFats}g</p></div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <p className="text-xs font-bold uppercase tracking-wider text-orange-400">Manual Override Active</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                
                {/* Calories */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-orange-500/5 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity rounded-2xl"></div>
                  <div className="relative bg-[#0a0a0a] border border-white/5 group-focus-within:border-orange-500/30 rounded-2xl p-4 transition-all hover:bg-white/[0.02]">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-2">Calories</label>
                    <div className="flex items-baseline gap-1">
                      <input 
                        type="number" 
                        value={data.customCalories} 
                        onChange={e=>setData({...data, customCalories: e.target.value})} 
                        className="w-full bg-transparent text-white font-mono font-bold text-2xl outline-none p-0 focus:ring-0 placeholder:text-white/10" 
                        placeholder="2000"
                      />
                    </div>
                  </div>
                </div>

                {/* Protein */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-orange-500/5 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity rounded-2xl"></div>
                  <div className="relative bg-[#0a0a0a] border border-white/5 group-focus-within:border-orange-500/30 rounded-2xl p-4 transition-all hover:bg-white/[0.02]">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-2">Protein</label>
                    <div className="flex items-baseline gap-1">
                      <input 
                        type="number" 
                        value={data.customProtein} 
                        onChange={e=>setData({...data, customProtein: e.target.value})} 
                        className="w-full bg-transparent text-white font-mono font-bold text-2xl outline-none p-0 focus:ring-0 placeholder:text-white/10" 
                        placeholder="120"
                      />
                      <span className="text-white/20 text-sm font-bold">g</span>
                    </div>
                  </div>
                </div>

                {/* Carbs */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-orange-500/5 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity rounded-2xl"></div>
                  <div className="relative bg-[#0a0a0a] border border-white/5 group-focus-within:border-orange-500/30 rounded-2xl p-4 transition-all hover:bg-white/[0.02]">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-2">Carbs</label>
                    <div className="flex items-baseline gap-1">
                      <input 
                        type="number" 
                        value={data.customCarbs} 
                        onChange={e=>setData({...data, customCarbs: e.target.value})} 
                        className="w-full bg-transparent text-white font-mono font-bold text-2xl outline-none p-0 focus:ring-0 placeholder:text-white/10" 
                        placeholder="200"
                      />
                      <span className="text-white/20 text-sm font-bold">g</span>
                    </div>
                  </div>
                </div>

                {/* Fats */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-orange-500/5 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity rounded-2xl"></div>
                  <div className="relative bg-[#0a0a0a] border border-white/5 group-focus-within:border-orange-500/30 rounded-2xl p-4 transition-all hover:bg-white/[0.02]">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-2">Fats</label>
                    <div className="flex items-baseline gap-1">
                      <input 
                        type="number" 
                        value={data.customFats} 
                        onChange={e=>setData({...data, customFats: e.target.value})} 
                        className="w-full bg-transparent text-white font-mono font-bold text-2xl outline-none p-0 focus:ring-0 placeholder:text-white/10" 
                        placeholder="60"
                      />
                      <span className="text-white/20 text-sm font-bold">g</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}
        </section>

        {/* Save Button */}
        <button onClick={handleSave} disabled={saving} className="w-full h-14 bg-white text-black rounded-xl font-bold text-lg hover:bg-white/90 hover:scale-[1.01] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.2)]">
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Check className="w-5 h-5" /> Save Changes</>}
        </button>

      </div>
    </div>
  );
}
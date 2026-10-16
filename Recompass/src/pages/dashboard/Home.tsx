import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { Compass, Flame, Droplet, Wheat, Plus, ArrowRight, Coffee, Sun, Moon, Check, Sparkles, Package, ChefHat } from "lucide-react";

type MacroEntry = { name: string; calories: number; protein: number; carbs: number; fats: number; };
type DayLog = { breakfast: MacroEntry[]; lunch: MacroEntry[]; dinner: MacroEntry[]; snacks: MacroEntry[]; totals?: { calories: number; protein: number; carbs: number; fats: number } };
type MealPlan = { day: string; breakfast: string[]; lunch: string[]; dinner: string[]; };

function calcTargets(profile: any) {
  if (profile?.targetOverrides?.enabled) {
    return {
      calories: profile.targetOverrides.calories || 2000,
      protein: profile.targetOverrides.protein || 120,
      carbs: profile.targetOverrides.carbs || 200,
      fats: profile.targetOverrides.fats || 60
    };
  }
  const weight = parseFloat(profile?.weight) || 70;
  const height = parseFloat(profile?.height) || 170;
  const age    = parseFloat(profile?.age)    || 20;
  const bmr    = 10 * weight + 6.25 * height - 5 * age + 5;
  const tdee   = bmr * 1.55;
  const goal   = profile?.goal || "maintain_weight";
  const kcal   = goal.includes("muscle") ? tdee + 300 : goal.includes("lose") ? tdee - 300 : tdee;
  const protein = goal.includes("muscle") ? weight * 2.2 : weight * 1.6;
  const fats    = (kcal * 0.25) / 9;
  const carbs   = (kcal - protein * 4 - fats * 9) / 4;
  return { calories: Math.round(kcal), protein: Math.round(protein), carbs: Math.round(carbs), fats: Math.round(fats) };
}

function getCurrentMeal(): "breakfast" | "lunch" | "dinner" | null {
  const now = new Date();
  const time = now.getHours() + now.getMinutes() / 60;
  if (time >= 7 && time < 9.5) return "breakfast"; // 7:00am - 9:30am
  if (time >= 12 && time < 14.5) return "lunch";   // 12:00pm - 2:30pm
  if (time >= 19 && time < 21) return "dinner";    // 7:00pm - 9:00pm
  return null;
}

const mealLabels: any = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner" };

export default function Home() {
  const { userProfile, currentUser } = useAuth();
  const firstName = userProfile?.name?.split(" ")[0] || "User";
  const targets = calcTargets(userProfile);

  const [todayLog, setTodayLog] = useState<DayLog>({ breakfast: [], lunch: [], dinner: [], snacks: [] });
  const [todayMenu, setTodayMenu] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split("T")[0];
  const dayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const currentMeal = getCurrentMeal();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      try {
        const [logSnap, menuSnap] = await Promise.all([
          getDoc(doc(db, "users", currentUser.uid, "logs", today)),
          getDocs(query(collection(db, "users", currentUser.uid, "menus"), orderBy("uploadedAt", "desc"), limit(1))),
        ]);
        if (logSnap.exists()) setTodayLog(logSnap.data() as DayLog);
        if (!menuSnap.empty) {
          const extracted: MealPlan[] = menuSnap.docs[0].data().extractedData || [];
          setTodayMenu(extracted.find(d => d.day === dayName) || extracted[0] || null);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [currentUser, today, dayName]);

  const allItems = [...(todayLog.breakfast||[]), ...(todayLog.lunch||[]), ...(todayLog.dinner||[]), ...(todayLog.snacks||[])];
  const logged = allItems.reduce((a, i) => ({ 
    calories: a.calories + i.calories, 
    protein: a.protein + i.protein, 
    carbs: a.carbs + i.carbs, 
    fats: a.fats + i.fats 
  }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

  const caloriePercent = Math.min((logged.calories / targets.calories) * 100, 100);
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (caloriePercent / 100) * circumference;

  const currentMealItems = currentMeal && todayMenu ? todayMenu[currentMeal] || [] : [];
  const remaining = { 
    calories: targets.calories - logged.calories,
    protein: targets.protein - logged.protein, 
    carbs: targets.carbs - logged.carbs 
  };
  
  const compassSuggestion = currentMeal && currentMealItems.length > 0
    ? (remaining.protein > 20
        ? currentMealItems.slice(0, 2).join(" and ") + " — high protein choices for your goal"
        : remaining.carbs < 50
        ? "Go light today — " + currentMealItems[0] + " and skip the rice"
        : currentMealItems.slice(0, 3).join(", "))
    : null;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-28 md:pb-8">

      {/* Editorial Header */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] font-bold tracking-widest uppercase text-white/50 mb-2.5">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>Today's Overview</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tightest font-sans">
            {greeting}, {firstName}.
          </h1>
          <p className="text-sm font-normal text-white/45 mt-1.5">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-xs font-medium text-white/60">
            {remaining.calories > 0 ? (
              <>Remaining: <span className="text-white font-sans font-bold">{Math.round(remaining.calories)}</span> kcal</>
            ) : (
              <span className="text-emerald-400 font-semibold">Calorie target completed</span>
            )}
          </div>
        </div>
      </header>

      {/* Compass AI Guidance Widget */}
      {compassSuggestion && currentMeal ? (
        <section className="rounded-3xl bg-[#121418] border border-white/[0.08] p-5 md:p-6 flex items-center justify-between gap-4 relative overflow-hidden group hover:border-white/20 transition-all">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-11 h-11 shrink-0 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-white">
              <Compass className="w-5 h-5 stroke-[2]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-[10px] font-bold tracking-widest text-white/40 uppercase">
                  Compass &middot; {mealLabels[currentMeal]} open
                </span>
              </div>
              <p className="text-sm font-semibold text-white truncate max-w-xl">
                {compassSuggestion}
              </p>
            </div>
          </div>
          <Link 
            to="/app/log" 
            className="shrink-0 px-4 py-2 rounded-full bg-white text-black font-semibold text-xs hover:bg-white/90 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Meal</span>
          </Link>
        </section>
      ) : (
        <section className="rounded-3xl bg-[#121418] border border-white/[0.06] p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 shrink-0 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-white/40">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white/60">No meal service right now</p>
              <p className="text-[11px] text-white/35 mt-0.5">Mess serves breakfast (7-9:30am), lunch (12-2:30pm), dinner (7-9pm)</p>
            </div>
          </div>
          <Link 
            to="/app/log" 
            className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      )}

      {/* Main Nutrition Bento Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        
        {/* Apple Health Calorie Ring */}
        <section className="rounded-3xl bg-[#121418] border border-white/[0.06] p-6 flex flex-col items-center justify-center relative overflow-hidden group hover:border-white/[0.12] transition-all">
          <div className="w-full flex items-center justify-between mb-4">
            <span className="text-[11px] font-semibold text-white/40 uppercase tracking-widest">Energy Intake</span>
            <span className="text-xs font-sans font-bold text-white/40">{Math.round(caloriePercent)}%</span>
          </div>

          <div className="relative flex items-center justify-center my-3">
            <svg viewBox="0 0 160 160" className="w-40 h-40 md:w-44 md:h-44 transform -rotate-90">
              <circle 
                cx="80" 
                cy="80" 
                r={radius} 
                className="stroke-white/[0.06]" 
                strokeWidth="10" 
                fill="none" 
              />
              <circle 
                cx="80" 
                cy="80" 
                r={radius}
                className="stroke-white transition-all duration-1000 ease-out"
                strokeWidth="10" 
                strokeLinecap="round" 
                fill="none"
                strokeDasharray={circumference} 
                strokeDashoffset={loading ? circumference : strokeDashoffset} 
              />
            </svg>
            
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-4xl md:text-5xl font-extrabold font-sans text-white tracking-tightest">
                {Math.round(logged.calories)}
              </span>
              <span className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mt-0.5">
                / {targets.calories} kcal
              </span>
            </div>
          </div>

          <div className="w-full pt-4 mt-2 border-t border-white/[0.06] flex items-center justify-between text-xs">
            <span className="text-white/40 font-medium">Budget Remaining</span>
            <span className="text-white font-sans font-bold">
              {Math.max(0, Math.round(targets.calories - logged.calories))} kcal
            </span>
          </div>
        </section>

        {/* Apple Health Macro Breakdown */}
        <section className="rounded-3xl bg-[#121418] border border-white/[0.06] p-6 md:p-8 md:col-span-2 flex flex-col justify-between group hover:border-white/[0.12] transition-all">
          <div className="flex items-center justify-between mb-6">
            <span className="text-[11px] font-semibold text-white/40 uppercase tracking-widest">Macronutrient Targets</span>
            <span className="text-xs text-white/40 font-medium">Daily Breakdown</span>
          </div>

          <div className="space-y-6">
            {[
              { icon: Flame,   label: "Protein", current: logged.protein, target: targets.protein, color: "bg-orange-400",  textColor: "text-orange-400", unit: "g" },
              { icon: Wheat,   label: "Carbohydrates", current: logged.carbs,   target: targets.carbs,   color: "bg-emerald-400", textColor: "text-emerald-400", unit: "g" },
              { icon: Droplet, label: "Fats",    current: logged.fats,    target: targets.fats,    color: "bg-blue-400",    textColor: "text-blue-400", unit: "g" },
            ].map(m => {
              const pct = Math.min((m.current / m.target) * 100, 100);
              return (
                <div key={m.label} className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${m.textColor}`}>{m.label}</span>
                    </div>
                    <div className="text-xs">
                      <span className="text-white font-sans font-bold">{Math.round(m.current)}{m.unit}</span>
                      <span className="text-white/40 font-sans font-medium"> / {m.target}{m.unit}</span>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-white/[0.06] rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${m.color} rounded-full transition-all duration-700 ease-out`} 
                      style={{ width: `${pct}%` }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-6 mt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-white/40">
            <span>Calorie source distribution</span>
            <div className="flex items-center gap-3">
              <span className="text-orange-400 font-sans font-semibold">{Math.round(((logged.protein * 4) / (logged.calories || 1)) * 100)}% P</span>
              <span className="text-emerald-400 font-sans font-semibold">{Math.round(((logged.carbs * 4) / (logged.calories || 1)) * 100)}% C</span>
              <span className="text-blue-400 font-sans font-semibold">{Math.round(((logged.fats * 9) / (logged.calories || 1)) * 100)}% F</span>
            </div>
          </div>
        </section>
      </div>

      {/* Quick Log Bento Tiles */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold text-white/40 uppercase tracking-widest">Quick Log</span>
          <Link to="/app/log" className="text-xs font-medium text-white/50 hover:text-white transition-colors">
            View full log &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(["Breakfast", "Lunch", "Dinner", "Snacks"]).map((meal, i) => {
            const mealKeys: ("breakfast" | "lunch" | "dinner" | "snacks")[] = ["breakfast", "lunch", "dinner", "snacks"];
            const key = mealKeys[i];
            const isLogged = todayLog[key as keyof DayLog] && (todayLog[key as keyof DayLog] as any).length > 0;
            const icons = [Coffee, Sun, Moon, Plus];
            const Icon = icons[i];

            return (
              <Link 
                key={meal} 
                to={`/app/log#${key}`} 
                className={`rounded-3xl p-5 flex flex-col items-center justify-center text-center gap-3 transition-all duration-200 border group ${
                  isLogged 
                    ? "bg-[#141917] border-emerald-500/30" 
                    : "bg-[#121418] border-white/[0.06] hover:bg-[#161a20] hover:border-white/[0.15]"
                }`}
              >
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                  isLogged ? "bg-emerald-500/15 text-emerald-400" : "bg-white/[0.05] text-white/70"
                }`}>
                  {isLogged ? <Check className="w-5 h-5 stroke-[2.5]" /> : <Icon className="w-5 h-5 stroke-[2]" />}
                </div>

                <div>
                  <span className={`text-xs font-semibold block transition-colors ${
                    isLogged ? "text-emerald-400 font-bold" : "text-white/80 group-hover:text-white"
                  }`}>
                    {meal}
                  </span>
                  <span className="text-[10px] text-white/40 font-medium">
                    {isLogged ? "Logged today" : "Tap to record"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Dorm Living & AI Cooking Bento */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/app/pantry"
          className="rounded-3xl p-5 bg-[#121418] border border-white/[0.06] hover:bg-[#161a20] hover:border-white/[0.12] transition-all duration-200 group flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block group-hover:text-white transition-colors">
                Dorm Stash & Pantry
              </span>
              <span className="text-[11px] text-white/40 font-medium">
                Track room stock, protein & supplements
              </span>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-white group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          to="/app/cook"
          className="rounded-3xl p-5 bg-[#121418] border border-white/[0.06] hover:bg-[#161a20] hover:border-white/[0.12] transition-all duration-200 group flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block group-hover:text-white transition-colors">
                Cook with AI Stash
              </span>
              <span className="text-[11px] text-white/40 font-medium">
                Generate high-protein hostel room meals
              </span>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-white group-hover:translate-x-1 transition-all" />
        </Link>
      </section>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { Compass, Flame, Droplet, Wheat, Plus, ArrowRight, Coffee, Sun, Moon } from "lucide-react";

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
  const { userProfile } = useAuth();
  const { currentUser } = useAuth();
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
  const logged = allItems.reduce((a, i) => ({ calories: a.calories+i.calories, protein: a.protein+i.protein, carbs: a.carbs+i.carbs, fats: a.fats+i.fats }), { calories:0, protein:0, carbs:0, fats:0 });

  const caloriePercent = Math.min((logged.calories / targets.calories) * 100, 100);
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (caloriePercent / 100) * circumference;

  const currentMealItems = currentMeal && todayMenu ? todayMenu[currentMeal] || [] : [];
  const remaining = { protein: targets.protein - logged.protein, carbs: targets.carbs - logged.carbs };
  const compassSuggestion = currentMeal && currentMealItems.length > 0
    ? (remaining.protein > 20
        ? currentMealItems.slice(0, 2).join(" and ") + " — high protein choices for your goal"
        : remaining.carbs < 50
        ? "Go light today — " + currentMealItems[0] + " and skip the rice"
        : currentMealItems.slice(0, 3).join(", "))
    : null;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-28 md:pb-0">

      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">{greeting}, {firstName}.</h1>
          <p className="text-muted-foreground font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse" />
            {logged.calories > 0 ? Math.round(targets.calories - logged.calories) + " kcal remaining today" : "Start logging your meals"}
          </p>
        </div>
      </header>

      {/* Compass AI Widget */}
      {compassSuggestion && currentMeal ? (
        <section className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 rounded-3xl blur-lg transition-all duration-500 opacity-40" />
          <div className="glass-card rounded-3xl p-5 relative border-white/10 flex flex-row items-center gap-4 overflow-hidden">
            <div className="w-12 h-12 shrink-0 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <Compass className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <h2 className="text-[10px] font-bold tracking-widest text-white/50 uppercase mb-0.5 truncate">
                Compass &middot; {mealLabels[currentMeal]} open
              </h2>
              <p className="text-sm font-semibold text-white leading-tight line-clamp-2">{compassSuggestion}</p>
            </div>
            <Link to="/app/log" className="shrink-0 w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:bg-white/90 transition-all shadow-lg">
              <Plus className="w-5 h-5" />
            </Link>
          </div>
        </section>
      ) : (
        <section className="glass-card rounded-3xl p-5 flex items-center gap-4 border-white/5">
          <div className="w-12 h-12 shrink-0 rounded-2xl bg-white/5 flex items-center justify-center">
            <Compass className="w-6 h-6 text-white/40" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white/50">No meal service right now</p>
            <p className="text-xs text-white/30 mt-0.5">Mess opens 7-9:30am, 12-2:30pm, 7-9pm</p>
          </div>
          <Link to="/app/log" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors">
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {/* Calorie Ring */}
        <section className="glass-card rounded-3xl p-6 md:col-span-1 flex flex-row md:flex-col items-center justify-between md:justify-center relative border-white/5">
          <div className="flex flex-col md:absolute md:top-6 md:left-6 md:items-start">
            <h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase mb-1 md:mb-0">Calories</h3>
            <div className="flex flex-col md:hidden">
              <span className="text-4xl font-bold text-white tracking-tighter">{Math.round(logged.calories)}</span>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest mt-1">/ {targets.calories} kcal</span>
            </div>
          </div>
          <div className="relative flex items-center justify-center md:mt-8 md:mb-4">
            <svg viewBox="0 0 160 160" className="w-32 h-32 md:w-48 md:h-48 transform -rotate-90">
              <circle cx="80" cy="80" r={radius} className="stroke-white/5" strokeWidth="8" fill="none" />
              <circle cx="80" cy="80" r={radius}
                className="stroke-white transition-all duration-1000 ease-out drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                strokeWidth="8" strokeLinecap="round" fill="none"
                strokeDasharray={circumference} strokeDashoffset={loading ? circumference : strokeDashoffset} />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <Flame className="w-6 h-6 text-white/20 md:hidden" />
              <div className="hidden md:flex flex-col items-center">
                <span className="text-4xl font-bold text-white tracking-tighter">{Math.round(logged.calories)}</span>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest mt-1">/ {targets.calories} kcal</span>
              </div>
            </div>
          </div>
        </section>

        {/* Macro Bars */}
        <section className="glass-card rounded-3xl p-6 md:col-span-2 border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-bold tracking-wider text-muted-foreground uppercase">Macronutrients</h3>
          </div>
          <div className="space-y-6">
            {[
              { icon: Flame,   label: "Protein", current: logged.protein, target: targets.protein, color: "bg-orange-400",  unit: "g" },
              { icon: Wheat,   label: "Carbs",   current: logged.carbs,   target: targets.carbs,   color: "bg-emerald-400", unit: "g" },
              { icon: Droplet, label: "Fats",    current: logged.fats,    target: targets.fats,    color: "bg-blue-400",    unit: "g" },
            ].map(m => (
              <div key={m.label}>
                <div className="flex justify-between items-end mb-2">
                  <div className="flex items-center gap-2"><m.icon className="w-4 h-4" style={{}} /><span className="text-sm font-bold text-white">{m.label}</span></div>
                  <span className="text-sm font-medium text-white/70"><span className="text-white font-bold">{Math.round(m.current)}{m.unit}</span> / {m.target}{m.unit}</span>
                </div>
                <div className="h-2.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className={"h-full " + m.color + " rounded-full transition-all duration-700"} style={{ width: Math.min((m.current / m.target) * 100, 100) + "%" }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Quick Log */}
      <section>
        <h3 className="text-sm font-bold tracking-wider text-muted-foreground uppercase mb-4">Quick Log</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(["Mess Breakfast","Mess Lunch","Mess Dinner","Custom Snack"]).map((meal, i) => {
              const mealKeys: ("breakfast"|"lunch"|"dinner"|"snacks")[] = ["breakfast","lunch","dinner","snacks"];
              const key = mealKeys[i];
            const isLogged = todayLog[key as keyof DayLog] && (todayLog[key as keyof DayLog] as any).length > 0;
            const icons = [Coffee, Sun, Moon, Plus];
            const Icon = icons[i];
            return (
              <Link key={meal} to={"/app/log#" + key} className={`glass rounded-2xl p-4 flex flex-col items-center justify-center gap-3 transition-colors group ${isLogged ? 'bg-emerald-500/10 border-emerald-500/20' : 'hover:bg-white/10'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 ${isLogged ? 'bg-emerald-500/20' : 'bg-white/5'}`}>
                  <Icon className={`w-5 h-5 ${isLogged ? 'text-emerald-400' : 'text-white'}`} />
                </div>
                <span className={`text-sm font-semibold transition-colors ${isLogged ? 'text-emerald-400' : 'text-white/80 group-hover:text-white'}`}>
                  {isLogged ? `${meal.split(" ")[1] || meal} Logged` : meal}
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

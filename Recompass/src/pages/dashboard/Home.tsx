import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { Compass, Plus, ArrowRight, Coffee, Sun, Moon, Check, Sparkles, Package, ChefHat } from "lucide-react";
import { getCachedData, setCachedData } from "@/lib/dataCache";

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

// ─── Apple Activity Ring Component with Authentic Overfill & Seamless 12 o'clock ───────
function AppleRing({
  cx,
  cy,
  radius,
  strokeWidth,
  ratio,
  color,
  trackColor,
  shadowId,
  loading,
}: {
  cx: number;
  cy: number;
  radius: number;
  strokeWidth: number;
  ratio: number;
  color: string;
  trackColor: string;
  shadowId: string;
  loading: boolean;
}) {
  const circ = 2 * Math.PI * radius;
  const clampedRatio = Math.max(0, ratio);
  const clampedFirstLap = Math.min(clampedRatio, 1.0);

  const hasOverfill = clampedRatio > 1.0;
  const overfillRatio = hasOverfill ? Math.min(clampedRatio - 1.0, 0.999) : 0;
  const overfillAngle = overfillRatio * 2 * Math.PI;

  // Endpoint for overfill arc (starts at 12 o'clock, sweeps clockwise by overfillAngle)
  const endX = (cx + radius * Math.sin(overfillAngle)).toFixed(2);
  const endY = (cy - radius * Math.cos(overfillAngle)).toFixed(2);
  const largeArc = overfillAngle > Math.PI ? 1 : 0;

  return (
    <g>
      {/* 1. Background Groove Track */}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        stroke={trackColor}
        strokeWidth={strokeWidth}
        fill="none"
        opacity={0.3}
      />

      {/* 2. Base Lap (0 - 100%) */}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={circ}
        strokeDashoffset={loading ? circ : circ * (1 - clampedFirstLap)}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{
          transition: "stroke-dashoffset 1.8s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      />

      {/* 3. Overfill Arc (> 100%) - Sweeps clockwise from 12 o'clock (cx, cy-radius) to (endX, endY) */}
      {hasOverfill && !loading && (
        <path
          d={`M ${cx} ${cy - radius} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}`}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="butt"
          fill="none"
        />
      )}

      {/* 4. Leading Rounded Cap with Drop Shadow:
             - Exactly matching Apple Watch reference (Image 2) & 100% goal (Image 4)
             - Rounds off the overfill arc at (endX, endY) and casts authentic drop shadow onto underlying track.
             - When ratio === 1.0: Sits at 12 o'clock with soft shadow. */}
      {clampedRatio >= 1.0 && !loading && (
        <circle
          cx={parseFloat(endX)}
          cy={parseFloat(endY)}
          r={strokeWidth / 2}
          fill={color}
          filter={`url(#${shadowId})`}
        />
      )}
    </g>
  );
}

export default function Home() {
  const { userProfile, currentUser } = useAuth();
  const firstName = userProfile?.name?.split(" ")[0] || "User";
  const targets = calcTargets(userProfile);

  const today = new Date().toISOString().split("T")[0];
  const dayName = new Date().toLocaleDateString("en-US", { weekday: "long" });

  const cachedLog = getCachedData<DayLog>("daily_log_" + today);
  const cachedMenu = getCachedData<MealPlan>("weekly_menu_" + dayName);

  const [todayLog, setTodayLog] = useState<DayLog>(cachedLog || { breakfast: [], lunch: [], dinner: [], snacks: [] });
  const [todayMenu, setTodayMenu] = useState<MealPlan | null>(cachedMenu || null);
  const [loading, setLoading] = useState(!cachedLog);

  const currentMeal = getCurrentMeal();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  useEffect(() => {
    if (!currentUser) return;
    let isMounted = true;
    (async () => {
      try {
        const [logSnap, menuSnap] = await Promise.all([
          getDoc(doc(db, "users", currentUser.uid, "logs", today)),
          getDocs(query(collection(db, "users", currentUser.uid, "menus"), orderBy("uploadedAt", "desc"), limit(1))),
        ]);
        if (!isMounted) return;
        if (logSnap.exists()) {
          const lData = logSnap.data() as DayLog;
          setTodayLog(lData);
          setCachedData("daily_log_" + today, lData);
        }
        if (!menuSnap.empty) {
          const extracted: MealPlan[] = menuSnap.docs[0].data().extractedData || [];
          const selected = extracted.find(d => d.day === dayName) || extracted[0] || null;
          setTodayMenu(selected);
          if (selected) setCachedData("weekly_menu_" + dayName, selected);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, [currentUser, today, dayName]);

  const allItems = [...(todayLog.breakfast||[]), ...(todayLog.lunch||[]), ...(todayLog.dinner||[]), ...(todayLog.snacks||[])];
  const logged = allItems.reduce((a, i) => ({ 
    calories: a.calories + i.calories, 
    protein: a.protein + i.protein, 
    carbs: a.carbs + i.carbs, 
    fats: a.fats + i.fats 
  }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

  const caloriesRatio = logged.calories / (targets.calories || 1);
  const proteinRatio = logged.protein / (targets.protein || 1);
  const carbsRatio = logged.carbs / (targets.carbs || 1);
  const fatsRatio = logged.fats / (targets.fats || 1);
  const budgetDiff = Math.round(logged.calories - targets.calories);

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

  const macroItems = [
    { key: "calories", label: "Calories", color: "#FF5C38", current: Math.round(logged.calories), target: targets.calories, unit: " kcal" },
    { key: "protein",  label: "Protein",  color: "#00E599", current: Math.round(logged.protein),  target: targets.protein,  unit: "g" },
    { key: "carbs",    label: "Carbs",    color: "#38BDF8", current: Math.round(logged.carbs),    target: targets.carbs,    unit: "g" },
    { key: "fats",     label: "Fats",     color: "#FBBF24", current: Math.round(logged.fats),     target: targets.fats,     unit: "g" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-4 md:space-y-6 animate-in fade-in duration-500 pb-20 md:pb-8 w-full min-w-0">

      {/* Editorial Header (Balanced layout that never clips on small screens) */}
      <header className="space-y-1.5 w-full">
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#121418] border border-white/[0.08] text-[9px] md:text-[10px] font-bold tracking-widest uppercase text-white/60">
            <Sparkles className="w-2.5 h-2.5 text-white/50" />
            <span>Today's Overview</span>
          </div>
          <div className="px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] text-[11px] font-medium text-white/60 shrink-0">
            {remaining.calories > 0 ? (
              <>Remaining: <span className="text-white font-bold">{Math.round(remaining.calories)}</span> kcal</>
            ) : (
              <span className="text-emerald-400 font-semibold">Calorie goal met</span>
            )}
          </div>
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight font-sans truncate">
          {greeting}, {firstName}.
        </h1>
        <p className="text-xs sm:text-sm font-normal text-white/45">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </header>

      {/* Compass AI Guidance Widget (Desktop only: on mobile, integrated mess in meal cards replaces this) */}
      <div className="hidden md:block">
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
      </div>

      {/* 1. Mobile Unified Nutrition Card (Fits seamlessly without cutoff on any device) */}
      <section className="block md:hidden rounded-2xl sm:rounded-3xl bg-[#121418] border border-white/[0.08] p-3 sm:p-4 shadow-lg overflow-hidden w-full">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">Nutrition Rings</span>
          {budgetDiff > 0 ? (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-rose-500/15 text-rose-300 border border-rose-500/25">
              +{budgetDiff} kcal over
            </span>
          ) : (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
              {Math.abs(budgetDiff)} kcal left
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2.5 sm:gap-3.5">
          {/* Concentric Rings Viewport */}
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0 flex items-center justify-center">
            <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
              <defs>
                <filter id="apple-ring-shadow-mobile" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="1.5" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.85" />
                </filter>
              </defs>
              <AppleRing cx={100} cy={100} radius={82} strokeWidth={14} ratio={caloriesRatio} color="#FF5C38" trackColor="#3a140d" shadowId="apple-ring-shadow-mobile" loading={loading} />
              <AppleRing cx={100} cy={100} radius={65} strokeWidth={14} ratio={proteinRatio} color="#00E599" trackColor="#023422" shadowId="apple-ring-shadow-mobile" loading={loading} />
              <AppleRing cx={100} cy={100} radius={48} strokeWidth={14} ratio={carbsRatio} color="#38BDF8" trackColor="#083244" shadowId="apple-ring-shadow-mobile" loading={loading} />
              <AppleRing cx={100} cy={100} radius={31} strokeWidth={14} ratio={fatsRatio} color="#FBBF24" trackColor="#382805" shadowId="apple-ring-shadow-mobile" loading={loading} />
            </svg>

            {/* Clean Dark Center Void */}
            <div className="absolute w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#0d0f12] border border-white/[0.06] flex items-center justify-center pointer-events-none shadow-inner" />
          </div>

          {/* Daily Intake: Same clean design as desktop, scaled for mobile */}
          <div className="flex-1 space-y-1.5 min-w-0">
            {macroItems.map(item => {
              const pct = Math.round((item.current / item.target) * 100);
              const isOver = item.current >= item.target;
              return (
                <div key={item.key} className="flex items-center justify-between p-1.5 sm:p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-white/80 font-medium text-[11px] truncate">{item.label}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px]">
                    <div>
                      <span className="font-bold text-white">{item.current}</span>
                      <span className="text-white/40 text-[9px]">/{item.target}{item.unit}</span>
                    </div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                      isOver ? "bg-emerald-500/15 text-emerald-400" : "bg-white/[0.04] text-white/50"
                    }`}>
                      {pct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 2. Desktop Nutrition Dashboard (hidden on mobile, visible on md+) */}
      <section className="hidden md:grid md:grid-cols-12 gap-6 rounded-3xl bg-[#121418] border border-white/[0.06] p-6 lg:p-8">
        {/* Rings showcase on the left (5 cols) with clean void center - ZERO text inside! */}
        <div className="md:col-span-5 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-white/[0.06] pb-6 md:pb-0 md:pr-6">
          <div className="w-full flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-white/40 uppercase tracking-widest">Nutrition Rings</span>
            <span className="text-xs font-sans font-bold text-emerald-400">Activity Engine</span>
          </div>

          <div className="relative w-48 h-48 my-3 flex items-center justify-center">
            <svg viewBox="0 0 200 200" className="w-48 h-48 overflow-visible">
              <defs>
                <filter id="apple-ring-shadow-desktop" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="1.5" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.85" />
                </filter>
              </defs>
              <AppleRing cx={100} cy={100} radius={82} strokeWidth={14} ratio={caloriesRatio} color="#FF5C38" trackColor="#3a140d" shadowId="apple-ring-shadow-desktop" loading={loading} />
              <AppleRing cx={100} cy={100} radius={65} strokeWidth={14} ratio={proteinRatio} color="#00E599" trackColor="#023422" shadowId="apple-ring-shadow-desktop" loading={loading} />
              <AppleRing cx={100} cy={100} radius={48} strokeWidth={14} ratio={carbsRatio} color="#38BDF8" trackColor="#083244" shadowId="apple-ring-shadow-desktop" loading={loading} />
              <AppleRing cx={100} cy={100} radius={31} strokeWidth={14} ratio={fatsRatio} color="#FBBF24" trackColor="#382805" shadowId="apple-ring-shadow-desktop" loading={loading} />
            </svg>

            {/* Pure Clean Black Void Center (Like Apple Watch Reference) */}
            <div className="absolute w-10 h-10 rounded-full bg-[#0d0f12] border border-white/[0.06] flex items-center justify-center pointer-events-none shadow-inner" />
          </div>

          <div className="w-full pt-3 mt-1 border-t border-white/[0.06] flex items-center justify-between text-xs">
            <span className="text-white/40 font-medium">Budget Remaining</span>
            <span className="text-white font-sans font-bold">
              {Math.max(0, Math.round(targets.calories - logged.calories))} kcal
            </span>
          </div>
        </div>

        {/* Macro Metrics on the right (7 cols) - Clean, Un-Noisy Daily Intake */}
        <div className="md:col-span-7 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-white/40 uppercase tracking-widest">Daily Intake</span>
            {budgetDiff > 0 ? (
              <span className="text-xs font-mono font-bold text-rose-400">+{budgetDiff} kcal over budget</span>
            ) : (
              <span className="text-xs font-mono font-bold text-emerald-400">{Math.abs(budgetDiff)} kcal remaining</span>
            )}
          </div>

          {/* 4 Sleek Metric Rows (Zero Noise) */}
          <div className="space-y-2">
            {macroItems.map(item => {
              const pct = Math.round((item.current / item.target) * 100);
              const isOver = item.current >= item.target;
              return (
                <div key={item.key} className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-sm font-semibold text-white/80">{item.label}</span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 font-mono">
                    <div>
                      <span className="text-sm font-bold text-white">{item.current}</span>
                      <span className="text-xs text-white/40"> / {item.target}{item.unit}</span>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-lg min-w-[48px] text-center ${
                      isOver ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" : "bg-white/[0.04] text-white/60 border border-white/[0.06]"
                    }`}>
                      {pct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Distribution */}
          <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-white/40">
            <span>Calorie source distribution</span>
            <div className="flex items-center gap-3 font-medium">
              <span className="text-[#00E599] font-sans font-semibold">{Math.round(((logged.protein * 4) / (logged.calories || 1)) * 100)}% P</span>
              <span className="text-white/20">&middot;</span>
              <span className="text-[#38BDF8] font-sans font-semibold">{Math.round(((logged.carbs * 4) / (logged.calories || 1)) * 100)}% C</span>
              <span className="text-white/20">&middot;</span>
              <span className="text-[#FBBF24] font-sans font-semibold">{Math.round(((logged.fats * 9) / (logged.calories || 1)) * 100)}% F</span>
            </div>
          </div>
        </div>
      </section>

      {/* Mess Menu Quick View (Clean & Minimal — View Only, No Button) */}
      {todayMenu && (
        <section className="rounded-2xl bg-[#121418] border border-white/[0.06] p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white/60 shrink-0">
            <ChefHat className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold text-white block">Mess Menu Quick View</span>
            <p className="text-[11px] text-white/50 mt-0.5 truncate">
              <span className="font-semibold text-white/70 capitalize">{currentMeal ? mealLabels[currentMeal] : "Lunch"}: </span>
              {((currentMeal && todayMenu[currentMeal]?.length ? todayMenu[currentMeal] : todayMenu.lunch) || []).join(", ")}
            </p>
          </div>
        </section>
      )}

      {/* Quick Log Section (Clean 4-card tiles on both Mobile & Desktop) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-white/40 uppercase tracking-widest">Quick Log</span>
          <Link to="/app/log" className="text-xs font-medium text-white/50 hover:text-white transition-colors">
            View full log &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-4">
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
                className={`rounded-2xl md:rounded-3xl p-3.5 md:p-5 flex flex-col items-center justify-center text-center gap-2 md:gap-3 transition-all duration-200 border group ${
                  isLogged 
                    ? "bg-[#141917] border-emerald-500/30" 
                    : "bg-[#121418] border-white/[0.06] hover:bg-[#161a20] hover:border-white/[0.15]"
                }`}
              >
                <div className={`w-9 h-9 md:w-11 md:h-11 rounded-xl md:rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                  isLogged ? "bg-emerald-500/15 text-emerald-400" : "bg-white/[0.05] text-white/70"
                }`}>
                  {isLogged ? <Check className="w-4 h-4 md:w-5 md:h-5 stroke-[2.5]" /> : <Icon className="w-4 h-4 md:w-5 md:h-5 stroke-[2]" />}
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

      {/* Pantry & AI Cooking Bento */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 md:gap-4">
        <Link
          to="/app/pantry"
          className="rounded-2xl md:rounded-3xl p-4 md:p-5 bg-[#121418] border border-white/[0.06] hover:bg-[#161a20] hover:border-white/[0.12] transition-all duration-200 group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl md:rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-white block group-hover:text-white transition-colors">
                Pantry & Inventory
              </span>
              <span className="text-[11px] text-white/40 font-medium truncate block">
                Track pantry stock, protein & supplements
              </span>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-white group-hover:translate-x-1 transition-all shrink-0 ml-2" />
        </Link>

        <Link
          to="/app/cook"
          className="rounded-2xl md:rounded-3xl p-4 md:p-5 bg-[#121418] border border-white/[0.06] hover:bg-[#161a20] hover:border-white/[0.12] transition-all duration-200 group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl md:rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <ChefHat className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-white block group-hover:text-white transition-colors">
                Cook with AI
              </span>
              <span className="text-[11px] text-white/40 font-medium truncate block">
                Generate high-protein hostel meals
              </span>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-white group-hover:translate-x-1 transition-all shrink-0 ml-2" />
        </Link>
      </section>
    </div>
  );
}

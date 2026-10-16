import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, collection, query, orderBy, limit, getDocs, setDoc } from "firebase/firestore";
import { Compass, ArrowRight, Sparkles, ChefHat, Check, Zap } from "lucide-react";
import { getCachedData, setCachedData } from "@/lib/dataCache";
import {
  AppleActivityRing,
  APPLE_FITNESS_MACRO_PALETTES,
  type RingData
} from "@/components/ui/AppleActivityRing";

type MacroEntry = { id?: string; name: string; quantity: string; calories: number; protein: number; carbs: number; fats: number; loggedAt?: string };
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

function getCurrentMeal(): "breakfast" | "lunch" | "dinner" {
  const now = new Date();
  const time = now.getHours() + now.getMinutes() / 60;
  if (time >= 5 && time < 11) return "breakfast";
  if (time >= 11 && time < 17) return "lunch";
  return "dinner";
}

const mealLabels: Record<string, string> = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner" };

export default function Home() {
  const { userProfile, currentUser } = useAuth();
  const navigate = useNavigate();
  const firstName = userProfile?.name?.split(" ")[0] || "User";
  const targets = calcTargets(userProfile);

  const today = new Date().toISOString().split("T")[0];
  const dayName = new Date().toLocaleDateString("en-US", { weekday: "long" });

  const cachedLog = getCachedData<DayLog>("daily_log_" + today);
  const cachedMenu = getCachedData<MealPlan>("weekly_menu_" + dayName);

  const [todayLog, setTodayLog] = useState<DayLog>(cachedLog || { breakfast: [], lunch: [], dinner: [], snacks: [] });
  const [todayMenu, setTodayMenu] = useState<MealPlan | null>(cachedMenu || null);
  const [loading, setLoading] = useState(!cachedLog);

  // Compass AI Guidance State
  const [guidance, setGuidance] = useState<{ headline: string; advice: string; suggestedCombo?: any[] } | null>(null);
  const [loadingGuidance, setLoadingGuidance] = useState(false);
  const [loggingCombo, setLoggingCombo] = useState(false);
  const [comboLogged, setComboLogged] = useState(false);

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
    calories: a.calories + (Number(i.calories) || 0), 
    protein: a.protein + (Number(i.protein) || 0), 
    carbs: a.carbs + (Number(i.carbs) || 0), 
    fats: a.fats + (Number(i.fats) || 0) 
  }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

  const remaining = { 
    calories: Math.max(0, targets.calories - logged.calories),
    protein: Math.max(0, targets.protein - logged.protein), 
    carbs: Math.max(0, targets.carbs - logged.carbs),
    fats: Math.max(0, targets.fats - logged.fats)
  };

  const budgetDiff = Math.round(logged.calories - targets.calories);
  const currentMealItems = todayMenu ? todayMenu[currentMeal] || [] : [];

  // Authentic Apple Fitness Activity Rings Data
  const activityRings: RingData[] = useMemo(() => [
    {
      id: "calories",
      label: "Calories",
      current: Math.round(logged.calories),
      target: targets.calories,
      unit: "kcal",
      ...APPLE_FITNESS_MACRO_PALETTES.calories,
    },
    {
      id: "protein",
      label: "Protein",
      current: Math.round(logged.protein),
      target: targets.protein,
      unit: "g",
      ...APPLE_FITNESS_MACRO_PALETTES.protein,
    },
    {
      id: "carbs",
      label: "Carbs",
      current: Math.round(logged.carbs),
      target: targets.carbs,
      unit: "g",
      ...APPLE_FITNESS_MACRO_PALETTES.carbs,
    },
    {
      id: "fats",
      label: "Fats",
      current: Math.round(logged.fats),
      target: targets.fats,
      unit: "g",
      ...APPLE_FITNESS_MACRO_PALETTES.fats,
    },
  ], [logged, targets]);

  const macroItems = [
    { key: "calories", label: "Calories", color: "#FA114F", current: Math.round(logged.calories), target: targets.calories, unit: " kcal", unitShort: "" },
    { key: "protein",  label: "Protein",  color: "#A1FF00", current: Math.round(logged.protein),  target: targets.protein,  unit: "g", unitShort: "g" },
    { key: "carbs",    label: "Carbs",    color: "#00F0FF", current: Math.round(logged.carbs),    target: targets.carbs,    unit: "g", unitShort: "g" },
    { key: "fats",     label: "Fats",     color: "#FFD600", current: Math.round(logged.fats),     target: targets.fats,     unit: "g", unitShort: "g" },
  ];

  // Dynamic Compass AI Guidance Ingestion
  useEffect(() => {
    if (!currentUser || loading) return;
    const cacheKey = `compass_guidance_${today}_${currentMeal}_${logged.calories}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        setGuidance(JSON.parse(cached));
        return;
      } catch {}
    }

    if (currentMealItems.length === 0) {
      setGuidance({
        headline: "No Mess Menu Today",
        advice: remaining.calories > 0
          ? `You have ${Math.round(remaining.calories)} kcal and ${Math.round(remaining.protein)}g protein remaining. Log your meal or check your pantry staples.`
          : "Calorie target reached for today. Stay hydrated and prioritize recovery!"
      });
      return;
    }

    let isMounted = true;
    setLoadingGuidance(true);

    fetch("/api/compass", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "get_daily_guidance",
        payload: {
          currentMeal,
          menuItems: currentMealItems,
          remaining,
          goal: userProfile?.goal || "maintain"
        }
      })
    })
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return;
        if (data && data.advice) {
          setGuidance(data);
          sessionStorage.setItem(cacheKey, JSON.stringify(data));
        } else {
          // Instant Fallback
          setGuidance({
            headline: `${mealLabels[currentMeal]} Strategy`,
            advice: remaining.protein > 20
              ? `Mess serves ${currentMealItems.slice(0, 2).join(" & ")}. Prioritize higher protein portions to close your ${Math.round(remaining.protein)}g gap.`
              : `Today's menu: ${currentMealItems.slice(0, 3).join(", ")}. Stay mindful of portion sizes to preserve your ${Math.round(remaining.calories)} kcal budget.`
          });
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setGuidance({
          headline: `${mealLabels[currentMeal]} Strategy`,
          advice: `Mess serves ${currentMealItems.slice(0, 3).join(", ")}. Balance your carbs and protein against your remaining budget.`
        });
      })
      .finally(() => {
        if (isMounted) setLoadingGuidance(false);
      });

    return () => { isMounted = false; };
  }, [currentUser, today, currentMeal, currentMealItems.length, logged.calories, loading, userProfile?.goal]);

  // Quick 1-tap combo log
  const handleLogSuggestedCombo = async () => {
    if (!currentUser || !guidance?.suggestedCombo || guidance.suggestedCombo.length === 0) return;
    setLoggingCombo(true);
    try {
      const newEntries: MacroEntry[] = guidance.suggestedCombo.map(item => ({
        id: Date.now().toString() + Math.random(),
        name: item.name.toUpperCase(),
        quantity: item.quantity || "1 serving",
        calories: Number(item.calories) || 0,
        protein: Number(item.protein) || 0,
        carbs: Number(item.carbs) || 0,
        fats: Number(item.fats) || 0,
        loggedAt: new Date().toISOString()
      }));

      const updatedMeal = [...(todayLog[currentMeal] || []), ...newEntries];
      const updatedLog = { ...todayLog, [currentMeal]: updatedMeal };
      
      const all = [...(updatedLog.breakfast||[]), ...(updatedLog.lunch||[]), ...(updatedLog.dinner||[]), ...(updatedLog.snacks||[])];
      updatedLog.totals = all.reduce((a, i) => ({
        calories: a.calories + i.calories,
        protein: a.protein + i.protein,
        carbs: a.carbs + i.carbs,
        fats: a.fats + i.fats
      }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

      setTodayLog(updatedLog);
      setCachedData("daily_log_" + today, updatedLog);
      await setDoc(doc(db, "users", currentUser.uid, "logs", today), updatedLog, { merge: true });
      setComboLogged(true);
      setTimeout(() => setComboLogged(false), 3000);
    } catch (err) {
      console.error("Failed to log combo:", err);
    } finally {
      setLoggingCombo(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 md:space-y-6 animate-in fade-in duration-500 pb-20 md:pb-8 w-full min-w-0">

      {/* Editorial Header */}
      <header className="space-y-1 w-full min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#121418] border border-white/[0.08] text-[9px] md:text-[10px] font-bold tracking-widest uppercase text-white/60">
            <Sparkles className="w-2.5 h-2.5 text-white/50" />
            <span>Today's Overview</span>
          </div>
          <div className="px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] text-[10px] sm:text-[11px] font-medium text-white/60 tabular-nums">
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

      {/* Flagship Compass AI Guidance Card (Visible on BOTH Mobile & Desktop) */}
      <section className="rounded-3xl bg-gradient-to-br from-[#121418] via-[#101217] to-[#0c0e12] border border-white/[0.08] p-4 sm:p-5 md:p-6 shadow-xl relative overflow-hidden group hover:border-white/20 transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-white shadow-sm mt-0.5 sm:mt-0">
              <Compass className="w-5 h-5 stroke-[2] animate-pulse" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase">
                  Compass AI &middot; {mealLabels[currentMeal]}
                </span>
                {guidance?.headline && (
                  <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider hidden sm:inline">
                    &middot; {guidance.headline}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm font-medium text-white/90 leading-relaxed">
                {loadingGuidance ? (
                  <span className="text-white/40 animate-pulse">Compass is analyzing today's mess menu & metabolic budget...</span>
                ) : (
                  guidance?.advice || "Checking today's meal schedule..."
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {guidance?.suggestedCombo && guidance.suggestedCombo.length > 0 && (
              <button
                onClick={handleLogSuggestedCombo}
                disabled={loggingCombo || comboLogged}
                className="px-3.5 py-2 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-xs hover:bg-emerald-500/25 active:scale-95 transition-all flex items-center gap-1.5 shadow-sm"
              >
                {comboLogged ? (
                  <><Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" /> Logged!</>
                ) : (
                  <><Zap className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" /> 1-Tap Log</>
                )}
              </button>
            )}
            <button
              onClick={() => navigate("/app/compass")}
              className="px-4 py-2 rounded-full bg-white text-black font-bold text-xs hover:bg-white/90 active:scale-95 transition-all flex items-center gap-1.5 shadow-sm"
            >
              <span>Ask Compass</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* 1. Mobile Unified Nutrition Card (Zero Cutoff Across Any Phone Display) */}
      <section className="block md:hidden rounded-2xl bg-[#121418] border border-white/[0.08] p-3.5 shadow-lg w-full min-w-0">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">Nutrition Rings</span>
          {budgetDiff > 0 ? (
            <span className="text-[10px] font-mono tabular-nums px-2 py-0.5 rounded-full font-bold bg-rose-500/15 text-rose-300 border border-rose-500/25">
              +{budgetDiff} kcal over
            </span>
          ) : (
            <span className="text-[10px] font-mono tabular-nums px-2 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
              {Math.abs(budgetDiff)} kcal left
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Authentic Apple Activity Concentric Rings (Mobile Viewport 104px) */}
          <div className="shrink-0 flex items-center justify-center">
            <AppleActivityRing
              rings={activityRings}
              size={104}
              strokeWidth={9}
              ringGap={2.5}
              loading={loading}
            />
          </div>

          {/* Daily Intake: Sleek Rows with Tabular Typography */}
          <div className="flex-1 space-y-1 min-w-0">
            {macroItems.map(item => {
              const pct = Math.round((item.current / (item.target || 1)) * 100);
              const isOver = item.current >= item.target;
              return (
                <div key={item.key} className="flex items-center justify-between py-1 px-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-white/80 font-medium text-[11px] truncate">{item.label}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 font-mono text-[10px] sm:text-[11px] tabular-nums">
                    <div>
                      <span className="font-bold text-white">{item.current}</span>
                      <span className="text-white/40 text-[9px]">/{item.target}{item.unitShort}</span>
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
        {/* Rings showcase on the left (5 cols) with authentic Apple neon gradients */}
        <div className="md:col-span-5 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-white/[0.06] pb-6 md:pb-0 md:pr-6">
          <div className="w-full flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-white/40 uppercase tracking-widest">Nutrition Rings</span>
            <span className="text-xs font-sans font-bold text-emerald-400">Activity Engine</span>
          </div>

          <div className="my-3 flex items-center justify-center">
            <AppleActivityRing
              rings={activityRings}
              size={190}
              strokeWidth={14}
              ringGap={3.5}
              loading={loading}
            />
          </div>

          <div className="w-full pt-3 mt-1 border-t border-white/[0.06] flex items-center justify-between text-xs">
            <span className="text-white/40 font-medium">Budget Remaining</span>
            <span className="text-white font-sans font-bold tabular-nums">
              {Math.max(0, Math.round(targets.calories - logged.calories))} kcal
            </span>
          </div>
        </div>

        {/* Macro Metrics on the right (7 cols) */}
        <div className="md:col-span-7 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-white/40 uppercase tracking-widest">Daily Intake</span>
            {budgetDiff > 0 ? (
              <span className="text-xs font-mono font-bold text-rose-400 tabular-nums">+{budgetDiff} kcal over budget</span>
            ) : (
              <span className="text-xs font-mono font-bold text-emerald-400 tabular-nums">{Math.abs(budgetDiff)} kcal remaining</span>
            )}
          </div>

          {/* 4 Sleek Metric Rows */}
          <div className="space-y-2">
            {macroItems.map(item => {
              const pct = Math.round((item.current / (item.target || 1)) * 100);
              const isOver = item.current >= item.target;
              return (
                <div key={item.key} className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-sm font-semibold text-white/80">{item.label}</span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 font-mono tabular-nums">
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
            <div className="flex items-center gap-3 font-medium tabular-nums">
              <span className="text-[#A1FF00] font-sans font-semibold">{Math.round(((logged.protein * 4) / (logged.calories || 1)) * 100)}% P</span>
              <span className="text-white/20">&middot;</span>
              <span className="text-[#00F0FF] font-sans font-semibold">{Math.round(((logged.carbs * 4) / (logged.calories || 1)) * 100)}% C</span>
              <span className="text-white/20">&middot;</span>
              <span className="text-[#FFD600] font-sans font-semibold">{Math.round(((logged.fats * 9) / (logged.calories || 1)) * 100)}% F</span>
            </div>
          </div>
        </div>
      </section>

      {/* Mess Menu Quick View */}
      {todayMenu && (
        <section className="rounded-2xl bg-[#121418] border border-white/[0.06] p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white/60 shrink-0">
              <ChefHat className="w-4 h-4 text-white/70" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">{dayName} Mess Schedule</p>
              <p className="text-xs font-medium text-white/80 truncate">
                {currentMealItems.length > 0 ? currentMealItems.join(" · ") : "Menu available in timetable"}
              </p>
            </div>
          </div>
          <Link
            to="/app/week"
            className="shrink-0 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-white/70 hover:text-white text-xs font-semibold transition-colors flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </section>
      )}

    </div>
  );
}

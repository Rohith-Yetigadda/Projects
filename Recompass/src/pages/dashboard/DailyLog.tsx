import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, setDoc, collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { Coffee, Sun, Moon, Plus, Trash2, Loader2, Sparkles } from "lucide-react";

type MacroEntry = { id: string; name: string; calories: number; protein: number; carbs: number; fats: number; loggedAt: string; };
type MealType = "breakfast" | "lunch" | "dinner" | "snacks";
type DayLog = { breakfast: MacroEntry[]; lunch: MacroEntry[]; dinner: MacroEntry[]; snacks: MacroEntry[]; };
type MealPlan = { day: string; breakfast: string[]; lunch: string[]; dinner: string[]; };

const todayStr = () => new Date().toISOString().split("T")[0];

const mealConfig: { key: MealType; label: string; icon: any; color: string; bg: string; border: string; }[] = [
  { key: "breakfast", label: "Breakfast", icon: Coffee, color: "text-amber-400",   bg: "bg-amber-400/10",   border: "border-amber-400/20"   },
  { key: "lunch",     label: "Lunch",     icon: Sun,    color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
  { key: "dinner",    label: "Dinner",    icon: Moon,   color: "text-blue-400",    bg: "bg-blue-400/10",    border: "border-blue-400/20"    },
  { key: "snacks",    label: "Snacks",    icon: Sparkles, color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/20"  },
];

async function estimateMacros(foodName: string): Promise<{ calories: number; protein: number; carbs: number; fats: number }> {
  const res = await fetch("/api/compass", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "estimate_macros", payload: { foodName } }),
  });
  const data = await res.json();
  return {
    calories: Number(data.calories) || 150,
    protein:  Number(data.protein)  || 5,
    carbs:    Number(data.carbs)    || 20,
    fats:     Number(data.fats)     || 5,
  };
}

export default function DailyLog() {
  const { currentUser } = useAuth();
  const [log, setLog]       = useState<DayLog>({ breakfast: [], lunch: [], dinner: [], snacks: [] });
  const [menu, setMenu]     = useState<MealPlan | null>(null);
  const [estimating, setEstimating] = useState<string | null>(null);
  const [customInput, setCustomInput] = useState<{ [k in MealType]?: string }>({});
  const [loading, setLoading] = useState(true);

  const today = todayStr();
  const dayName = new Date().toLocaleDateString("en-US", { weekday: "long" });

  const loadLog = useCallback(async () => {
    if (!currentUser) return;
    try {
      const snap = await getDoc(doc(db, "users", currentUser.uid, "logs", today));
      if (snap.exists()) {
        const d = snap.data();
        setLog({ breakfast: d.breakfast || [], lunch: d.lunch || [], dinner: d.dinner || [], snacks: d.snacks || [] });
      }
    } catch (e) { console.error(e); }
  }, [currentUser, today]);

  const loadMenu = useCallback(async () => {
    if (!currentUser) return;
    try {
      const snap = await getDocs(query(collection(db, "users", currentUser.uid, "menus"), orderBy("uploadedAt", "desc"), limit(1)));
      if (!snap.empty) {
        const menuData = snap.docs[0].data();
        const extracted: MealPlan[] = menuData.extractedData || [];
        const todayPlan = extracted.find(d => d.day === dayName) || extracted[0] || null;
        setMenu(todayPlan);
      }
    } catch (e) { console.error(e); }
  }, [currentUser, dayName]);

  useEffect(() => {
    Promise.all([loadLog(), loadMenu()]).finally(() => setLoading(false));
  }, [loadLog, loadMenu]);

  const saveLog = async (newLog: DayLog) => {
    if (!currentUser) return;
    const allItems = [...newLog.breakfast, ...newLog.lunch, ...newLog.dinner, ...newLog.snacks];
    const totals = allItems.reduce((acc, item) => ({
      calories: acc.calories + item.calories,
      protein:  acc.protein  + item.protein,
      carbs:    acc.carbs    + item.carbs,
      fats:     acc.fats     + item.fats,
    }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

    await setDoc(doc(db, "users", currentUser.uid, "logs", today), { ...newLog, totals, date: today });
  };

  const logItem = async (mealType: MealType, foodName: string) => {
    const key = mealType + ":" + foodName;
    setEstimating(key);
    try {
      const macros = await estimateMacros(foodName);
      const entry: MacroEntry = { id: Date.now().toString(), name: foodName, loggedAt: new Date().toISOString(), ...macros };
      const newLog = { ...log, [mealType]: [...(log[mealType] || []), entry] };
      setLog(newLog);
      await saveLog(newLog);
    } catch (e) { console.error(e); }
    finally { setEstimating(null); }
  };

  const removeItem = async (mealType: MealType, id: string) => {
    const newLog = { ...log, [mealType]: log[mealType].filter(i => i.id !== id) };
    setLog(newLog);
    await saveLog(newLog);
  };

  const totals = [...log.breakfast, ...log.lunch, ...log.dinner, ...log.snacks].reduce(
    (acc, i) => ({ calories: acc.calories + i.calories, protein: acc.protein + i.protein, carbs: acc.carbs + i.carbs, fats: acc.fats + i.fats }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Daily Log</h1>
          <p className="text-white/40 text-sm font-medium mt-1">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <div className="glass-card rounded-2xl px-4 py-2 text-right">
          <p className="text-2xl font-bold text-white">{Math.round(totals.calories)}</p>
          <p className="text-xs text-white/40 font-medium">kcal logged</p>
        </div>
      </div>

      {/* Macro Summary Strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Protein", value: totals.protein, unit: "g", color: "text-orange-400" },
          { label: "Carbs",   value: totals.carbs,   unit: "g", color: "text-emerald-400" },
          { label: "Fats",    value: totals.fats,    unit: "g", color: "text-blue-400" },
        ].map(m => (
          <div key={m.label} className="glass-card rounded-2xl p-4 text-center">
            <p className={"text-xl font-bold " + m.color}>{Math.round(m.value)}<span className="text-sm font-medium text-white/40">{m.unit}</span></p>
            <p className="text-xs text-white/40 font-medium mt-1">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Meal Sections */}
      {mealConfig.map(({ key, label, icon: Icon, color, bg, border }) => {
        const loggedItems = log[key] || [];
        const menuItems: string[] = key !== "snacks" && menu ? (menu[key as "breakfast"|"lunch"|"dinner"] || []) : [];
        const alreadyLogged = new Set(loggedItems.map(i => i.name));
        const quickChips = menuItems.filter(item => !alreadyLogged.has(item));

        return (
          <div key={key} className="glass-card rounded-2xl p-5 space-y-4">
            {/* Header */}
            <div className={"flex items-center gap-3"}>
              <div className={"w-9 h-9 rounded-xl flex items-center justify-center border " + bg + " " + border}>
                <Icon className={"w-4 h-4 " + color} />
              </div>
              <p className="text-sm font-bold text-white">{label}</p>
              {loggedItems.length > 0 && (
                <span className="ml-auto text-xs font-bold text-white/30">
                  {Math.round(loggedItems.reduce((s, i) => s + i.calories, 0))} kcal
                </span>
              )}
            </div>

            {/* Logged items */}
            {loggedItems.length > 0 && (
              <div className="space-y-2">
                {loggedItems.map(item => (
                  <div key={item.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">{item.name}</p>
                      <p className="text-xs text-white/40 mt-0.5">
                        {item.calories} kcal &middot; P {item.protein}g &middot; C {item.carbs}g &middot; F {item.fats}g
                      </p>
                    </div>
                    <button onClick={() => removeItem(key, item.id)} className="text-white/20 hover:text-red-400 transition-colors p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Quick-log chips from menu */}
            {quickChips.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {quickChips.map(item => {
                  const chipKey = key + ":" + item;
                  const isLoading = estimating === chipKey;
                  return (
                    <button key={item} onClick={() => logItem(key, item)} disabled={!!estimating}
                      className={"flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-medium transition-all " +
                        (isLoading ? "border-white/20 text-white/40" : "border-white/10 text-white/70 hover:bg-white/10 hover:text-white hover:" + border)}>
                      {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                      {item}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Custom add */}
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                placeholder={"Add custom item..."}
                value={customInput[key] || ""}
                onChange={e => setCustomInput(prev => ({ ...prev, [key]: e.target.value }))}
                onKeyDown={e => {
                  if (e.key === "Enter" && customInput[key]?.trim()) {
                    logItem(key, customInput[key]!.trim());
                    setCustomInput(prev => ({ ...prev, [key]: "" }));
                  }
                }}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30"
              />
              <button
                onClick={() => {
                  if (customInput[key]?.trim()) {
                    logItem(key, customInput[key]!.trim());
                    setCustomInput(prev => ({ ...prev, [key]: "" }));
                  }
                }}
                className="px-4 py-2 bg-white/10 border border-white/10 rounded-xl text-sm font-bold text-white hover:bg-white/20 transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

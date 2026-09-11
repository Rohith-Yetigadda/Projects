import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { ArrowRight, Coffee, Sun, Moon, Plus, Upload } from "lucide-react";

type MealPlan = {
  day: string;
  breakfast: string[];
  lunch: string[];
  dinner: string[];
};

type SavedMenu = {
  uploadedAt: string;
  extractedData: MealPlan[];
};

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const DAY_SHORT = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

const meals = [
  { key: "breakfast" as const, label: "Breakfast", icon: Coffee,  color: "text-amber-400",   bg: "bg-amber-400/10",   border: "border-amber-400/20",   timeRange: "7am – 9:30am"  },
  { key: "lunch"     as const, label: "Lunch",     icon: Sun,    color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20", timeRange: "12pm – 2:30pm" },
  { key: "dinner"    as const, label: "Dinner",    icon: Moon,   color: "text-blue-400",    bg: "bg-blue-400/10",    border: "border-blue-400/20",    timeRange: "7pm – 9pm"     },
];

function getCurrentMealIndex() {
  const h = new Date().getHours();
  if (h >= 7  && h < 10) return 0;
  if (h >= 12 && h < 15) return 1;
  if (h >= 19 && h < 22) return 2;
  return -1;
}

export default function ThisWeek() {
  const { currentUser } = useAuth();
  const [menu, setMenu] = useState<SavedMenu | null>(null);
  const [loading, setLoading] = useState(true);
  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const [selectedDay, setSelectedDay] = useState(todayIndex);
  const currentMeal = getCurrentMealIndex();

  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      try {
        const snap = await getDocs(query(
          collection(db, "users", currentUser.uid, "menus"),
          orderBy("uploadedAt", "desc"),
          limit(1)
        ));
        if (!snap.empty) setMenu(snap.docs[0].data() as SavedMenu);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [currentUser]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
    </div>
  );

  if (!menu) return (
    <div className="max-w-lg mx-auto flex flex-col items-center justify-center h-full py-24 gap-6 text-center">
      <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center">
        <Upload className="w-9 h-9 text-white/30" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">No menu this week</h2>
        <p className="text-white/40 font-medium">Upload your mess menu PDF or photo and we will handle the rest</p>
      </div>
      <Link to="/app/menu-upload" className="inline-flex items-center gap-2 px-8 py-4 bg-white text-black font-bold rounded-2xl hover:scale-[1.02] transition-transform shadow-[0_0_30px_rgba(255,255,255,0.15)]">
        Upload menu <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );

  const sortedMenu = [...menu.extractedData].sort(
    (a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day)
  );
  const dayPlan = sortedMenu[selectedDay] || sortedMenu[0];

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">This Week</h1>
          <p className="text-white/40 text-sm font-medium mt-1">
            Uploaded {new Date(menu.uploadedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          </p>
        </div>
        <Link to="/app/menu-upload" className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 text-xs font-bold text-white/50 hover:bg-white/5 hover:text-white transition-all">
          <Plus className="w-3.5 h-3.5" /> Update
        </Link>
      </div>

      {/* Day Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {DAYS.map((day, i) => {
          const isToday = i === todayIndex;
          const isSelected = i === selectedDay;
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(i)}
              className={`flex-shrink-0 flex flex-col items-center px-4 py-3 rounded-2xl transition-all duration-200 min-w-[64px] ${
                isSelected
                  ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)] scale-[1.02]"
                  : isToday
                  ? "bg-white/10 text-white border border-white/20"
                  : "bg-white/5 text-white/50 hover:bg-white/8 hover:text-white"
              }`}
            >
              <span className="text-[11px] font-bold uppercase tracking-wider">{DAY_SHORT[i]}</span>
              {isToday && (
                <span className={`mt-1 w-1.5 h-1.5 rounded-full ${isSelected ? "bg-black/40" : "bg-white"}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Meal Cards */}
      {dayPlan ? (
        <div className="space-y-4">
          {meals.map(({ key, label, icon: Icon, color, bg, border, timeRange }, mealIdx) => {
            const isActive = mealIdx === currentMeal && selectedDay === todayIndex;
            const items = dayPlan[key] || [];
            return (
              <div
                key={key}
                className={`rounded-2xl p-5 border transition-all ${
                  isActive
                    ? `${bg} ${border} border shadow-lg`
                    : "glass-card border-transparent"
                }`}
              >
                {/* Meal Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl ${bg} border ${border} flex items-center justify-center`}>
                      <Icon className={`w-4.5 h-4.5 ${color}`} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{label}</p>
                      <p className="text-xs text-white/30 font-medium">{timeRange}</p>
                    </div>
                  </div>
                  {isActive && (
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${color} ${bg} border ${border}`}>
                      Now open
                    </span>
                  )}
                </div>

                {/* Food Items */}
                {items.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {items.map((item, i) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/8 text-sm text-white/80 font-medium hover:bg-white/10 transition-colors"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-white/30 text-sm font-medium">No items listed</p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass-card rounded-2xl p-8 text-center text-white/40">
          No data for {DAYS[selectedDay]}
        </div>
      )}
    </div>
  );
}

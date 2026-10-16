import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { ArrowRight, Coffee, Sun, Moon, Plus, Upload, Sparkles } from "lucide-react";
import { getCachedData, setCachedData } from "@/lib/dataCache";
import { cleanFoodName } from "./DailyLog";

type MealPlan = { day: string; breakfast: string[]; lunch: string[]; dinner: string[]; };
type SavedMenu = { uploadedAt: string; extractedData: MealPlan[]; };

import { getCurrentMealIndex } from "@/lib/dateUtils";

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const DAY_SHORT = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const meals = [
  { key: "breakfast" as const, label: "Breakfast", icon: Coffee, color: "text-amber-400",   bg: "bg-amber-400/10",   border: "border-amber-400/20",   timeRange: "7:00 AM - 9:30 AM"  },
  { key: "lunch"     as const, label: "Lunch",     icon: Sun,    color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20", timeRange: "12:00 PM - 2:30 PM" },
  { key: "dinner"    as const, label: "Dinner",    icon: Moon,   color: "text-blue-400",    bg: "bg-blue-400/10",    border: "border-blue-400/20",    timeRange: "7:00 PM - 9:00 PM"     },
];

export default function ThisWeek() {
  const { currentUser } = useAuth();
  const cachedMenu = getCachedData<SavedMenu>("saved_mess_menu");
  const [menu, setMenu] = useState<SavedMenu | null>(cachedMenu || null);
  const [loading, setLoading] = useState(!cachedMenu);
  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const [selectedDay, setSelectedDay] = useState(todayIndex);
  const currentMeal = getCurrentMealIndex();

  useEffect(() => {
    if (!currentUser) return;
    let isMounted = true;
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, "users", currentUser.uid, "menus"), orderBy("uploadedAt", "desc"), limit(1)));
        if (!isMounted) return;
        if (!snap.empty) {
          const data = snap.docs[0].data() as SavedMenu;
          setMenu(data);
          setCachedData("saved_mess_menu", data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, [currentUser]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
    </div>
  );

  if (!menu) return (
    <div className="max-w-lg mx-auto flex flex-col items-center py-24 gap-6 text-center animate-in fade-in duration-500">
      <div className="w-20 h-20 rounded-3xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white/40">
        <Upload className="w-8 h-8" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">No Active Mess Menu</h2>
        <p className="text-white/45 text-sm font-normal max-w-sm">
          Upload your hostel or campus mess menu schedule to unlock weekly meal intelligence.
        </p>
      </div>
      <Link 
        to="/app/menu-upload" 
        className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-bold text-xs uppercase tracking-wider rounded-full hover:bg-white/90 active:scale-[0.98] transition-all shadow-sm"
      >
        <span>Upload Menu</span>
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );

  const sortedMenu = [...menu.extractedData].sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day));
  const dayPlan = sortedMenu[selectedDay] || sortedMenu[0];

  return (
    <div className="max-w-3xl mx-auto space-y-5 w-full min-w-0 max-w-full pb-4 md:pb-6 animate-in fade-in duration-500">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] font-bold tracking-widest uppercase text-white/50 mb-2.5">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>Weekly Schedule</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tightest font-sans">
            Mess Timetable
          </h1>
          <p className="text-sm font-normal text-white/45 mt-1.5">
            Updated {new Date(menu.uploadedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          </p>
        </div>

        <Link 
          to="/app/menu-upload" 
          className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-white/[0.08] bg-white/[0.03] text-xs font-semibold text-white/70 hover:bg-white/[0.08] hover:text-white transition-all w-fit"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Update Menu</span>
        </Link>
      </div>

      {/* Responsive Day Selector Capsules - Exactly fits mobile view without cut-off */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 w-full py-1 min-w-0">
        {DAYS.map((day, i) => {
          const isToday = i === todayIndex;
          const isSelected = i === selectedDay;
          return (
            <button 
              key={day} 
              type="button"
              onClick={() => setSelectedDay(i)}
              className={`flex flex-col items-center justify-center py-2 sm:py-3 rounded-2xl transition-all duration-200 border min-w-0 w-full ${
                isSelected 
                  ? "bg-white text-black border-white shadow-sm font-bold" 
                  : isToday 
                  ? "bg-white/[0.06] border-white/20 text-white font-semibold" 
                  : "bg-white/[0.02] border-white/[0.04] text-white/50 hover:bg-white/[0.05] hover:text-white"
              }`}
            >
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">{DAY_SHORT[i]}</span>
              {isToday && (
                <span className={`mt-1 sm:mt-1.5 w-1.5 h-1.5 rounded-full ${isSelected ? "bg-black" : "bg-emerald-400"}`} />
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
            const rawItems = dayPlan[key] || [];
            const items = rawItems.map(cleanFoodName).filter(Boolean);

            return (
              <div 
                key={key} 
                className={`rounded-3xl p-5 md:p-6 border transition-all duration-200 ${
                  isActive 
                    ? "bg-[#14181f] border-white/20 shadow-lg" 
                    : "rounded-3xl bg-[#121418] border-white/[0.06] hover:border-white/[0.12]"
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-2xl flex items-center justify-center border ${bg} ${border}`}>
                      <Icon className={`w-4 h-4 ${color}`} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white tracking-tight">{label}</p>
                      <p className="text-[11px] text-white/40 font-medium">{timeRange}</p>
                    </div>
                  </div>

                  {isActive && (
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Serving Now
                    </span>
                  )}
                </div>

                {items.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {items.map((item, i) => (
                      <span 
                        key={i} 
                        className="px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-xs text-white/80 font-medium"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-white/30 text-xs font-normal">No dishes recorded for this meal slot.</p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl bg-[#121418] border border-white/[0.06] p-8 text-center text-white/40 text-sm">
          No meal data available for {DAYS[selectedDay]}
        </div>
      )}
    </div>
  );
}

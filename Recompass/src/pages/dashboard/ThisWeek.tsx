import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { ArrowRight, Coffee, Sun, Moon, Plus } from "lucide-react";

type MealPlan = {
  day: string;
  breakfast: string[];
  lunch: string[];
  dinner: string[];
};

type SavedMenu = {
  startDate: string;
  uploadedAt: string;
  extractedData: MealPlan[];
};

const DAYS_ORDER = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

const mealConfig = [
  { key: "breakfast" as const, label: "Breakfast", icon: Coffee, color: "text-amber-400" },
  { key: "lunch"     as const, label: "Lunch",     icon: Sun,    color: "text-emerald-400" },
  { key: "dinner"    as const, label: "Dinner",    icon: Moon,   color: "text-blue-400" },
];

export default function ThisWeek() {
  const { currentUser } = useAuth();
  const [menu, setMenu] = useState<SavedMenu | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    const load = async () => {
      try {
        const q = query(
          collection(db, "users", currentUser.uid, "menus"),
          orderBy("uploadedAt", "desc"),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          setMenu(snap.docs[0].data() as SavedMenu);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
      </div>
    );
  }

  if (!menu) {
    return (
      <div className="max-w-5xl mx-auto flex flex-col items-center justify-center h-64 gap-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
          <Sun className="w-8 h-8 text-white/40" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">No menu uploaded yet</h2>
          <p className="text-muted-foreground font-medium">Upload your mess menu to see this week'\''s meals</p>
        </div>
        <Link
          to="/app/menu-upload"
          className="inline-flex items-center gap-2 px-8 py-4 bg-white text-black font-bold rounded-xl hover:scale-[1.02] transition-transform"
        >
          Upload this week'\''s menu <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  // Sort days in week order
  const sortedMenu = [...menu.extractedData].sort(
    (a, b) => DAYS_ORDER.indexOf(a.day) - DAYS_ORDER.indexOf(b.day)
  );

  const today = new Date().toLocaleDateString("en-US", { weekday: "long" });

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">This Week</h1>
          <p className="text-muted-foreground font-medium mt-1">
            Uploaded {new Date(menu.uploadedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          </p>
        </div>
        <Link
          to="/app/menu-upload"
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-sm font-semibold text-white/70 hover:bg-white/5 hover:text-white transition-all"
        >
          <Plus className="w-4 h-4" /> Update menu
        </Link>
      </div>

      <div className="space-y-4">
        {sortedMenu.map((dayPlan) => {
          const isToday = dayPlan.day === today;
          return (
            <div
              key={dayPlan.day}
              className={`glass-card rounded-2xl p-5 border transition-all ${
                isToday
                  ? "border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.05)]"
                  : "border-transparent"
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-base font-bold text-white uppercase tracking-wider">{dayPlan.day}</h2>
                {isToday && (
                  <span className="px-2 py-0.5 rounded-full bg-white text-black text-[10px] font-bold uppercase tracking-wider">
                    Today
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {mealConfig.map(({ key, label, icon: Icon, color }) => (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-3.5 h-3.5 ${color}`} />
                      <span className="text-xs font-bold uppercase tracking-widest text-white/40">{label}</span>
                    </div>
                    <ul className="space-y-1">
                      {(dayPlan[key] || []).map((item, i) => (
                        <li key={i} className="text-sm text-white/80 font-medium flex items-start gap-1.5">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-white/20 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

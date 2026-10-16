import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase/config";
import { doc, getDoc } from "firebase/firestore";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from "recharts";
import { TrendingUp, Activity, Flame, Sparkles, CheckCircle2 } from "lucide-react";
import { getCachedData, setCachedData } from "@/lib/dataCache";
import { getLocalDateStr } from "@/lib/dateUtils";
import {
  AppleActivityRing,
  APPLE_FITNESS_MACRO_PALETTES,
  type RingData
} from "@/components/ui/AppleActivityRing";

export type DailyProgressItem = {
  date: string;
  dayName: string;
  dateStr: string;
  calories: number;
  target: number;
  protein: number;
  carbs: number;
  fats: number;
  rings: RingData[];
};

export default function Progress() {
  const { currentUser, userProfile } = useAuth();
  const cachedProgress = getCachedData<{ chartData: DailyProgressItem[]; stats: any; targetCals: number; targetPro: number }>("progress_7_days_v2");
  const [loading, setLoading] = useState(!cachedProgress);
  const [chartData, setChartData] = useState<DailyProgressItem[]>(cachedProgress?.chartData || []);
  const [targetCalories, setTargetCalories] = useState(cachedProgress?.targetCals || 2000);
  const [targetProtein, setTargetProtein] = useState(cachedProgress?.targetPro || 120);
  const [stats, setStats] = useState(cachedProgress?.stats || { avgCals: 0, avgPro: 0, activeDays: 0 });
  const [chartTab, setChartTab] = useState<"calories" | "protein">("calories");
  const [selectedDayIdx, setSelectedDayIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    let isMounted = true;

    const fetchLast7Days = async () => {
      try {
        // Calculate user's target calories
        let targetCals = 2000;
        let targetPro = 120;
        if (userProfile && userProfile.targetOverrides?.enabled && userProfile.targetOverrides.calories) {
          targetCals = Number(userProfile.targetOverrides.calories);
          targetPro = Number(userProfile.targetOverrides.protein || 120);
        } else if (userProfile && userProfile.weight && userProfile.height && userProfile.age) {
          const w = Number(userProfile.weight);
          const h = Number(userProfile.height);
          const a = Number(userProfile.age);
          const isMale = userProfile.gender !== "female";
          const bmr = isMale ? (10 * w) + (6.25 * h) - (5 * a) + 5 : (10 * w) + (6.25 * h) - (5 * a) - 161;
          
          let multiplier = 1.2;
          if (userProfile.activity === "light") multiplier = 1.375;
          if (userProfile.activity === "moderate") multiplier = 1.55;
          if (userProfile.activity === "very_active") multiplier = 1.725;
          
          let tdee = bmr * multiplier;
          if (userProfile.goal === "fat_loss") tdee -= 500;
          if (userProfile.goal === "muscle_gain") tdee += 300;
          
          targetCals = Math.round(tdee);
          targetPro = Math.round(userProfile.goal === "muscle_gain" ? w * 2.2 : w * 1.6);
        }

        const targetCarbs = Math.round((targetCals - targetPro * 4 - (targetCals * 0.25)) / 4);

        if (isMounted) {
          setTargetCalories(targetCals);
          setTargetProtein(targetPro);
        }

        // Build list of last 7 dates using local date utility
        const dateItems: { dateStr: string; displayDate: string; dayName: string }[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = getLocalDateStr(d);
          const displayDate = d.toLocaleDateString("en-US", { weekday: 'short', month: 'numeric', day: 'numeric' });
          const dayName = d.toLocaleDateString("en-US", { weekday: 'short' });
          dateItems.push({ dateStr, displayDate, dayName });
        }

        // Fetch all 7 days in PARALLEL via Promise.all
        const snapshots = await Promise.all(
          dateItems.map(item => getDoc(doc(db, "users", currentUser.uid, "logs", item.dateStr)))
        );

        if (!isMounted) return;

        let totalCals = 0;
        let totalPro = 0;
        let daysActive = 0;

        const data: DailyProgressItem[] = snapshots.map((snap, idx) => {
          const { displayDate, dayName, dateStr } = dateItems[idx];
          if (snap.exists()) {
            const lData = snap.data();
            const allMeals = [
              ...(lData.breakfast || []),
              ...(lData.lunch || []),
              ...(lData.dinner || []),
              ...(lData.snacks || []),
            ];
            const cals = Number(lData.totals?.calories) || allMeals.reduce((s: number, it: any) => s + (Number(it.calories) || 0), 0);
            const pro = Number(lData.totals?.protein) || allMeals.reduce((s: number, it: any) => s + (Number(it.protein) || 0), 0);
            const carbs = Number(lData.totals?.carbs) || allMeals.reduce((s: number, it: any) => s + (Number(it.carbs) || 0), 0);
            const fats = Number(lData.totals?.fats) || allMeals.reduce((s: number, it: any) => s + (Number(it.fats) || 0), 0);
            if (cals > 0) {
              totalCals += cals;
              totalPro += pro;
              daysActive++;
            }

            const rings: RingData[] = [
              {
                id: `ring_cal_${idx}`,
                label: "Calories",
                current: cals,
                target: targetCals,
                unit: "kcal",
                gradientStart: APPLE_FITNESS_MACRO_PALETTES.calories.gradientStart,
                gradientEnd: APPLE_FITNESS_MACRO_PALETTES.calories.gradientEnd,
                trackColor: APPLE_FITNESS_MACRO_PALETTES.calories.trackColor,
              },
              {
                id: `ring_pro_${idx}`,
                label: "Protein",
                current: pro,
                target: targetPro,
                unit: "g",
                gradientStart: APPLE_FITNESS_MACRO_PALETTES.protein.gradientStart,
                gradientEnd: APPLE_FITNESS_MACRO_PALETTES.protein.gradientEnd,
                trackColor: APPLE_FITNESS_MACRO_PALETTES.protein.trackColor,
              },
              {
                id: `ring_carb_${idx}`,
                label: "Carbs",
                current: carbs,
                target: targetCarbs,
                unit: "g",
                gradientStart: APPLE_FITNESS_MACRO_PALETTES.carbs.gradientStart,
                gradientEnd: APPLE_FITNESS_MACRO_PALETTES.carbs.gradientEnd,
                trackColor: APPLE_FITNESS_MACRO_PALETTES.carbs.trackColor,
              },
            ];

            return {
              date: displayDate,
              dayName,
              dateStr,
              calories: Math.round(cals),
              target: targetCals,
              protein: Math.round(pro),
              carbs: Math.round(carbs),
              fats: Math.round(fats),
              rings,
            };
          } else {
            const rings: RingData[] = [
              {
                id: `ring_cal_${idx}`,
                label: "Calories",
                current: 0,
                target: targetCals,
                unit: "kcal",
                gradientStart: APPLE_FITNESS_MACRO_PALETTES.calories.gradientStart,
                gradientEnd: APPLE_FITNESS_MACRO_PALETTES.calories.gradientEnd,
                trackColor: APPLE_FITNESS_MACRO_PALETTES.calories.trackColor,
              },
              {
                id: `ring_pro_${idx}`,
                label: "Protein",
                current: 0,
                target: targetPro,
                unit: "g",
                gradientStart: APPLE_FITNESS_MACRO_PALETTES.protein.gradientStart,
                gradientEnd: APPLE_FITNESS_MACRO_PALETTES.protein.gradientEnd,
                trackColor: APPLE_FITNESS_MACRO_PALETTES.protein.trackColor,
              },
              {
                id: `ring_carb_${idx}`,
                label: "Carbs",
                current: 0,
                target: targetCarbs,
                unit: "g",
                gradientStart: APPLE_FITNESS_MACRO_PALETTES.carbs.gradientStart,
                gradientEnd: APPLE_FITNESS_MACRO_PALETTES.carbs.gradientEnd,
                trackColor: APPLE_FITNESS_MACRO_PALETTES.carbs.trackColor,
              },
            ];

            return {
              date: displayDate,
              dayName,
              dateStr,
              calories: 0,
              target: targetCals,
              protein: 0,
              carbs: 0,
              fats: 0,
              rings,
            };
          }
        });

        const newStats = {
          avgCals: daysActive ? Math.round(totalCals / daysActive) : 0,
          avgPro: daysActive ? Math.round(totalPro / daysActive) : 0,
          activeDays: daysActive
        };

        setChartData(data);
        setStats(newStats);
        setCachedData("progress_7_days_v2", { chartData: data, stats: newStats, targetCals, targetPro });
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchLast7Days();
    return () => { isMounted = false; };
  }, [currentUser, userProfile]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
      </div>
    );
  }

  const calDiff = stats.avgCals - targetCalories;
  const calPercent = Math.round((stats.avgCals / targetCalories) * 100);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-20 md:pb-6">
      
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] font-bold tracking-widest uppercase text-white/50 mb-2">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>Macro Trends</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tightest font-sans">
            Weekly Performance
          </h1>
          <p className="text-xs sm:text-sm font-normal text-white/45 mt-1">
            7-day metabolic intake and Apple Activity rings cadence.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="px-3.5 py-1.5 rounded-full bg-[#121418] border border-white/[0.08] text-xs font-semibold text-white/70">
            Target: <span className="text-white font-sans font-bold">{targetCalories}</span> kcal &middot; <span className="text-orange-400 font-bold">{targetProtein}g</span> P
          </div>
        </div>
      </div>

      {/* Apple Health 7-Day Activity Ring Streak Strip */}
      <div className="rounded-3xl bg-[#121418] border border-white/[0.08] p-4 sm:p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4 border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-rose-500" />
            <h2 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">7-Day Move & Macro Rings</h2>
          </div>
          <span className="text-[10px] text-white/40 font-mono font-medium">Tap any day for details</span>
        </div>

        {/* 7-Day Ring Bar */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {chartData.map((d, idx) => {
            const isSelected = selectedDayIdx === idx;
            const hasData = d.calories > 0;
            return (
              <button
                key={d.dateStr}
                onClick={() => setSelectedDayIdx(isSelected ? null : idx)}
                className={`flex flex-col items-center justify-between p-2 sm:p-3 rounded-2xl transition-all cursor-pointer ${
                  isSelected
                    ? "bg-white/[0.08] border border-white/20 shadow-lg scale-105"
                    : "bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/10"
                }`}
              >
                <span className={`text-[10px] sm:text-xs font-bold uppercase ${
                  isSelected ? "text-white" : "text-white/45"
                }`}>
                  {d.dayName}
                </span>

                <div className="my-1.5 shrink-0">
                  <AppleActivityRing
                    rings={d.rings}
                    size={46}
                    strokeWidth={5.5}
                    ringGap={2}
                  />
                </div>

                <span className={`text-[9px] sm:text-[10px] font-sans tabular-nums font-bold truncate max-w-full ${
                  hasData ? (isSelected ? "text-emerald-400" : "text-white/80") : "text-white/25"
                }`}>
                  {hasData ? `${d.calories}` : "-"}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected Day Inspector Popover */}
        {selectedDayIdx !== null && chartData[selectedDayIdx] && (
          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between flex-wrap gap-3 animate-in fade-in duration-200">
            <div>
              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>{chartData[selectedDayIdx].date}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-white/60">
                  {chartData[selectedDayIdx].calories} / {chartData[selectedDayIdx].target} kcal
                </span>
              </p>
              <p className="text-[11px] text-white/45 font-sans mt-0.5">
                P: <strong className="text-emerald-400">{chartData[selectedDayIdx].protein}g</strong> &middot; 
                C: <strong className="text-sky-400">{chartData[selectedDayIdx].carbs}g</strong> &middot; 
                F: <strong className="text-amber-400">{chartData[selectedDayIdx].fats}g</strong>
              </p>
            </div>
            <button
              onClick={() => setSelectedDayIdx(null)}
              className="text-[10px] text-white/40 hover:text-white px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>

      {/* Bento Metric Cards (Compact) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        {/* Calories Bento */}
        <div className="rounded-3xl bg-[#121418] border border-white/[0.06] p-5 relative overflow-hidden flex flex-col justify-between group hover:border-white/[0.12] transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Avg Calories</span>
            <div className="w-7 h-7 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-white/70">
              <Flame className="w-3.5 h-3.5 text-white/80" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold font-sans tracking-tight text-white tabular-nums">
                {stats.avgCals}
              </span>
              <span className="text-xs text-white/40 font-sans font-medium">kcal/day</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-sans font-bold ${
                Math.abs(calDiff) <= 100 
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" 
                  : calDiff > 100 
                  ? "bg-amber-500/15 text-amber-300 border border-amber-500/30" 
                  : "bg-blue-500/15 text-blue-300 border border-blue-500/30"
              }`}>
                {calDiff > 0 ? `+${calDiff}` : calDiff} kcal
              </span>
              <span className="text-[10px] text-white/40 font-medium">{calPercent}% target</span>
            </div>
          </div>
        </div>

        {/* Protein Bento */}
        <div className="rounded-3xl bg-[#121418] border border-white/[0.06] p-5 relative overflow-hidden flex flex-col justify-between group hover:border-white/[0.12] transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Avg Protein</span>
            <div className="w-7 h-7 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
              <Activity className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold font-sans tracking-tight text-orange-400 tabular-nums">
                {stats.avgPro}
              </span>
              <span className="text-xs text-white/40 font-sans font-medium">g/day</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-sans font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30">
                {Math.round((stats.avgPro / Math.max(1, targetProtein)) * 100)}% target
              </span>
              <span className="text-[10px] text-white/40 font-medium">Goal: {targetProtein}g</span>
            </div>
          </div>
        </div>

        {/* Active Days Bento */}
        <div className="rounded-3xl bg-[#121418] border border-white/[0.06] p-5 relative overflow-hidden flex flex-col justify-between group hover:border-white/[0.12] transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Cadence</span>
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold font-sans tracking-tight text-white tabular-nums">
                {stats.activeDays}
              </span>
              <span className="text-xs text-white/40 font-sans font-medium">/ 7 days</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white/[0.06] text-white/80 border border-white/10">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                {Math.round((stats.activeDays / 7) * 100)}% logged
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Segmented Chart Card (Eliminates 60% of Vertical Scroll) */}
      <div className="rounded-3xl bg-[#121418] border border-white/[0.06] p-5 sm:p-7 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              {chartTab === "calories" ? "Calorie Intake vs Metabolic Target" : "Daily Protein Distribution"}
            </h2>
            <p className="text-xs text-white/40 mt-0.5">
              {chartTab === "calories" 
                ? "Daily logged calories plotted against your metabolic target line" 
                : `Tracking protein intake against daily target of ${targetProtein}g`}
            </p>
          </div>
          
          {/* Segmented Chart Selector Pill */}
          <div className="flex items-center p-1 rounded-2xl bg-white/[0.03] border border-white/[0.08] self-start sm:self-auto">
            <button
              onClick={() => setChartTab("calories")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                chartTab === "calories"
                  ? "bg-white text-black font-bold shadow-md"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Calories</span>
            </button>
            <button
              onClick={() => setChartTab("protein")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                chartTab === "protein"
                  ? "bg-white text-black font-bold shadow-md"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Protein</span>
            </button>
          </div>
        </div>

        {chartTab === "calories" ? (
          <div className="h-[260px] sm:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCals" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={0.25}/>
                    <stop offset="90%" stopColor="#34d399" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="rgba(255,255,255,0.3)" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                  dy={10} 
                />
                <YAxis 
                  stroke="rgba(255,255,255,0.3)" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                  dx={-5}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#161920', 
                    borderColor: 'rgba(255,255,255,0.1)', 
                    borderRadius: '16px', 
                    boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
                    padding: '12px 16px'
                  }}
                  itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 600 }}
                  labelStyle={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                  cursor={{ stroke: 'rgba(255,255,255,0.15)', strokeWidth: 1, strokeDasharray: '3 3' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="target" 
                  stroke="rgba(255,255,255,0.25)" 
                  strokeWidth={1.5}
                  strokeDasharray="4 4" 
                  fill="none" 
                  name="Target"
                />
                <Area 
                  type="monotone" 
                  dataKey="calories" 
                  stroke="#34d399" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorCals)" 
                  name="Calories"
                  activeDot={{ r: 5, fill: '#34d399', stroke: '#121418', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[260px] sm:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="rgba(255,255,255,0.3)" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                  dy={10} 
                />
                <YAxis 
                  stroke="rgba(255,255,255,0.3)" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                  dx={-5}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  contentStyle={{ 
                    backgroundColor: '#161920', 
                    borderColor: 'rgba(255,255,255,0.1)', 
                    borderRadius: '16px', 
                    boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
                    padding: '12px 16px'
                  }}
                  itemStyle={{ color: '#fb923c', fontSize: '12px', fontWeight: 600 }}
                  labelStyle={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                />
                <Bar dataKey="protein" radius={[8, 8, 0, 0]} name="Protein (g)" maxBarSize={36}>
                  {chartData.map((entry, index) => {
                    const metTarget = entry.protein >= targetProtein * 0.9;
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.protein > 0 ? (metTarget ? '#fb923c' : 'rgba(251, 146, 60, 0.35)') : 'transparent'} 
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

    </div>
  );
}

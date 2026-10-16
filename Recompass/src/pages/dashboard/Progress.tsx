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

export default function Progress() {
  const { currentUser, userProfile } = useAuth();
  const cachedProgress = getCachedData<{ chartData: any[]; stats: any; targetCals: number; targetPro: number }>("progress_7_days");
  const [loading, setLoading] = useState(!cachedProgress);
  const [chartData, setChartData] = useState<any[]>(cachedProgress?.chartData || []);
  const [targetCalories, setTargetCalories] = useState(cachedProgress?.targetCals || 2000);
  const [targetProtein, setTargetProtein] = useState(cachedProgress?.targetPro || 120);
  const [stats, setStats] = useState(cachedProgress?.stats || { avgCals: 0, avgPro: 0, activeDays: 0 });

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

        if (isMounted) {
          setTargetCalories(targetCals);
          setTargetProtein(targetPro);
        }

        // Build list of last 7 dates
        const dateItems: { dateStr: string; displayDate: string }[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
          const displayDate = d.toLocaleDateString("en-US", { weekday: 'short', month: 'numeric', day: 'numeric' });
          dateItems.push({ dateStr, displayDate });
        }

        // Fetch all 7 days in PARALLEL via Promise.all (not sequential)
        const snapshots = await Promise.all(
          dateItems.map(item => getDoc(doc(db, "users", currentUser.uid, "logs", item.dateStr)))
        );

        if (!isMounted) return;

        let totalCals = 0;
        let totalPro = 0;
        let daysActive = 0;

        const data = snapshots.map((snap, idx) => {
          const displayDate = dateItems[idx].displayDate;
          if (snap.exists()) {
            const lData = snap.data();
            const cals = lData.totals?.calories || 0;
            const pro = lData.totals?.protein || 0;
            if (cals > 0) {
              totalCals += cals;
              totalPro += pro;
              daysActive++;
            }
            return {
              date: displayDate,
              calories: Math.round(cals),
              target: targetCals,
              protein: Math.round(pro),
            };
          } else {
            return {
              date: displayDate,
              calories: 0,
              target: targetCals,
              protein: 0,
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
        setCachedData("progress_7_days", { chartData: data, stats: newStats, targetCals, targetPro });
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
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-28 md:pb-8">
      
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] font-bold tracking-widest uppercase text-white/50 mb-2.5">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>Macro Trends</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tightest font-sans">
            Weekly Performance
          </h1>
          <p className="text-sm font-normal text-white/45 mt-1.5 max-w-xl">
            7-day average intake compared against your personalized metabolic targets.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-xs font-medium text-white/60">
            Target: <span className="text-white font-sans font-bold">{targetCalories}</span> kcal
          </div>
        </div>
      </div>

      {/* Mobbin Bento Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Calories Bento */}
        <div className="rounded-3xl bg-[#121418] border border-white/[0.06] p-6 relative overflow-hidden flex flex-col justify-between group hover:border-white/[0.12] transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-semibold text-white/40 uppercase tracking-widest">Avg Calories</span>
            <div className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-white/70">
              <Flame className="w-4 h-4 text-white/80" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl md:text-4xl font-extrabold font-sans tracking-tight text-white">
                {stats.avgCals}
              </span>
              <span className="text-xs text-white/40 font-sans font-medium">kcal / day</span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-sans font-bold ${
                Math.abs(calDiff) <= 100 
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" 
                  : calDiff > 100 
                  ? "bg-amber-500/15 text-amber-300 border border-amber-500/30" 
                  : "bg-blue-500/15 text-blue-300 border border-blue-500/30"
              }`}>
                {calDiff > 0 ? `+${calDiff}` : calDiff} kcal
              </span>
              <span className="text-[11px] text-white/40 font-medium">{calPercent}% of target</span>
            </div>
          </div>
        </div>

        {/* Protein Bento */}
        <div className="rounded-3xl bg-[#121418] border border-white/[0.06] p-6 relative overflow-hidden flex flex-col justify-between group hover:border-white/[0.12] transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-semibold text-white/40 uppercase tracking-widest">Avg Protein</span>
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl md:text-4xl font-extrabold font-sans tracking-tight text-orange-400">
                {stats.avgPro}
              </span>
              <span className="text-xs text-white/40 font-sans font-medium">g / day</span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-sans font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30">
                {Math.round((stats.avgPro / targetProtein) * 100)}% target
              </span>
              <span className="text-[11px] text-white/40 font-medium">Target: {targetProtein}g</span>
            </div>
          </div>
        </div>

        {/* Active Days Bento */}
        <div className="rounded-3xl bg-[#121418] border border-white/[0.06] p-6 relative overflow-hidden flex flex-col justify-between group hover:border-white/[0.12] transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-semibold text-white/40 uppercase tracking-widest">Logging Consistency</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl md:text-4xl font-extrabold font-sans tracking-tight text-white">
                {stats.activeDays}
              </span>
              <span className="text-xs text-white/40 font-sans font-medium">/ 7 days logged</span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white/[0.06] text-white/80 border border-white/10">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                {Math.round((stats.activeDays / 7) * 100)}% active
              </span>
              <span className="text-[11px] text-white/40 font-medium">Continuous cadence</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Area Chart: Calorie vs Target */}
      <div className="rounded-3xl bg-[#121418] border border-white/[0.06] p-6 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Calorie Intake vs Target</h2>
            <p className="text-xs text-white/40 mt-0.5">Daily logged calories plotted against your metabolic guideline</p>
          </div>
          
          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-2 text-white/70">
              <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" />
              <span>Intake</span>
            </div>
            <div className="flex items-center gap-2 text-white/40">
              <span className="w-3 h-0.5 border-t border-dashed border-white/40 inline-block" />
              <span>Target ({targetCalories} kcal)</span>
            </div>
          </div>
        </div>

        <div className="h-[280px] w-full">
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
      </div>

      {/* Bar Chart: Protein Distribution */}
      <div className="rounded-3xl bg-[#121418] border border-white/[0.06] p-6 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Daily Protein Intake</h2>
            <p className="text-xs text-white/40 mt-0.5">Tracking against daily average goal of {targetProtein}g</p>
          </div>
          
          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-2 text-white/70">
              <span className="w-3 h-3 rounded-md bg-orange-400 inline-block" />
              <span>Target Met</span>
            </div>
            <div className="flex items-center gap-2 text-white/40">
              <span className="w-3 h-3 rounded-md bg-white/10 inline-block" />
              <span>Below Target</span>
            </div>
          </div>
        </div>

        <div className="h-[220px] w-full">
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
      </div>

    </div>
  );
}

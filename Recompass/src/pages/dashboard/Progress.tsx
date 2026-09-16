import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase/config";
import { doc, getDoc } from "firebase/firestore";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from "recharts";
import { TrendingUp, Activity, Flame, Loader2 } from "lucide-react";

export default function Progress() {
  const { currentUser, userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  const [stats, setStats] = useState({ avgCals: 0, avgPro: 0, activeDays: 0 });

  useEffect(() => {
    if (!currentUser) return;

    const fetchLast7Days = async () => {
      try {
        const data = [];
        let totalCals = 0;
        let totalPro = 0;
        let daysActive = 0;

        // Calculate user's target calories
        let targetCals = 2000;
        if (userProfile && userProfile.targetOverrides?.enabled && userProfile.targetOverrides.calories) {
          targetCals = Number(userProfile.targetOverrides.calories);
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
        }

        // Get last 7 days
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
          const displayDate = d.toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric' });

          const logSnap = await getDoc(doc(db, "users", currentUser.uid, "logs", dateStr));
          
          if (logSnap.exists()) {
            const lData = logSnap.data();
            const cals = lData.totals?.calories || 0;
            const pro = lData.totals?.protein || 0;
            
            data.push({
              date: displayDate,
              calories: cals,
              target: targetCals,
              protein: pro,
            });

            if (cals > 0) {
              totalCals += cals;
              totalPro += pro;
              daysActive++;
            }
          } else {
            data.push({
              date: displayDate,
              calories: 0,
              target: targetCals,
              protein: 0,
            });
          }
        }

        setChartData(data);
        setStats({
          avgCals: daysActive ? Math.round(totalCals / daysActive) : 0,
          avgPro: daysActive ? Math.round(totalPro / daysActive) : 0,
          activeDays: daysActive
        });

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchLast7Days();
  }, [currentUser, userProfile]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 md:px-8 py-8 animate-in fade-in duration-500 pb-32 md:pb-8">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Progress</h1>
        <p className="text-sm font-medium text-white/40 mt-1">
          Your macro trends over the last 7 days
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="glass-card p-6 rounded-3xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-20">
            <Flame className="w-16 h-16 text-orange-500" />
          </div>
          <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1">Avg Calories</p>
          <div className="flex items-end gap-2">
            <p className="text-4xl font-extrabold text-white">{stats.avgCals}</p>
            <p className="text-sm text-white/40 mb-1">kcal</p>
          </div>
        </div>

        <div className="glass-card p-6 rounded-3xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-20">
            <Activity className="w-16 h-16 text-blue-500" />
          </div>
          <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1">Avg Protein</p>
          <div className="flex items-end gap-2">
            <p className="text-4xl font-extrabold text-white">{stats.avgPro}</p>
            <p className="text-sm text-white/40 mb-1">g</p>
          </div>
        </div>

        <div className="glass-card p-6 rounded-3xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-20">
            <TrendingUp className="w-16 h-16 text-emerald-500" />
          </div>
          <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1">Active Days</p>
          <div className="flex items-end gap-2">
            <p className="text-4xl font-extrabold text-white">{stats.activeDays}</p>
            <p className="text-sm text-white/40 mb-1">/ 7 days</p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="glass-card p-6 md:p-8 rounded-3xl mb-8">
        <h2 className="text-lg font-bold text-white mb-6">Calorie Intake vs Target</h2>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCals" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#63e6a4" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#63e6a4" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" vertical={false} />
              <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
              <YAxis stroke="rgba(255,255,255,0.2)" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(10,10,10,0.95)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '3 3' }}
              />
              <Area 
                type="monotone" 
                dataKey="target" 
                stroke="rgba(255,255,255,0.15)" 
                strokeWidth={2}
                strokeDasharray="5 5" 
                fill="none" 
                name="Target (kcal)"
              />
              <Area 
                type="monotone" 
                dataKey="calories" 
                stroke="#63e6a4" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorCals)" 
                name="Consumed (kcal)"
                activeDot={{ r: 6, fill: '#63e6a4', stroke: '#000', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-card p-6 md:p-8 rounded-3xl">
        <h2 className="text-lg font-bold text-white mb-6">Protein Intake (g)</h2>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" vertical={false} />
              <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
              <YAxis stroke="rgba(255,255,255,0.2)" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
              <Tooltip 
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                contentStyle={{ backgroundColor: 'rgba(10,10,10,0.95)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                itemStyle={{ color: '#fff', fontWeight: 'bold' }}
              />
              <Bar dataKey="protein" radius={[6, 6, 0, 0]} name="Protein (g)" maxBarSize={40}>
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.protein > 0 ? (entry.protein >= stats.avgPro ? '#63e6a4' : 'rgba(255,255,255,0.2)') : 'transparent'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}

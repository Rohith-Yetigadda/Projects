import { useAuth } from "@/contexts/AuthContext";
import { Compass, Flame, Droplet, Wheat, Plus, ArrowRight, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { userProfile } = useAuth();
  const firstName = userProfile?.name?.split(" ")[0] || "User";

  // Mock data for the premium UI
  const macros = {
    calories: { current: 1450, target: 2400 },
    protein: { current: 85, target: 160 },
    carbs: { current: 120, target: 250 },
    fats: { current: 45, target: 70 },
  };

  const caloriePercent = (macros.calories.current / macros.calories.target) * 100;
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (caloriePercent / 100) * circumference;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 md:pb-0">
      
      {/* ─── Header ─── */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-1">
            Good afternoon, {firstName}.
          </h1>
          <p className="text-muted-foreground font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse"></span>
            On track to hit your {userProfile?.goal?.replace("_", " ") ?? "goal"}
          </p>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" size="icon" className="glass rounded-full text-white hover:bg-white/10">
            <Activity className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* ─── Compass AI Recommendation Widget ─── */}
      <section className="relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-3xl blur-xl transition-all duration-500 group-hover:blur-2xl opacity-70"></div>
        <div className="glass-card rounded-3xl p-6 md:p-8 relative border-white/10 flex flex-col md:flex-row items-center gap-6 md:gap-8 overflow-hidden">
          {/* Subtle light sweep */}
          <div className="absolute top-0 -inset-full h-full w-1/2 z-0 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-5 animate-[shimmer_3s_infinite]"></div>
          
          <div className="w-16 h-16 shrink-0 rounded-2xl bg-white flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.3)] relative z-10">
            <Compass className="w-8 h-8 text-black" />
          </div>
          
          <div className="flex-1 text-center md:text-left relative z-10">
            <h2 className="text-sm font-bold tracking-widest text-white/50 uppercase mb-2">Compass Suggestion • 1:15 PM</h2>
            <p className="text-xl md:text-2xl font-medium text-white leading-relaxed">
              Mess lunch is open. Based on your macros, grab the <span className="text-white font-bold bg-white/10 px-2 py-0.5 rounded-md">Dal</span> and <span className="text-white font-bold bg-white/10 px-2 py-0.5 rounded-md">Chicken</span>, but skip the rice today.
            </p>
          </div>

          <div className="relative z-10 shrink-0 w-full md:w-auto">
            <Button className="w-full md:w-auto h-12 px-6 rounded-xl bg-white text-black font-bold hover:bg-white/90 hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]">
              Log this meal
            </Button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* ─── Macro Ring (Main Stat) ─── */}
        <section className="glass-card rounded-3xl p-6 md:col-span-1 flex flex-col items-center justify-center relative border-white/5">
          <h3 className="absolute top-6 left-6 text-sm font-bold tracking-wider text-muted-foreground uppercase">Calories</h3>
          
          <div className="relative flex items-center justify-center mt-8 mb-4">
            {/* Background Track */}
            <svg className="w-48 h-48 transform -rotate-90">
              <circle
                cx="96" cy="96" r={radius}
                className="stroke-white/5"
                strokeWidth="8"
                fill="none"
              />
              {/* Progress Ring */}
              <circle
                cx="96" cy="96" r={radius}
                className="stroke-white transition-all duration-1000 ease-out drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                strokeWidth="8"
                strokeLinecap="round"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-4xl font-extrabold text-white tracking-tighter">
                {macros.calories.current}
              </span>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mt-1">
                / {macros.calories.target} kcal
              </span>
            </div>
          </div>
        </section>

        {/* ─── Macro Bars (Secondary Stats) ─── */}
        <section className="glass-card rounded-3xl p-6 md:col-span-2 border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-bold tracking-wider text-muted-foreground uppercase">Macronutrients</h3>
            <Button variant="ghost" size="sm" className="h-8 px-3 rounded-lg text-xs font-semibold text-white/50 hover:text-white hover:bg-white/10">
              Details <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>

          <div className="space-y-6">
            {/* Protein */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span className="text-sm font-bold text-white">Protein</span>
                </div>
                <span className="text-sm font-medium text-white/70">
                  <span className="text-white font-bold">{macros.protein.current}g</span> / {macros.protein.target}g
                </span>
              </div>
              <div className="h-2.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-orange-400 rounded-full" style={{ width: `${(macros.protein.current / macros.protein.target) * 100}%` }}></div>
              </div>
            </div>

            {/* Carbs */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <div className="flex items-center gap-2">
                  <Wheat className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-bold text-white">Carbs</span>
                </div>
                <span className="text-sm font-medium text-white/70">
                  <span className="text-white font-bold">{macros.carbs.current}g</span> / {macros.carbs.target}g
                </span>
              </div>
              <div className="h-2.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${(macros.carbs.current / macros.carbs.target) * 100}%` }}></div>
              </div>
            </div>

            {/* Fats */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <div className="flex items-center gap-2">
                  <Droplet className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-bold text-white">Fats</span>
                </div>
                <span className="text-sm font-medium text-white/70">
                  <span className="text-white font-bold">{macros.fats.current}g</span> / {macros.fats.target}g
                </span>
              </div>
              <div className="h-2.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-blue-400 rounded-full" style={{ width: `${(macros.fats.current / macros.fats.target) * 100}%` }}></div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ─── Quick Log Actions ─── */}
      <section>
        <h3 className="text-sm font-bold tracking-wider text-muted-foreground uppercase mb-4">Quick Log</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {["Mess Breakfast", "Mess Lunch", "Mess Dinner", "Custom Snack"].map((meal) => (
            <button key={meal} className="glass rounded-2xl p-4 flex flex-col items-center justify-center gap-3 hover:bg-white/10 transition-colors group">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-semibold text-white/80 group-hover:text-white transition-colors">{meal}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

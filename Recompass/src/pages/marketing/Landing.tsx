import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  ArrowRight, 
  Compass, 
  UtensilsCrossed, 
  Camera, 
  Package, 
  CheckCircle2, 
  XCircle, 
  ChevronDown, 
  Zap, 
  Sun, 
  TrendingUp,
  Menu,
  X
} from "lucide-react";

export default function Landing() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  const faqs = [
    {
      q: "How does Recompass calculate calories if the hostel mess doesn't publish nutritional info?",
      a: "Recompass uses a proprietary Indian mess and institutional dining database. We calibrate typical mess hall recipes (oil usage, dal dilution, flour weights per roti, rice ladle volumes) into discrete units like rotis, paddles, and katoris so your estimates are accurate without needing a food scale."
    },
    {
      q: "Can I log my dorm room snacks and whey protein alongside mess food?",
      a: "Yes! Recompass includes a dedicated Dorm Pantry module. You can store your whey protein, oats, peanut butter, fruits, and milk, log them as custom staples, and have inventory deduct automatically when you consume them."
    },
    {
      q: "How does the Mess Timetable Scanner work?",
      a: "Simply take a picture of your hostel mess notice board or upload the PDF schedule. Gemini AI automatically parses each meal from Monday to Sunday, strips out useless quantity labels, and builds your daily interactive meal planner."
    },
    {
      q: "What is Compass AI?",
      a: "Compass AI is your personal sports nutritionist who knows your metabolic targets, dietary restrictions, and today's mess menu. You can chat with it in natural language, ask what to pick from today's counters, or upload a photo of your food plate for instant analysis."
    },
    {
      q: "Is Recompass free to use?",
      a: "Yes! Recompass was created by students, for students. You can sign up, scan your menu, and track your daily macros completely free."
    }
  ];

  return (
    <div className="min-h-screen bg-[#0a0b0e] text-white selection:bg-emerald-500/30 selection:text-emerald-300 font-sans antialiased overflow-x-hidden">
      
      {/* Ambient background glows */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[550px] bg-emerald-500/[0.045] blur-[160px] pointer-events-none rounded-full" />
      <div className="fixed top-1/3 -left-48 w-[550px] h-[550px] bg-teal-500/[0.03] blur-[170px] pointer-events-none rounded-full" />
      <div className="fixed bottom-10 -right-48 w-[650px] h-[650px] bg-cyan-500/[0.03] blur-[190px] pointer-events-none rounded-full" />

      {/* ── Top Navbar ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0a0b0e]/80 border-b border-white/[0.06] transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-white text-black flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.15)] group-hover:scale-105 transition-transform duration-200">
              <Compass className="w-4.5 h-4.5 stroke-[2.2]" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white font-sans">Recompass</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold tracking-wider uppercase">
                v2.0
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links (Clean, 100% relevant to page sections) */}
          <nav className="hidden md:flex items-center gap-8 text-[13px] font-medium text-white/60">
            <a href="#features" className="hover:text-white transition-colors py-1">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors py-1">How It Works</a>
            <a href="#faq" className="hover:text-white transition-colors py-1">FAQ</a>
          </nav>

          {/* Right CTAs */}
          <div className="hidden sm:flex items-center gap-3">
            <Link 
              to="/login" 
              className="text-xs font-semibold text-white/70 hover:text-white px-3.5 py-2 rounded-xl hover:bg-white/[0.04] transition-all"
            >
              Sign In
            </Link>
            <Link 
              to="/signup" 
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-black text-xs font-bold hover:bg-neutral-200 active:scale-[0.98] transition-all shadow-sm"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 sm:hidden">
            <Link 
              to="/login" 
              className="text-xs font-semibold text-white/70 hover:text-white px-2.5 py-1.5"
            >
              Sign In
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/80 hover:text-white transition-all"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>

        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-white/[0.06] bg-[#0a0b0e]/95 backdrop-blur-2xl px-4 py-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <nav className="flex flex-col space-y-2 text-sm font-medium text-white/70">
              <a 
                href="#features" 
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-xl hover:bg-white/[0.04] hover:text-white transition-colors"
              >
                Features
              </a>
              <a 
                href="#how-it-works" 
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-xl hover:bg-white/[0.04] hover:text-white transition-colors"
              >
                How It Works
              </a>
              <a 
                href="#faq" 
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-xl hover:bg-white/[0.04] hover:text-white transition-colors"
              >
                FAQ
              </a>
            </nav>
            <div className="pt-2 border-t border-white/[0.06] flex flex-col gap-2">
              <Link 
                to="/signup"
                className="w-full py-2.5 rounded-full bg-white text-black text-xs font-bold text-center hover:bg-neutral-200 transition-all shadow-sm"
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero Section ─────────────────────────────────────────── */}
      <section className="relative pt-16 sm:pt-24 pb-16 px-4 sm:px-6 max-w-5xl mx-auto text-center">
        
        {/* Pill Tagline */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-white/80 text-[11px] font-semibold tracking-wide backdrop-blur-md mb-6 animate-in fade-in duration-500 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-white/60">Campus Nutrition</span>
          <span className="text-white/30">•</span>
          <span className="text-emerald-400 font-semibold">Engineered for Hostel Living</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tightest leading-[1.08] text-white max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-3 duration-700">
          Master your macros. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
            Even when you don't cook.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-sm sm:text-base md:text-lg text-white/60 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
          Traditional fitness apps expect you to weigh raw chicken with a scale. Recompass is built for hostel students: log rotis in pieces, rice in mess paddles, and dal in katoris. Scan your hostel timetable and hit your daily protein goal effortlessly.
        </p>

        {/* Action Buttons (Clean & Normal) */}
        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto animate-in fade-in slide-in-from-bottom-5 duration-700 delay-300">
          <Link
            to="/signup"
            className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-white text-black font-bold text-sm hover:bg-neutral-200 active:scale-[0.98] transition-all shadow-xl shadow-white/10 flex items-center justify-center gap-2 group"
          >
            <span>Get Started Free</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link
            to="/login"
            className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white/80 hover:text-white font-semibold text-sm transition-all flex items-center justify-center"
          >
            Sign In to Account
          </Link>
        </div>

        {/* Highlights Bar */}
        <div className="mt-14 pt-8 border-t border-white/[0.06] grid grid-cols-2 md:grid-cols-4 gap-3.5 max-w-4xl mx-auto text-left">
          <div className="p-4 rounded-2xl bg-[#121418]/60 border border-white/[0.05] hover:border-white/[0.1] transition-all">
            <p className="text-emerald-400 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> Notice Board AI
            </p>
            <p className="text-white/50 text-[11px] mt-1.5 leading-relaxed">Parses photo/PDF mess timetables into daily meals</p>
          </div>
          <div className="p-4 rounded-2xl bg-[#121418]/60 border border-white/[0.05] hover:border-white/[0.1] transition-all">
            <p className="text-emerald-400 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
              <UtensilsCrossed className="w-3.5 h-3.5" /> Mess Portions
            </p>
            <p className="text-white/50 text-[11px] mt-1.5 leading-relaxed">Rotis, paddles, katoris & ladles without a food scale</p>
          </div>
          <div className="p-4 rounded-2xl bg-[#121418]/60 border border-white/[0.05] hover:border-white/[0.1] transition-all">
            <p className="text-emerald-400 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5" /> Plate AI Scanner
            </p>
            <p className="text-white/50 text-[11px] mt-1.5 leading-relaxed">Snap your hostel plate for instant macro breakdown</p>
          </div>
          <div className="p-4 rounded-2xl bg-[#121418]/60 border border-white/[0.05] hover:border-white/[0.1] transition-all">
            <p className="text-emerald-400 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5" /> Dorm Pantry
            </p>
            <p className="text-white/50 text-[11px] mt-1.5 leading-relaxed">Track whey protein, oats & peanut butter inventory</p>
          </div>
        </div>
      </section>

      {/* ── App Live Preview Mockup ──────────────────────────────── */}
      <section id="preview" className="scroll-mt-24 px-4 sm:px-6 max-w-5xl mx-auto my-12 sm:my-16">
        <div className="rounded-3xl bg-gradient-to-b from-[#14171d] via-[#101217] to-[#0a0b0e] border border-white/[0.08] p-4 sm:p-7 shadow-[0_20px_70px_-10px_rgba(0,0,0,0.8)] relative overflow-hidden">
          
          {/* Top Bar of Mockup */}
          <div className="flex flex-wrap items-center justify-between pb-5 border-b border-white/[0.06] gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 pr-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/40 border border-rose-500/50" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/40 border border-amber-500/50" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/40 border border-emerald-500/50" />
              </div>
              <div className="w-7 h-7 rounded-lg bg-white text-black flex items-center justify-center font-bold text-xs">
                R
              </div>
              <div>
                <p className="text-xs font-bold text-white">Daily Dashboard Preview</p>
                <p className="text-[11px] text-white/40">Target: Muscle Gain • 2,450 kcal • 140g Protein</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-semibold text-emerald-400">Live Campus Mess Sync</span>
            </div>
          </div>

          {/* Macro Progress Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-5">
            <div className="p-3.5 rounded-2xl bg-[#0a0b0e] border border-white/[0.06]">
              <div className="flex items-center justify-between text-xs text-white/50 mb-1">
                <span>Calories</span>
                <span className="text-orange-400 font-mono text-[11px]">82%</span>
              </div>
              <p className="text-lg font-extrabold text-white font-mono">2,010 <span className="text-xs text-white/40 font-normal">/ 2,450 kcal</span></p>
              <div className="w-full h-1.5 bg-white/10 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-orange-400 rounded-full" style={{ width: "82%" }} />
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#0a0b0e] border border-white/[0.06]">
              <div className="flex items-center justify-between text-xs text-white/50 mb-1">
                <span>Protein</span>
                <span className="text-emerald-400 font-mono text-[11px]">91%</span>
              </div>
              <p className="text-lg font-extrabold text-white font-mono">128 <span className="text-xs text-white/40 font-normal">/ 140g</span></p>
              <div className="w-full h-1.5 bg-white/10 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full" style={{ width: "91%" }} />
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#0a0b0e] border border-white/[0.06]">
              <div className="flex items-center justify-between text-xs text-white/50 mb-1">
                <span>Carbs</span>
                <span className="text-sky-400 font-mono text-[11px]">78%</span>
              </div>
              <p className="text-lg font-extrabold text-white font-mono">218 <span className="text-xs text-white/40 font-normal">/ 280g</span></p>
              <div className="w-full h-1.5 bg-white/10 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-sky-400 rounded-full" style={{ width: "78%" }} />
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#0a0b0e] border border-white/[0.06]">
              <div className="flex items-center justify-between text-xs text-white/50 mb-1">
                <span>Fats</span>
                <span className="text-purple-400 font-mono text-[11px]">75%</span>
              </div>
              <p className="text-lg font-extrabold text-white font-mono">49 <span className="text-xs text-white/40 font-normal">/ 65g</span></p>
              <div className="w-full h-1.5 bg-white/10 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-purple-400 rounded-full" style={{ width: "75%" }} />
              </div>
            </div>
          </div>

          {/* Logged Meal Example */}
          <div className="p-4 rounded-2xl bg-[#0a0b0e] border border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center">
                  <Sun className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <span className="text-xs font-bold text-white">Today's Hostel Lunch</span>
              </div>
              <span className="text-xs font-mono font-bold text-white">710 kcal • 28.5g Protein</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <p className="font-semibold text-white truncate">3 Rotis / Phulkas</p>
                <p className="text-[11px] text-white/40 font-mono">360 kcal • 10.5g P</p>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <p className="font-semibold text-white truncate">1 Paddle Jeera Rice</p>
                <p className="text-[11px] text-white/40 font-mono">200 kcal • 4g P</p>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <p className="font-semibold text-white truncate">1 Katori Dal Tadka</p>
                <p className="text-[11px] text-white/40 font-mono">150 kcal • 8g P</p>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <p className="font-semibold text-white truncate">1 Bowl Curd / Dahi</p>
                <p className="text-[11px] text-white/40 font-mono">100 kcal • 6g P</p>
              </div>
            </div>
          </div>

          {/* Compass AI Advice Banner */}
          <div className="mt-4 p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Compass className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-300">Compass AI Recommendation</p>
              <p className="text-xs text-white/70 mt-0.5 leading-relaxed">
                You're only <span className="font-bold text-white">12g protein</span> away from your daily goal. Tonight's mess dinner features Paneer Bhurji and Mixed Dal — having 2 katoris of Paneer Bhurji will close your protein ring with zero extra shakes required.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ── How It Works (Problem vs Solution) ───────────────────── */}
      <section id="how-it-works" className="scroll-mt-24 px-4 sm:px-6 max-w-5xl mx-auto py-16 sm:py-20 border-t border-white/[0.06]">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] font-bold tracking-widest uppercase text-emerald-400 mb-3">
            <span>How It Works</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">Why standard calorie trackers fail students</h2>
          <p className="text-white/50 text-xs sm:text-sm mt-3 leading-relaxed">
            Regular apps are built for people with their own kitchens and electronic scales. Here is how Recompass fixes the student reality.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Old Way */}
          <div className="p-6 sm:p-7 rounded-3xl bg-[#121418]/60 border border-rose-500/20 space-y-4 hover:border-rose-500/30 transition-all">
            <div className="flex items-center gap-2.5 text-rose-400 font-bold text-sm">
              <XCircle className="w-5 h-5 shrink-0" />
              <span>Standard Tracking Apps</span>
            </div>
            <ul className="space-y-3 text-xs sm:text-sm text-white/60">
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-bold">✕</span>
                <span>Demands exact grams of raw ingredients when you can't weigh mess hall food.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-bold">✕</span>
                <span>Forces you to search generic databases with 500 conflicting entries for "dal".</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-bold">✕</span>
                <span>Has zero awareness of your campus mess notice board timetable.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-bold">✕</span>
                <span>High friction leads students to stop tracking after just 4 days.</span>
              </li>
            </ul>
          </div>

          {/* Recompass Way */}
          <div className="p-6 sm:p-7 rounded-3xl bg-emerald-950/20 border border-emerald-500/30 space-y-4 shadow-[0_0_40px_-10px_rgba(16,185,129,0.1)] hover:border-emerald-500/40 transition-all">
            <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>The Recompass Experience</span>
            </div>
            <ul className="space-y-3 text-xs sm:text-sm text-white/70">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Portions in real mess units: rotis in pieces, rice in paddles, and dal in katoris.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>1-click notice board schedule scanner extracts the full week automatically.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Compass AI gives tactical meal recommendations based on today's real counters.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Effortless tracking that keeps students consistent across entire semesters.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── Feature Pillars Grid ─────────────────────────────────── */}
      <section id="features" className="scroll-mt-24 px-4 sm:px-6 max-w-5xl mx-auto py-16 sm:py-20 border-t border-white/[0.06]">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] font-bold tracking-widest uppercase text-emerald-400 mb-3">
            <span>Features</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">Everything you need to hit your fitness targets</h2>
          <p className="text-white/50 text-xs sm:text-sm mt-3 leading-relaxed">
            Built from the ground up for students who eat in mess halls, live in dorms, and want serious results.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          
          <div className="p-6 rounded-3xl bg-[#121418] border border-white/[0.06] hover:border-white/[0.14] transition-all space-y-3 group">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Notice Board Timetable Parser</h3>
            <p className="text-xs text-white/50 leading-relaxed">
              Upload a picture or PDF of your campus timetable. Gemini AI extracts breakfast, lunch, snacks, and dinner into an organized daily schedule.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#121418] border border-white/[0.06] hover:border-white/[0.14] transition-all space-y-3 group">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Zero-Scale Mess Calibration</h3>
            <p className="text-xs text-white/50 leading-relaxed">
              Count rotis, rice paddles, dal katoris, and eggs naturally. Calibrated nutrition values modeled specifically for institutional cooking.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#121418] border border-white/[0.06] hover:border-white/[0.14] transition-all space-y-3 group">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Compass AI Nutritionist</h3>
            <p className="text-xs text-white/50 leading-relaxed">
              An intelligent assistant in your pocket that knows your caloric burn, weight trend, and hostel food options to recommend optimal plate choices.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#121418] border border-white/[0.06] hover:border-white/[0.14] transition-all space-y-3 group">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
              <Camera className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Visual Plate AI Recognition</h3>
            <p className="text-xs text-white/50 leading-relaxed">
              In a hurry during lunch? Take a quick snapshot of your filled mess plate. Gemini Vision identifies dishes and logs them in seconds.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#121418] border border-white/[0.06] hover:border-white/[0.14] transition-all space-y-3 group">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 group-hover:scale-105 transition-transform">
              <Package className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Dorm Pantry & Smart Groceries</h3>
            <p className="text-xs text-white/50 leading-relaxed">
              Track your personal protein shakes, oats, peanut butter, and fruits. Deduct inventory automatically and generate grocery lists when low.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#121418] border border-white/[0.06] hover:border-white/[0.14] transition-all space-y-3 group">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 group-hover:scale-105 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Metabolic Weight Trends</h3>
            <p className="text-xs text-white/50 leading-relaxed">
              Log daily bodyweight and view smooth rolling averages, calorie expenditure trends, and weekly macronutrient adherence graphs.
            </p>
          </div>

        </div>
      </section>

      {/* ── FAQ Section ──────────────────────────────────────────── */}
      <section id="faq" className="scroll-mt-24 px-4 sm:px-6 max-w-3xl mx-auto py-16 sm:py-20 border-t border-white/[0.06]">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] font-bold tracking-widest uppercase text-emerald-400 mb-3">
            <span>FAQ</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-3">
          {faqs.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div 
                key={idx}
                className="rounded-2xl bg-[#121418] border border-white/[0.06] hover:border-white/[0.1] overflow-hidden transition-all"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 font-semibold text-xs sm:text-sm text-white"
                >
                  <span>{item.q}</span>
                  <ChevronDown className={`w-4 h-4 text-white/50 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180 text-emerald-400" : ""}`} />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs text-white/60 leading-relaxed border-t border-white/[0.04] pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Final Call to Action ─────────────────────────────────── */}
      <section className="px-4 sm:px-6 max-w-4xl mx-auto my-16 sm:my-20 text-center">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-[#14171d] via-[#101217] to-[#0a0b0e] border border-emerald-500/20 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/[0.06] rounded-full blur-[80px] pointer-events-none" />
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Stop guessing what you eat in the mess hall.
          </h2>
          <p className="mt-3 text-xs sm:text-sm text-white/60 max-w-lg mx-auto leading-relaxed">
            Join students hitting their daily macros and transforming their fitness without ever touching a kitchen scale.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/signup"
              className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-white text-black font-bold text-sm hover:bg-neutral-200 active:scale-[0.98] transition-all shadow-xl shadow-white/10 flex items-center justify-center gap-2 group"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white/80 hover:text-white font-semibold text-sm transition-all flex items-center justify-center"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] py-10 px-4 sm:px-6 text-center text-xs text-white/40">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-white text-black flex items-center justify-center font-bold text-xs">
              <Compass className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-white text-xs">Recompass</span>
            <span className="text-white/30">• Built for student fitness</span>
          </div>
          <p className="text-[11px] text-white/30">
            &copy; {new Date().getFullYear()} Recompass. All rights reserved.
          </p>
        </div>
      </footer>

    </div>
  );
}

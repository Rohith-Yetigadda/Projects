import { useState } from "react";
import { NavLink, useNavigate, Link } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { useAuth } from "@/contexts/AuthContext";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  Home,
  CalendarDays,
  BookOpen,
  Compass,
  ShoppingCart,
  ChefHat,
  Package,
  TrendingUp,
  User,
  LogOut,
  Menu,
  X,
} from "lucide-react";

const navItems = [
  { to: "/app",            label: "Home",       icon: Home },
  { to: "/app/week",       label: "This Week",  icon: CalendarDays },
  { to: "/app/log",        label: "Daily Log",  icon: BookOpen },
  { to: "/app/compass",    label: "Compass",    icon: Compass },
  { to: "/app/groceries",  label: "Groceries",  icon: ShoppingCart },
  { to: "/app/cook",       label: "Recipes",    icon: ChefHat },
  { to: "/app/pantry",     label: "Pantry",     icon: Package },
  { to: "/app/progress",   label: "Progress",   icon: TrendingUp },
  { to: "/app/profile",    label: "Profile",    icon: User },
];

export function Sidebar() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <aside className="hidden md:flex flex-col w-72 h-full border-r border-white/5 bg-black/40 backdrop-blur-3xl px-6 py-8 relative">
      <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent"></div>

      {/* Logo */}
      <div className="mb-10 px-2 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.3)]">
          <Compass className="w-5 h-5 text-black" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">RECOMPASS</h1>
        </div>
      </div>

      {/* User pill */}
      {userProfile && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl glass mb-8 group cursor-pointer hover:bg-white/5 transition-colors">
          <div className="w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white font-bold shadow-inner">
            {userProfile.name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate text-white">{userProfile.name}</p>
            <p className="text-xs text-muted-foreground capitalize font-medium">
              {userProfile.goal?.replace("_", " ") ?? "Set your goal"}
            </p>
          </div>
        </div>
      )}

      {/* Nav links */}
      <nav className="flex-1 space-y-1.5">
        <div className="px-3 text-xs font-bold tracking-wider text-muted-foreground uppercase mb-4 mt-2">Menu</div>
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/app"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                isActive
                  ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)] scale-[1.02]"
                  : "text-muted-foreground hover:text-white hover:bg-white/10"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Sign out */}
      <button
        onClick={() => setShowSignOutConfirm(true)}
        className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-muted-foreground hover:text-white hover:bg-white/10 transition-all duration-300 mt-auto"
      >
        <LogOut size={20} />
        Sign out
      </button>

      <ConfirmDialog
        open={showSignOutConfirm}
        title="Sign out?"
        description="You'll need to sign back in to access your nutrition data and meal plans."
        confirmLabel="Sign out"
        cancelLabel="Stay signed in"
        variant="danger"
        icon="logout"
        onConfirm={handleLogout}
        onCancel={() => setShowSignOutConfirm(false)}
      />
    </aside>
  );
}

// --- Mobile Bottom Nav -------------------------------------------
const mobileNav = [
  { to: "/app",           label: "Home",    icon: Home },
  { to: "/app/log",       label: "Log",     icon: BookOpen },
  { to: "/app/compass",   label: "Compass", icon: Compass },
  { to: "/app/progress",  label: "Stats",   icon: TrendingUp },
];

export function BottomNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { userProfile } = useAuth();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <>
      {/* Full Screen Menu Overlay */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-[80] bg-[#050505]/95 backdrop-blur-3xl animate-in fade-in slide-in-from-bottom-8 duration-300 flex flex-col p-6 pt-12 pb-32 overflow-y-auto">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xl border border-emerald-500/30">
              {userProfile?.name?.charAt(0) || "U"}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{userProfile?.name || "User"}</h2>
              <p className="text-sm text-white/50">{userProfile?.goal?.replace(/_/g, " ") || "Welcome"}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-y-8 gap-x-2">
            {navItems.map(item => (
              <NavLink key={item.to} to={item.to} onClick={() => setMenuOpen(false)} className={({isActive}) => `flex flex-col items-center gap-3 transition-transform active:scale-95 ${isActive ? 'text-white' : 'text-white/60 hover:text-white'}`}>
                {({isActive}) => (
                  <>
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors shadow-lg ${isActive ? 'bg-white text-black shadow-white/20' : 'bg-white/5 border border-white/10'}`}>
                      <item.icon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold text-center uppercase tracking-widest">{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>

          <div className="mt-auto pt-10">
            <button onClick={() => setShowSignOutConfirm(true)} className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-red-500/10 text-red-400 font-bold hover:bg-red-500/20 transition-colors">
              <LogOut className="w-5 h-5" /> Sign out
            </button>
          </div>
        </div>
      )}

      {/* Sign Out Confirm for Mobile Menu */}
      <ConfirmDialog
        open={showSignOutConfirm}
        title="Sign out?"
        description="You'll need to sign back in to access your nutrition data and meal plans."
        confirmLabel="Sign out"
        cancelLabel="Stay signed in"
        variant="danger"
        icon="logout"
        onConfirm={handleLogout}
        onCancel={() => setShowSignOutConfirm(false)}
      />

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[90] bg-[#050505] border-t border-white/10 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.8)]">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        <div className="flex items-center justify-around h-20 px-2 pb-2">
          {mobileNav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/app"}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1.5 flex-1 py-2 rounded-2xl transition-all duration-300 relative ${
                  isActive && !menuOpen ? "text-white" : "text-muted-foreground hover:text-white/70"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && !menuOpen && (
                    <div className="absolute top-0 w-8 h-1 bg-white rounded-b-full shadow-[0_0_10px_rgba(255,255,255,0.8)]"></div>
                  )}
                  <Icon className={`w-6 h-6 mb-1 transition-transform duration-300 ${isActive && !menuOpen ? "scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" : "scale-100"}`} />
                  <span className={`text-[10px] font-medium tracking-wide transition-all duration-300 ${isActive && !menuOpen ? "opacity-100" : "opacity-70"}`}>
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
          
          <button onClick={() => setMenuOpen(!menuOpen)} className={`flex flex-col items-center justify-center gap-1.5 flex-1 py-2 rounded-2xl transition-all duration-300 relative ${menuOpen ? 'text-white' : 'text-muted-foreground'}`}>
            {menuOpen && <div className="absolute top-0 w-8 h-1 bg-white rounded-b-full shadow-[0_0_10px_rgba(255,255,255,0.8)]"></div>}
            {menuOpen ? <X className="w-6 h-6 mb-1 transition-transform duration-300 scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" /> : <Menu className="w-6 h-6 mb-1 transition-transform duration-300 scale-100" />}
            <span className={`text-[10px] font-medium tracking-wide transition-all duration-300 ${menuOpen ? "opacity-100" : "opacity-70"}`}>Menu</span>
          </button>
        </div>
      </nav>
    </>
  );
}
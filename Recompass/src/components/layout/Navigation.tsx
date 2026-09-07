import { NavLink, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { useAuth } from "@/contexts/AuthContext";
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

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <aside className="hidden md:flex flex-col w-72 min-h-screen border-r border-white/5 bg-black/40 backdrop-blur-3xl px-6 py-8 relative">
      {/* Subtle border glow */}
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

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-muted-foreground hover:text-white hover:bg-white/10 transition-all duration-300 mt-auto"
      >
        <LogOut size={20} />
        Sign out
      </button>
    </aside>
  );
}

// ─── Mobile Bottom Nav ───────────────────────────────────────────
const mobileNav = [
  { to: "/app",           label: "Home",    icon: Home },
  { to: "/app/log",       label: "Log",     icon: BookOpen },
  { to: "/app/compass",   label: "Compass", icon: Compass },
  { to: "/app/groceries", label: "Shop",    icon: ShoppingCart },
  { to: "/app/progress",  label: "Progress",icon: TrendingUp },
];

export function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t-0 border-white/10 pb-safe">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
      <div className="flex items-center justify-around h-20 px-2 pb-2">
        {mobileNav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/app"}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1.5 flex-1 py-2 rounded-2xl transition-all duration-300 relative ${
                isActive ? "text-white" : "text-muted-foreground hover:text-white/70"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute top-0 w-8 h-1 bg-white rounded-b-full shadow-[0_0_10px_rgba(255,255,255,0.8)]"></div>
                )}
                <div className={`p-2 rounded-xl transition-all duration-300 ${isActive ? "bg-white/10 scale-110" : ""}`}>
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className="text-[11px] font-bold tracking-wide">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

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
    <aside className="hidden md:flex flex-col w-64 min-h-screen border-r border-border/40 bg-card/50 backdrop-blur-sm px-4 py-6">
      {/* Logo */}
      <div className="mb-8 px-2">
        <h1 className="text-xl font-extrabold tracking-tight text-primary">RECOMPASS</h1>
        <p className="text-xs text-muted-foreground mt-0.5">AI Nutrition OS</p>
      </div>

      {/* User pill */}
      {userProfile && (
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-secondary/50 mb-6">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
            {userProfile.name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{userProfile.name}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {userProfile.goal?.replace("_", " ") ?? "No goal set"}
            </p>
          </div>
        </div>
      )}

      {/* Nav links */}
      <nav className="flex-1 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/app"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-150 mt-4"
      >
        <LogOut size={18} />
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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-card/80 backdrop-blur-md">
      <div className="flex items-center justify-around h-16 px-2">
        {mobileNav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/app"}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 flex-1 py-2 rounded-xl transition-all duration-150 ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`p-1.5 rounded-lg transition-all ${isActive ? "bg-primary/15" : ""}`}>
                  <Icon size={20} />
                </div>
                <span className="text-[10px] font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

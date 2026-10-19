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
  Package,
  ChefHat,
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
  { to: "/app/pantry",     label: "Pantry",      icon: Package },
  { to: "/app/cook",       label: "Cook AI",    icon: ChefHat },
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
    <aside className="hidden lg:flex flex-col w-64 h-full border-r border-white/[0.06] bg-[#0c0e12]/95 backdrop-blur-2xl px-4 py-6 relative z-30 select-none">
      {/* Brand Header */}
      <div className="mb-8 px-2 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-black shadow-sm">
          <Compass className="w-4 h-4 stroke-[2.2]" />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight text-white font-sans">RECOMPASS</h1>
          <p className="text-[10px] font-semibold text-white/35 tracking-wider uppercase">Health & Macros</p>
        </div>
      </div>

      {/* User Card */}
      {userProfile && (
        <Link
          to="/app/profile"
          className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] mb-6 hover:bg-white/[0.06] hover:border-white/10 transition-all duration-200 group"
        >
          <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-white text-xs font-bold">
            {userProfile.name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold truncate text-white group-hover:text-white/90">{userProfile.name}</p>
            <p className="text-[10px] text-white/40 capitalize font-medium truncate">
              {userProfile.goal?.replace(/_/g, " ") ?? "Set your goal"}
            </p>
          </div>
        </Link>
      )}

      {/* Nav Links */}
      <nav className="flex-1 space-y-1">
        <div className="px-3 text-[10px] font-bold tracking-widest text-white/30 uppercase mb-2">Menu</div>
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/app"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                isActive
                  ? "bg-white text-black shadow-sm"
                  : "text-white/50 hover:text-white hover:bg-white/[0.05]"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={17} strokeWidth={isActive ? 2.3 : 1.8} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Sign Out */}
      <button
        onClick={() => setShowSignOutConfirm(true)}
        className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-white/40 border border-transparent hover:border-rose-500/30 hover:text-rose-400 hover:bg-rose-500/[0.08] transition-all duration-200 mt-auto"
      >
        <LogOut size={16} />
        <span>Sign out</span>
      </button>

      <ConfirmDialog
        open={showSignOutConfirm}
        title="Sign out?"
        description="You'll need to sign back in to access your nutrition data and meal plans."
        confirmLabel="Sign out"
        cancelLabel="Cancel"
        variant="danger"
        icon="logout"
        onConfirm={handleLogout}
        onCancel={() => setShowSignOutConfirm(false)}
      />
    </aside>
  );
}

// --- Mobile Navigation -------------------------------------------
const mobileNav = [
  { to: "/app",          label: "Home",     icon: Home },
  { to: "/app/log",      label: "Log",      icon: BookOpen },
  { to: "/app/compass",  label: "Compass",  icon: Compass },
  { to: "/app/week",     label: "Menu",     icon: CalendarDays },
  { to: "/app/progress", label: "Trends",   icon: TrendingUp },
];

export function MobileHeader() {
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
      <header className="lg:hidden flex items-center justify-between min-h-14 h-[calc(3.5rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] px-4 bg-[#0a0b0e]/90 backdrop-blur-xl border-b border-white/[0.06] shrink-0 z-40 sticky top-0">
        <button
          onClick={() => setMenuOpen(true)}
          className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/70 hover:text-white transition-colors"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="font-bold text-sm tracking-tight flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center shadow-sm">
            <Compass className="w-3.5 h-3.5 text-black stroke-[2.2]" />
          </div>
          <span className="text-white font-sans">RECOMPASS</span>
        </div>

        <Link
          to="/app/profile"
          className="w-8 h-8 flex items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.05] text-white/80 hover:border-white/20 transition-colors"
        >
          <User className="w-4 h-4" />
        </Link>
      </header>

      {/* Side Drawer Menu Overlay */}
      <div className={`lg:hidden fixed inset-0 z-[100] flex justify-start transition-all duration-300 ${menuOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
        <div 
          className={`absolute inset-0 bg-black/70 backdrop-blur-md transition-opacity duration-300 ${menuOpen ? "opacity-100" : "opacity-0"}`} 
          onClick={() => setMenuOpen(false)} 
        />
        
        <div className={`relative w-72 h-full bg-[#0c0e12] border-r border-white/[0.08] shadow-2xl transition-transform duration-300 flex flex-col pb-safe ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="p-5 border-b border-white/[0.06] flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-white font-bold text-sm">
                {userProfile?.name?.charAt(0) || "U"}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-bold text-white truncate">{userProfile?.name || "User"}</h2>
                <p className="text-[11px] text-white/40 capitalize truncate">{userProfile?.goal?.replace(/_/g, " ") || "Health"}</p>
              </div>
            </div>
            <button
              onClick={() => setMenuOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/[0.05] text-white/50 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
            {navItems.map(item => (
              <NavLink 
                key={item.to} 
                to={item.to} 
                end={item.to === "/app"}
                onClick={() => setMenuOpen(false)} 
                className={({isActive}) =>
                  `flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold transition-all ${
                    isActive ? "bg-white text-black shadow-sm font-bold" : "text-white/60 hover:text-white hover:bg-white/[0.04]"
                  }`
                }
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>

          <div className="p-4 border-t border-white/[0.06]">
            <button
              onClick={() => setShowSignOutConfirm(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 font-semibold text-xs hover:bg-rose-500/20 transition-colors"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showSignOutConfirm}
        title="Sign out?"
        description="You'll need to sign back in to access your nutrition data and meal plans."
        confirmLabel="Sign out"
        cancelLabel="Cancel"
        variant="danger"
        icon="logout"
        onConfirm={handleLogout}
        onCancel={() => setShowSignOutConfirm(false)}
      />
    </>
  );
}

export function BottomNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-[#0c0e12]/95 backdrop-blur-2xl border-t border-white/[0.08] px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-2xl">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {mobileNav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/app"}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-xl transition-all duration-200 relative select-none ${
                isActive ? "text-white" : "text-white/40 hover:text-white/70"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`p-1 rounded-xl transition-all ${isActive ? "bg-white/10" : ""}`}>
                  <Icon className="w-4 h-4 stroke-[2]" />
                </div>
                <span className={`text-[10px] tracking-tight font-medium ${isActive ? "text-white font-bold" : "text-white/40"}`}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

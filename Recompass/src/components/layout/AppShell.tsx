import { type ReactNode } from "react";
import { Sidebar, BottomNav, MobileHeader } from "./Navigation";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-[100dvh] bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-full relative">
        <MobileHeader />
        <div id="main-scroll-container" className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="px-3.5 sm:px-4 md:px-6 py-3.5 md:py-6 pb-28 lg:pb-6 w-full max-w-full">
            {children}
          </div>
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <BottomNav />
    </div>
  );
}

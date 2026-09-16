import { type ReactNode } from "react";
import { Sidebar, BottomNav } from "./Navigation";

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
        <div id="main-scroll-container" className="flex-1 p-4 md:p-6 pb-24 md:pb-6 overflow-y-auto">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <BottomNav />
    </div>
  );
}

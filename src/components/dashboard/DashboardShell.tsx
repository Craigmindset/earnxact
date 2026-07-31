"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardFooter from "@/components/dashboard/DashboardFooter";

const COLLAPSE_STORAGE_KEY = "earnxact-dashboard-sidebar-collapsed";

export default function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(COLLAPSE_STORAGE_KEY);
    if (stored) setCollapsed(stored === "true");
  }, []);

  useEffect(() => {
    window.localStorage.setItem(COLLAPSE_STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--brand-black)] text-white">
      <DashboardHeader onToggleMobileSidebar={() => setMobileOpen((v) => !v)} />

      <div className="flex flex-1">
        {mobileOpen && (
          <button
            type="button"
            aria-label="Close menu overlay"
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-30 bg-black/60 md:hidden"
          />
        )}

        <DashboardSidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((v) => !v)}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />

        <main className="min-w-0 flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>

      <DashboardFooter />
    </div>
  );
}

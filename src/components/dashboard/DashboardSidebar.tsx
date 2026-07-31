"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import type { IconType } from "react-icons";
import { MdBolt, MdChevronLeft, MdChevronRight, MdOutlinePayments } from "react-icons/md";
import { FiX } from "react-icons/fi";
import {
  CASHOUT_NAV_ITEMS,
  CASHOUT_ONLY_ROUTES,
  EARN_NAV_ITEMS,
  type DashboardNavItem
} from "@/components/dashboard/nav-data";

type SidebarTab = "earn" | "cashout";

type DashboardSidebarProps = {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
};

function TabButton({
  active,
  icon: Icon,
  label,
  collapsed,
  onClick
}: {
  active: boolean;
  icon: IconType;
  label: string;
  collapsed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-pressed={active}
      className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-2 py-2 text-sm font-medium transition ${
        active
          ? "bg-[var(--brand-gold)] text-black"
          : "text-white/70 hover:bg-white/10 hover:text-white"
      }`}
    >
      <Icon className="text-lg shrink-0" />
      {!collapsed && <span>{label}</span>}
    </button>
  );
}

function NavLink({
  item,
  active,
  collapsed,
  onNavigate
}: {
  item: DashboardNavItem;
  active: boolean;
  collapsed: boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
        collapsed ? "justify-center" : ""
      } ${
        active
          ? "bg-[var(--brand-gold)]/10 font-semibold text-[var(--brand-gold)]"
          : "text-white/70 hover:bg-white/5 hover:text-white"
      }`}
    >
      <Icon className="text-lg shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}

export default function DashboardSidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const [tab, setTab] = useState<SidebarTab>(() =>
    CASHOUT_ONLY_ROUTES.has(pathname) ? "cashout" : "earn"
  );

  const items = useMemo(
    () => (tab === "earn" ? EARN_NAV_ITEMS : CASHOUT_NAV_ITEMS),
    [tab]
  );

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-white/10 bg-[var(--brand-card-1)] transition-transform duration-300 ease-out md:static md:z-auto md:h-[calc(100vh-4rem)] md:translate-x-0 md:sticky md:top-16 md:bg-[var(--brand-card-1)]/70 md:backdrop-blur ${
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      } ${collapsed ? "md:w-20" : "md:w-64"}`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/10 p-4">
        {!collapsed && (
          <span className="text-sm font-semibold tracking-wide text-white">
            <span className="text-white">Earn</span>
            <span className="text-[var(--brand-gold)]">Xact</span>
          </span>
        )}

        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white md:inline-flex"
        >
          {collapsed ? (
            <MdChevronRight className="text-lg" />
          ) : (
            <MdChevronLeft className="text-lg" />
          )}
        </button>

        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close menu"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white md:hidden"
        >
          <FiX className="text-lg" />
        </button>
      </div>

      <div className="flex gap-1 border-b border-white/10 p-3">
        <TabButton
          active={tab === "earn"}
          icon={MdBolt}
          label="Earn"
          collapsed={collapsed}
          onClick={() => setTab("earn")}
        />
        <TabButton
          active={tab === "cashout"}
          icon={MdOutlinePayments}
          label="Cashout"
          collapsed={collapsed}
          onClick={() => setTab("cashout")}
        />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => (
          <NavLink
            key={`${tab}-${item.href}`}
            item={item}
            active={pathname === item.href}
            collapsed={collapsed}
            onNavigate={onCloseMobile}
          />
        ))}
      </nav>
    </aside>
  );
}

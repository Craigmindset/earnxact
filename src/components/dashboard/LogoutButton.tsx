"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MdLogout } from "react-icons/md";
import { createClient } from "@/lib/supabase/client";

type LogoutButtonProps = {
  collapsed?: boolean;
  variant?: "sidebar" | "icon";
  className?: string;
};

export default function LogoutButton({
  collapsed = false,
  variant = "sidebar",
  className = ""
}: LogoutButtonProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      // Clear the session server-side first (revokes the refresh token and
      // clears the httpOnly auth cookies used by middleware).
      await fetch("/api/auth/logout", { method: "POST" });

      // Also clear the client's local Supabase auth state.
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.error("[Logout] Failed to sign out", err);
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        aria-label="Log out"
        title="Log out"
        className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/80 transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50 ${className}`}
      >
        <MdLogout className="text-lg" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loggingOut}
      title="Log out"
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/70 transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50 md:py-3 ${
        collapsed ? "justify-center" : ""
      } ${className}`}
    >
      <MdLogout className="shrink-0 text-lg" />
      {!collapsed && <span>{loggingOut ? "Logging out..." : "Log out"}</span>}
    </button>
  );
}

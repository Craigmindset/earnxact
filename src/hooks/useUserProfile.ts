"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { AccountType } from "@/lib/database.types";

export type UserProfileState = {
  userId: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  avatarUrl: string | null;
  walletBalance: number;
  accountType: AccountType | null;
  /** FK → membership_plans.id - the user's currently active plan, if any. */
  membershipPlanId: string | null;
  /** Denormalized membership_plans.name for the current plan (via join). */
  membershipPlanName: string | null;
  loading: boolean;
};

const INITIAL_STATE: UserProfileState = {
  userId: null,
  firstName: null,
  lastName: null,
  email: null,
  avatarUrl: null,
  walletBalance: 0,
  accountType: null,
  membershipPlanId: null,
  membershipPlanName: null,
  loading: true
};

/**
 * Loads the signed-in user's profile (name, email, avatar, wallet balance)
 * from Supabase, subscribes to realtime updates on public.user_profile (so
 * e.g. a referral claim reflects in the wallet balance immediately without a
 * page refresh), and exposes a helper to upload a new profile photo via
 * /api/profile/avatar.
 */
export function useUserProfile() {
  const [state, setState] = useState<UserProfileState>(INITIAL_STATE);
  // Some pages mount their own useUserProfile() instance (e.g. the wallet
  // balance stat card on /dashboard) that only exists while that route is
  // active. If wallet_balance changes while that instance is unmounted
  // (e.g. a withdrawal initiated from /dashboard/wallet), it can miss the
  // realtime UPDATE event and show a stale value once the user navigates
  // back. Re-running refresh() whenever the pathname changes guarantees
  // every instance re-fetches the current balance on every navigation, so
  // all pages always agree with the database.
  const pathname = usePathname();
  // useUserProfile() is called from several components at once (header,
  // profile menu, wallet page, dashboard stat card, ...). Supabase's
  // realtime client reuses/dedupes channels that share the same topic
  // name, so a second hook instance calling .channel() with an identical
  // name would try to add listeners to a channel the first instance
  // already subscribed - throwing "cannot add postgres_changes callbacks
  // ... after subscribe()". A per-instance suffix keeps every hook
  // instance's channel independent.
  const instanceIdRef = useRef<string>(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)
  );
  // Read inside the postgres_changes callback below, which is only
  // re-created when userId changes - a plain closure over state would see
  // a stale membershipPlanId from whenever the subscription was set up.
  const membershipPlanIdRef = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      setState({ ...INITIAL_STATE, loading: false });
      return;
    }

    const { data: profile } = await supabase
      .from("user_profile")
      .select(
        "first_name, last_name, email, avatar_url, wallet_balance, account_type, membership_plan_id, membership_plans(name)"
      )
      .eq("user_id", user.id)
      .single();

    const plan = profile?.membership_plans as { name: string } | { name: string }[] | null;
    const planName = Array.isArray(plan) ? plan[0]?.name ?? null : plan?.name ?? null;

    setState({
      userId: user.id,
      firstName: profile?.first_name ?? null,
      lastName: profile?.last_name ?? null,
      email: profile?.email ?? user.email ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      walletBalance: Number(profile?.wallet_balance ?? 0),
      accountType: profile?.account_type ?? null,
      membershipPlanId: profile?.membership_plan_id ?? null,
      membershipPlanName: planName,
      loading: false
    });
    membershipPlanIdRef.current = profile?.membership_plan_id ?? null;
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, pathname]);

  // Live updates: whenever user_profile changes (e.g. wallet_balance is
  // credited by a referral claim), push the new values straight into the UI.
  useEffect(() => {
    if (!state.userId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`user_profile_${state.userId}_${instanceIdRef.current}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user_profile",
          filter: `user_id=eq.${state.userId}`
        },
        (payload) => {
          const row = payload.new as {
            first_name: string | null;
            last_name: string | null;
            email: string | null;
            avatar_url: string | null;
            wallet_balance: number;
            account_type: AccountType;
            membership_plan_id: string | null;
          };
          setState((prev) => ({
            ...prev,
            firstName: row.first_name,
            lastName: row.last_name,
            email: row.email ?? prev.email,
            avatarUrl: row.avatar_url,
            walletBalance: Number(row.wallet_balance),
            accountType: row.account_type ?? prev.accountType,
            membershipPlanId: row.membership_plan_id
          }));

          // The realtime payload has no way to embed the joined plan name -
          // only re-fetch (which does the join) when the plan actually changed
          // (e.g. right after a Paystack upgrade), not on every wallet_balance tick.
          if (row.membership_plan_id !== membershipPlanIdRef.current) {
            membershipPlanIdRef.current = row.membership_plan_id;
            refresh();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [state.userId]);

  const uploadAvatar = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/profile/avatar", {
      method: "POST",
      body: formData
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || "Failed to upload profile image");
    }

    setState((prev) => ({ ...prev, avatarUrl: data.avatarUrl }));
    return data.avatarUrl as string;
  }, []);

  return { ...state, refresh, uploadAvatar };
}

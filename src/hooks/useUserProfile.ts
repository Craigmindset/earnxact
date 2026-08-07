"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type UserProfileState = {
  userId: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  avatarUrl: string | null;
  walletBalance: number;
  loading: boolean;
};

const INITIAL_STATE: UserProfileState = {
  userId: null,
  firstName: null,
  lastName: null,
  email: null,
  avatarUrl: null,
  walletBalance: 0,
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
      .select("first_name, last_name, email, avatar_url, wallet_balance")
      .eq("user_id", user.id)
      .single();

    setState({
      userId: user.id,
      firstName: profile?.first_name ?? null,
      lastName: profile?.last_name ?? null,
      email: profile?.email ?? user.email ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      walletBalance: Number(profile?.wallet_balance ?? 0),
      loading: false
    });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

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
          };
          setState((prev) => ({
            ...prev,
            firstName: row.first_name,
            lastName: row.last_name,
            email: row.email ?? prev.email,
            avatarUrl: row.avatar_url,
            walletBalance: Number(row.wallet_balance)
          }));
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

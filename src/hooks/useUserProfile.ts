"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type UserProfileState = {
  userId: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  avatarUrl: string | null;
  loading: boolean;
};

const INITIAL_STATE: UserProfileState = {
  userId: null,
  firstName: null,
  lastName: null,
  email: null,
  avatarUrl: null,
  loading: true
};

/**
 * Loads the signed-in user's profile (name, email, avatar) from Supabase and
 * exposes a helper to upload a new profile photo via /api/profile/avatar.
 */
export function useUserProfile() {
  const [state, setState] = useState<UserProfileState>(INITIAL_STATE);

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
      .select("first_name, last_name, email, avatar_url")
      .eq("user_id", user.id)
      .single();

    setState({
      userId: user.id,
      firstName: profile?.first_name ?? null,
      lastName: profile?.last_name ?? null,
      email: profile?.email ?? user.email ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      loading: false
    });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

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

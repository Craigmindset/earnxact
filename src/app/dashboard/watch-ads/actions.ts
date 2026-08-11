// src/app/dashboard/watch-ads/actions.ts

"use server";

import { createClient } from "@/lib/supabase/server";

export type ClaimAdRewardResult =
  | { success: true; rewardType: "cash" | "points"; rewardAmount: number }
  | { success: false; error: string };

export async function claimAdReward(adId: string): Promise<ClaimAdRewardResult> {
  const supabase = await createClient();

  // ✅ FIX: Use type assertion to bypass TypeScript's strict typing
  const { data, error } = await (supabase.rpc as any)('claim_ad_reward', { p_ad_id: adId });

  if (error) {
    console.error("[claimAdReward] RPC error:", error.message);
    return { success: false, error: "Database error occurred" };
  }

  const result = data as {
    success: boolean;
    error?: string;
    reward_type?: string;
    reward_amount?: number;
  };

  if (!result.success) {
    return { success: false, error: result.error ?? "Unexpected error" };
  }

  return {
    success: true,
    rewardType: result.reward_type as "cash" | "points",
    rewardAmount: result.reward_amount ?? 0,
  };
}
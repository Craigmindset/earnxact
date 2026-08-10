"use server";

import { createClient } from "@/lib/supabase/server";

export type ClaimAdRewardResult =
  | { success: true; rewardType: "cash" | "points"; rewardAmount: number }
  | { success: false; error: string };

export async function claimAdReward(adId: string): Promise<ClaimAdRewardResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("claim_ad_reward", {
    p_ad_id: adId,
  });

  if (error) {
    console.error("[claimAdReward]", error.message);
    return { success: false, error: "unexpected" };
  }

  const result = data as {
    success: boolean;
    error?: string;
    reward_type?: string;
    reward_amount?: number;
  };

  if (!result.success) {
    return { success: false, error: result.error ?? "unexpected" };
  }

  return {
    success: true,
    rewardType: result.reward_type as "cash" | "points",
    rewardAmount: result.reward_amount!,
  };
}

"use server";

import { DAILY_VIDEO_COUNT } from "@/lib/earnings";
import { createClient } from "@/lib/supabase/server";
import { getNigeriaDateString } from "@/lib/time";

type MembershipPlanRelation = { amount?: number } | { amount?: number }[] | null;

export type WatchAdsDailyState = {
  success: boolean;
  message?: string;
  dailyCount: number;
  dailyLimit: number;
  watchedVideoIds: string[];
  membershipPlanAmount: number;
};

export type RecordVideoWatchActionResult = WatchAdsDailyState & {
  reward?: number;
};

type RecordVideoWatchRpcResult = {
  success: boolean;
  message: string;
  reward?: number;
  watch_count?: number;
};

function getPlanAmountFromProfile(profile: { membership_plans?: MembershipPlanRelation } | null) {
  const planRelation = profile?.membership_plans;
  return Array.isArray(planRelation)
    ? Number(planRelation[0]?.amount ?? 0)
    : Number(planRelation?.amount ?? 0);
}

export async function getWatchAdsDailyStateAction(): Promise<WatchAdsDailyState> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      success: false,
      message: "Not authenticated",
      dailyCount: 0,
      dailyLimit: DAILY_VIDEO_COUNT,
      watchedVideoIds: [],
      membershipPlanAmount: 0,
    };
  }

  const today = getNigeriaDateString();
  const [{ data: profile, error: profileError }, { data: history, error: historyError }] = await Promise.all([
    supabase
      .from("user_profile")
      .select("membership_plans(amount)")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("watch_ads_history")
      .select("video_id")
      .eq("user_id", user.id)
      .eq("date", today),
  ]);

  if (profileError || historyError) {
    return {
      success: false,
      message: profileError?.message ?? historyError?.message ?? "Failed to load watch status",
      dailyCount: 0,
      dailyLimit: DAILY_VIDEO_COUNT,
      watchedVideoIds: [],
      membershipPlanAmount: 0,
    };
  }

  const watchedVideoIds = (history ?? []).map((item) => item.video_id);

  return {
    success: true,
    dailyCount: watchedVideoIds.length,
    dailyLimit: DAILY_VIDEO_COUNT,
    watchedVideoIds,
    membershipPlanAmount: getPlanAmountFromProfile(profile as { membership_plans?: MembershipPlanRelation } | null),
  };
}

export async function recordVideoWatchAction(videoId: string): Promise<RecordVideoWatchActionResult> {
  if (!videoId) {
    return {
      success: false,
      message: "Invalid video",
      dailyCount: 0,
      dailyLimit: DAILY_VIDEO_COUNT,
      watchedVideoIds: [],
      membershipPlanAmount: 0,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("record_video_watch", {
    p_video_id: videoId,
  });

  if (error) {
    return {
      success: false,
      message: error.message,
      dailyCount: 0,
      dailyLimit: DAILY_VIDEO_COUNT,
      watchedVideoIds: [],
      membershipPlanAmount: 0,
    };
  }

  const result = data as RecordVideoWatchRpcResult | null;
  const nextState = await getWatchAdsDailyStateAction();

  return {
    ...nextState,
    success: result?.success ?? false,
    message: result?.message ?? nextState.message,
    reward: result?.reward,
  };
}
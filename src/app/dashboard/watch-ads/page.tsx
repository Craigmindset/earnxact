 // src/app/dashboard/watch-ads/page.tsx

import { createClient } from "@/lib/supabase/server";
import WatchAdsClient from "./WatchAdsClient";

// Define the view type
type AdView = {
  ad_id: string;
  reward_type: string;
  reward_amount: number;
};

export default async function WatchAdsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const todayUTC = new Date();
  todayUTC.setUTCHours(0, 0, 0, 0);

  // ✅ FIX: Properly typed variables
  let ads: any[] = [];
  let viewsToday: AdView[] = [];
  let profile: { task_class_id: string } | null = null;

  if (user) {
    // User is authenticated - fetch data
    const [adsResult, viewsResult, profileResult] = await Promise.all([
      supabase
        .from("ads")
        .select("*")
        .eq("is_active", true)
        .order("created_at"),
      supabase
        .from("ad_views")
        .select("ad_id, reward_type, reward_amount")
        .eq("user_id", user.id)
        .gte("viewed_at", todayUTC.toISOString()),
      supabase
        .from("users")
        .select("task_class_id")
        .eq("id", user.id)
        .single(),
    ]);

    ads = adsResult.data ?? [];
    viewsToday = (viewsResult.data as AdView[]) ?? [];
    profile = profileResult.data as { task_class_id: string } | null;
  }

  const viewedAdIds = viewsToday.map((v) => v.ad_id);
  const todayEarned =
    viewsToday
      .filter((v) => v.reward_type === "cash")
      .reduce((sum, v) => sum + Number(v.reward_amount), 0);
  const todayPoints =
    viewsToday
      .filter((v) => v.reward_type === "points")
      .reduce((sum, v) => sum + Number(v.reward_amount), 0);

  return (
    <WatchAdsClient
      ads={ads ?? []}
      viewedAdIds={viewedAdIds}
      taskClassId={profile?.task_class_id ?? null}
      todayEarned={todayEarned}
      todayPoints={Math.round(todayPoints)}
    />
  );
}
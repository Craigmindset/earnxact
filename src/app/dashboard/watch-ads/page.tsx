import { createClient } from "@/lib/supabase/server";
import WatchAdsClient from "./WatchAdsClient";

export default async function WatchAdsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const todayUTC = new Date();
  todayUTC.setUTCHours(0, 0, 0, 0);

  // Skip DB queries when there's no session — render with empty state
  const [{ data: ads }, { data: viewsToday }, { data: profile }] = user
    ? await Promise.all([
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
      ])
    : [{ data: null }, { data: null }, { data: null }];

  const viewedAdIds = viewsToday?.map((v) => v.ad_id) ?? [];
  const todayEarned =
    viewsToday
      ?.filter((v) => v.reward_type === "cash")
      .reduce((sum, v) => sum + Number(v.reward_amount), 0) ?? 0;
  const todayPoints =
    viewsToday
      ?.filter((v) => v.reward_type === "points")
      .reduce((sum, v) => sum + Number(v.reward_amount), 0) ?? 0;

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

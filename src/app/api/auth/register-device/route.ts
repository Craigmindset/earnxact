import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Best-effort client IP lookup. Trusts the platform's edge proxy
// (e.g. Vercel) to set x-forwarded-for; not used for anything security
// critical — only to register/flag a device, never to block login.
async function getClientIp() {
  const headersList = await headers();
  const forwardedFor = headersList.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }
  return headersList.get("x-real-ip") ?? "unknown";
}

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const clientIp = await getClientIp();

  const { data: profile, error: profileError } = await supabase
    .from("user_profile")
    .select("registered_device_id")
    .eq("user_id", user.id)
    .single();

  if (profileError) {
    console.error("[Device] Failed to read user_profile", profileError);
    return NextResponse.json({ error: "Failed to check device" }, { status: 500 });
  }

  if (!profile?.registered_device_id) {
    const { error: updateError } = await supabase
      .from("user_profile")
      .update({ registered_device_id: clientIp })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("[Device] Failed to register device", updateError);
      return NextResponse.json({ error: "Failed to register device" }, { status: 500 });
    }

    return NextResponse.json({ status: "registered", deviceId: clientIp });
  }

  if (profile.registered_device_id !== clientIp) {
    console.warn(
      `[Device] User ${user.id} logged in from a new device/IP (${clientIp}); registered device is ${profile.registered_device_id}`
    );
    return NextResponse.json({ status: "new_device", deviceId: clientIp });
  }

  return NextResponse.json({ status: "matched", deviceId: clientIp });
}

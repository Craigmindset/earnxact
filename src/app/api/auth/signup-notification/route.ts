import { NextResponse } from "next/server";
import { sendNewUserSignupAlert } from "@/lib/resend";
import { createAdminClient } from "@/lib/supabase/admin";

type SignupNotificationBody = {
  userId?: string;
  email?: string;
};

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request
    .json()
    .catch(() => null)) as SignupNotificationBody | null;
  const userId = body?.userId?.trim() ?? "";
  const normalizedEmail = body?.email?.trim().toLowerCase() ?? "";

  if (!userId || !normalizedEmail) {
    return NextResponse.json(
      { error: "User ID and email are required." },
      { status: 400 },
    );
  }

  try {
    const supabase = createAdminClient();
    const { data: profile, error } = await supabase
      .from("user_profile")
      .select("email, first_name, last_name, phone_num, created_at")
      .eq("user_id", userId)
      .eq("email", normalizedEmail)
      .single();

    if (error || !profile) {
      console.error(
        "[Signup Notification] Unable to verify new user profile",
        error,
      );
      return NextResponse.json(
        { error: "Unable to verify new user profile." },
        { status: 404 },
      );
    }

    await sendNewUserSignupAlert({
      email: profile.email,
      firstName: profile.first_name,
      lastName: profile.last_name,
      phoneNumber: profile.phone_num,
      registeredAt: profile.created_at,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Signup Notification] Failed to send admin alert", error);
    return NextResponse.json({ success: false }, { status: 200 });
  }
}

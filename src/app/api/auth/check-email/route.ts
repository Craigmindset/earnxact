import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type CheckEmailBody = {
  email?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as CheckEmailBody | null;
  const normalizedEmail = body?.email?.trim().toLowerCase() ?? "";

  if (!normalizedEmail) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("user_profile")
      .select("user_id")
      .ilike("email", normalizedEmail)
      .limit(1);

    if (error) {
      console.error("[Auth] Failed to check email existence", error);
      return NextResponse.json({ error: "Unable to verify email right now" }, { status: 500 });
    }

    return NextResponse.json({ exists: Array.isArray(data) && data.length > 0 });
  } catch (error) {
    console.error("[Auth] Unexpected email existence check error", error);
    return NextResponse.json({ error: "Unable to verify email right now" }, { status: 500 });
  }
}
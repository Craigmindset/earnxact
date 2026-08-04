import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Signs the current user out server-side: revokes the Supabase session and
 * clears the auth cookies via the server Supabase client. The client should
 * still call `supabase.auth.signOut()` locally as well so any in-memory
 * client state is cleared immediately, then redirect to /login.
 */
export async function POST() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("[Logout] Supabase signOut error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

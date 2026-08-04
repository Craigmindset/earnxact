import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

/**
 * Supabase client for use in Client Components ("use client").
 * Reads the public URL/anon key from env vars — safe to expose in the browser
 * since Row Level Security policies control actual data access.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const hasPlaceholderValues =
    supabaseUrl?.includes("your-project-ref.supabase.co") ||
    supabaseAnonKey === "your-anon-public-key";

  if (!supabaseUrl || !supabaseAnonKey || hasPlaceholderValues) {
    const missing = [
      !supabaseUrl ? "NEXT_PUBLIC_SUPABASE_URL" : null,
      !supabaseAnonKey ? "NEXT_PUBLIC_SUPABASE_ANON_KEY" : null,
      hasPlaceholderValues ? "Replace placeholder Supabase values in .env.local" : null
    ].filter(Boolean);

    const message = `Missing Supabase env var(s): ${missing.join(", ")}`;
    console.error("[Supabase]", message);
    throw new Error(message);
  }

  return createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey
  );
}

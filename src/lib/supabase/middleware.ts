import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";

const PROTECTED_PREFIXES = ["/dashboard"];

const REFERRAL_QUERY_PARAM = "ref";
const REFERRAL_COOKIE_NAME = "earnxact_ref";
const REFERRAL_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

/**
 * Refreshes the Supabase auth session on every request and redirects
 * unauthenticated users away from protected routes. Called from the root
 * middleware.ts.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        }
      }
    }
  );

  // Do not add logic between createServerClient and getUser() — it can
  // cause hard-to-debug session refresh issues (per Supabase SSR guidance).
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const isProtectedRoute = PROTECTED_PREFIXES.some((prefix) =>
    request.nextUrl.pathname.startsWith(prefix)
  );

  if (isProtectedRoute && !user) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Persist ?ref=CODE into an HTTP-only cookie so the referral code survives
  // navigation (e.g. landing page -> pricing -> signup) even if the user
  // doesn't sign up on the exact page the link pointed to. HTTP-only means
  // client-side JS can never read/tamper with it; the signup page (a server
  // component) reads it via next/headers `cookies()` as a fallback when
  // there's no `?ref=` on the signup URL itself.
  const refParam = request.nextUrl.searchParams.get(REFERRAL_QUERY_PARAM);
  if (refParam && refParam.trim().length > 0) {
    response.cookies.set(REFERRAL_COOKIE_NAME, refParam.trim().toUpperCase(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: REFERRAL_COOKIE_MAX_AGE_SECONDS
    });
  }

  return response;
}


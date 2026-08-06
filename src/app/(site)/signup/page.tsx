import { cookies } from "next/headers";
import SignupForm from "@/components/SignupForm";

const REFERRAL_COOKIE_NAME = "earnxact_ref";

type SignupPageProps = {
  searchParams: Promise<{ ref?: string | string[] }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const resolvedSearchParams = await searchParams;
  const refParam = Array.isArray(resolvedSearchParams.ref)
    ? resolvedSearchParams.ref[0]
    : resolvedSearchParams.ref;

  // Prefer the ?ref= on the signup URL itself; fall back to the HTTP-only
  // cookie the middleware persisted from an earlier page (see
  // src/lib/supabase/middleware.ts). The cookie is HTTP-only, so it can only
  // be read here — a server component — never by client-side JS.
  const cookieStore = await cookies();
  const refCookie = cookieStore.get(REFERRAL_COOKIE_NAME)?.value;

  const rawReferralCode = (refParam ?? refCookie ?? "").trim();
  const referralCode = rawReferralCode.length > 0 ? rawReferralCode.toUpperCase() : null;

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(180deg,#060606_0%,#080808_100%)]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(900px_circle_at_15%_0%,rgba(244,163,0,0.12),transparent_50%),radial-gradient(900px_circle_at_85%_10%,rgba(255,255,255,0.06),transparent_45%)]" />

      <div className="mx-auto flex min-h-[calc(100vh-72px)] max-w-6xl items-center justify-center px-4 py-10 md:py-14">
        <SignupForm referralCode={referralCode} />
      </div>
    </section>
  );
}



"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MdClose, MdVisibility, MdVisibilityOff } from "react-icons/md";
import { createClient } from "@/lib/supabase/client";

type SignupFormProps = {
  initialEmail?: string;
  onClose?: () => void;
};

type CountryCode = {
  id: "uk" | "ng" | "us" | "fr" | "ca";
  label: string;
  dialCode: string;
  flag: string;
};

const COUNTRY_CODES: CountryCode[] = [
  { id: "uk", label: "UK", dialCode: "+44", flag: "🇬🇧" },
  { id: "ng", label: "Nigeria", dialCode: "+234", flag: "🇳🇬" },
  { id: "us", label: "USA", dialCode: "+1", flag: "🇺🇸" },
  { id: "fr", label: "France", dialCode: "+33", flag: "🇫🇷" },
  { id: "ca", label: "Canada", dialCode: "+1", flag: "🇨🇦" }
];

const FORM_CACHE_KEY = "earnxact-signup-form";

export default function SignupForm({ initialEmail, onClose }: SignupFormProps) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [countryId, setCountryId] = useState<CountryCode["id"]>("uk");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [agreeEmails, setAgreeEmails] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [hasLoadedCache, setHasLoadedCache] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const redirectTimerRef = useRef<number | null>(null);

  const country = useMemo(
    () => COUNTRY_CODES.find((c) => c.id === countryId) ?? COUNTRY_CODES[0],
    [countryId]
  );

  useEffect(() => {
    const cachedValue = window.localStorage.getItem(FORM_CACHE_KEY);

    if (cachedValue) {
      try {
        const parsed = JSON.parse(cachedValue) as {
          firstName?: string;
          lastName?: string;
          email?: string;
          countryId?: CountryCode["id"];
          phone?: string;
          password?: string;
          agreeEmails?: boolean;
        };

        setFirstName(parsed.firstName ?? "");
        setLastName(parsed.lastName ?? "");
        setEmail(parsed.email ?? "");
        setCountryId(parsed.countryId ?? "uk");
        setPhone(parsed.phone ?? "");
        setPassword(parsed.password ?? "");
        setAgreeEmails(Boolean(parsed.agreeEmails));
      } catch {
        window.localStorage.removeItem(FORM_CACHE_KEY);
      }
    }

    setHasLoadedCache(true);
  }, []);

  useEffect(() => {
    if (!initialEmail || email) return;
    setEmail(initialEmail);
  }, [email, initialEmail]);

  useEffect(() => {
    if (!hasLoadedCache) return;

    window.localStorage.setItem(
      FORM_CACHE_KEY,
      JSON.stringify({
        firstName,
        lastName,
        email,
        countryId,
        phone,
        password,
        agreeEmails
      })
    );
  }, [agreeEmails, countryId, email, firstName, hasLoadedCache, lastName, password, phone]);

  const isFormValid =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    email.trim().length > 0 &&
    phone.trim().length > 0 &&
    password.trim().length > 0 &&
    agreeEmails;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const signupPayload = {
        email: email.trim(),
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            phone_num: `${country.dialCode}${phone}`,
            account_type: "standard"
          },
          emailRedirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/login`
              : undefined
        }
      };

      console.info("[Signup] Submitting signup request", {
        email: signupPayload.email,
        metadata: signupPayload.options.data,
        emailRedirectTo: signupPayload.options.emailRedirectTo,
        online: typeof navigator !== "undefined" ? navigator.onLine : "unknown"
      });

      const { data, error } = await supabase.auth.signUp({
        email: signupPayload.email,
        password,
        options: signupPayload.options
      });

      if (error) {
        console.error("[Signup] Supabase signUp returned error", {
          message: error.message,
          status: error.status,
          code: error.code,
          name: error.name
        });

        const isDatabaseSignupError =
          error.message.toLowerCase().includes("database error saving new user") ||
          error.message.toLowerCase().includes("unexpected_failure");

        const isFetchFailure = error.message.toLowerCase().includes("fetch failed");

        setErrorMessage(
          isDatabaseSignupError
            ? "Signup failed due a database trigger/schema issue. Re-run the Supabase migration and verify the handle_new_user trigger exists."
            : isFetchFailure
              ? "Network request failed while contacting Supabase. Confirm internet access, check firewall/VPN/ad-block rules, and verify your NEXT_PUBLIC_SUPABASE_URL is reachable."
              : error.message
        );

        setIsSubmitting(false);
        return;
      }

      console.info("[Signup] Supabase signUp succeeded", {
        userId: data.user?.id,
        hasSession: Boolean(data.session)
      });
    } catch (err) {
      console.error("[Signup] Unexpected exception during signUp", err);

      const message = err instanceof Error ? err.message : "Unknown signup error";
      setErrorMessage(
        message.toLowerCase().includes("fetch")
          ? "Network request failed while contacting Supabase. Confirm internet access, check firewall/VPN/ad-block rules, and verify your NEXT_PUBLIC_SUPABASE_URL is reachable."
          : message
      );
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);

    // A confirmation email (with a verification link) is sent automatically
    // by Supabase Auth. The user_profile row is created server-side by the
    // on_auth_user_created trigger (see supabase/migrations/0001_init.sql).
    window.localStorage.removeItem(FORM_CACHE_KEY);
    setSuccessOpen(true);
    if (redirectTimerRef.current) window.clearTimeout(redirectTimerRef.current);
    redirectTimerRef.current = window.setTimeout(
      () => router.push("/login"),
      10_000
    );
  };

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        window.clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[var(--brand-card-1)]/90 p-6 text-white shadow-xl backdrop-blur">
      <button
        type="button"
        onClick={() => (onClose ? onClose() : router.push("/"))}
        className="absolute right-3 top-3 rounded-md p-2 text-white/70 hover:bg-white/10 hover:text-white"
        aria-label="Close"
      >
        <MdClose className="text-xl" />
      </button>

      <div className="mb-5">
        <div className="text-xs font-semibold tracking-widest text-[var(--brand-gold)]">
          EarnXact
        </div>
        <div className="mt-1 text-xl font-semibold">EarnXact</div>
        <div className="mt-1 text-sm text-white/70">Do exactly, earn exactly</div>
      </div>

      <div className="mb-5 grid grid-cols-2 overflow-hidden rounded-lg border border-white/10 bg-black/30">
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="px-4 py-2 text-sm text-white/70 hover:bg-white/10"
        >
          Login
        </button>
        <button
          type="button"
          className="px-4 py-2 text-sm font-semibold text-black bg-[var(--brand-smoky-white)]"
          aria-current="page"
        >
          Register
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm text-white/80">First name</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              autoComplete="given-name"
              placeholder="First name"
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-[var(--brand-gold)]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-white/80">Last name</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              autoComplete="family-name"
              placeholder="Last name"
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-[var(--brand-gold)]"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm text-white/80">Email address</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            autoComplete="email"
            placeholder="Enter email"
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-[var(--brand-gold)]"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-white/80">Phone Num</label>
          <div className="flex gap-2">
            <select
              value={countryId}
              onChange={(e) => setCountryId(e.target.value as CountryCode["id"])}
              required
              className="w-[140px] rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[var(--brand-gold)]"
            >
              {COUNTRY_CODES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.flag} {c.label} ({c.dialCode})
                </option>
              ))}
            </select>

            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              required
              autoComplete="tel-national"
              inputMode="numeric"
              placeholder="Phone number"
              className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-[var(--brand-gold)]"
            />
          </div>
          <div className="mt-1 text-xs text-white/50">
            Selected code: {country.dialCode}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm text-white/80">Password</label>
          <div className="relative">
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              placeholder="Enter password"
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 pr-11 text-sm text-white placeholder:text-white/40 outline-none focus:border-[var(--brand-gold)]"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-white/60 hover:text-white"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <MdVisibilityOff className="text-lg" />
              ) : (
                <MdVisibility className="text-lg" />
              )}
            </button>
          </div>
        </div>

        <label className="flex items-start gap-2 text-sm text-white/80">
          <input
            type="checkbox"
            checked={agreeEmails}
            onChange={(e) => setAgreeEmails(e.target.checked)}
            required
            className="mt-1 h-4 w-4 rounded border-white/20 bg-black/40"
          />
          <span>
            I agree to receive emails from EarnXact Limited, unsubscribe anytime.
          </span>
        </label>

        {errorMessage ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {errorMessage}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={!isFormValid || isSubmitting}
          className="w-full rounded-lg bg-[var(--brand-smoky-white)] px-4 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Creating account..." : "Create Account"}
        </button>

        <div className="text-center text-xs text-white/50">
          By signing up you agree to our{" "}
          <Link href="/" className="underline hover:text-white">
            terms
          </Link>{" "}
          &{" "}
          <Link href="/" className="underline hover:text-white">
            privacy policy
          </Link>{" "}
          &{" "}
          <Link href="/" className="underline hover:text-white">
            cookie policy
          </Link>
          .
        </div>
      </form>

      {successOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111] p-6 text-white shadow-xl">
            <div className="text-lg font-semibold text-[var(--brand-gold)]">
              Account created
            </div>
            <div className="mt-2 text-sm text-white/80">
              Your account has been created successfully, kindly verify your email
              to login.
            </div>
            <div className="mt-4 text-xs text-white/50">
              Redirecting to login in 10 seconds...
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="rounded-lg bg-[var(--brand-smoky-white)] px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
              >
                Go to login now
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  return (
    <section className="relative overflow-hidden">
      <div
        className="absolute inset-0 -z-20 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/hero-section.jpg')" }}
      />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(5,5,5,0.65),rgba(5,5,5,0.92)),radial-gradient(1200px_circle_at_20%_20%,rgba(244,163,0,0.13),transparent_45%),radial-gradient(900px_circle_at_80%_10%,rgba(120,70,255,0.10),transparent_50%)]" />

      <div className="mx-auto flex min-h-[calc(100vh-61px)] max-w-6xl items-center justify-center px-4 py-10 md:py-14">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/80 p-6 text-white shadow-[0_18px_60px_rgba(0,0,0,0.7)] backdrop-blur">
          <div className="text-xl font-semibold">Forgot password</div>
          <div className="mt-1 text-sm text-white/70">
            Enter your account email and we&apos;ll send you a link to reset your
            password.
          </div>

          {sent ? (
            <div className="mt-6 rounded-lg border border-[var(--brand-gold)]/30 bg-[var(--brand-gold)]/10 px-3 py-3 text-sm text-white/80">
              If an account exists for <span className="font-semibold">{email}</span>,
              a password reset link has been sent. Check your inbox.
            </div>
          ) : (
            <form
              className="mt-6 space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                if (isSubmitting) return;

                setErrorMessage(null);
                setIsSubmitting(true);

                const supabase = createClient();
                const { error } = await supabase.auth.resetPasswordForEmail(
                  email.trim(),
                  {
                    redirectTo:
                      typeof window !== "undefined"
                        ? `${window.location.origin}/reset-password`
                        : undefined
                  }
                );

                setIsSubmitting(false);

                if (error) {
                  setErrorMessage(error.message);
                  return;
                }

                setSent(true);
              }}
            >
              <div>
                <label className="mb-1 block text-sm text-white/80">Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="Enter email"
                  className="w-full rounded-md border border-white/10 bg-black/60 px-3 py-2.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-[var(--brand-gold)]"
                />
              </div>

              {errorMessage ? (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {errorMessage}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-md bg-[var(--brand-gold)] px-4 py-2.5 text-sm font-semibold text-black hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Sending link..." : "Send reset link"}
              </button>
            </form>
          )}

          <div className="mt-4 text-sm text-white/70">
            Remembered your password?{" "}
            <Link
              href="/login"
              className="font-semibold text-[var(--brand-gold)] hover:underline"
            >
              Back to login
            </Link>
            .
          </div>
        </div>
      </div>
    </section>
  );
}

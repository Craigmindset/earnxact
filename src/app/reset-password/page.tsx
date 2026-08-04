"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MdVisibility, MdVisibilityOff } from "react-icons/md";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  return (
    <section className="relative overflow-hidden">
      <div
        className="absolute inset-0 -z-20 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/hero-section.jpg')" }}
      />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(5,5,5,0.65),rgba(5,5,5,0.92)),radial-gradient(1200px_circle_at_20%_20%,rgba(244,163,0,0.13),transparent_45%),radial-gradient(900px_circle_at_80%_10%,rgba(120,70,255,0.10),transparent_50%)]" />

      <div className="mx-auto flex min-h-[calc(100vh-61px)] max-w-6xl items-center justify-center px-4 py-10 md:py-14">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/80 p-6 text-white shadow-[0_18px_60px_rgba(0,0,0,0.7)] backdrop-blur">
          <div className="text-xl font-semibold">Set a new password</div>
          <div className="mt-1 text-sm text-white/70">
            Choose a new password for your account.
          </div>

          {done ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-lg border border-[var(--brand-gold)]/30 bg-[var(--brand-gold)]/10 px-3 py-3 text-sm text-white/80">
                Your password has been updated. You can now log in.
              </div>
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="w-full rounded-md bg-[var(--brand-gold)] px-4 py-2.5 text-sm font-semibold text-black hover:opacity-90"
              >
                Go to login
              </button>
            </div>
          ) : (
            <form
              className="mt-6 space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                if (isSubmitting) return;

                if (password !== confirmPassword) {
                  setErrorMessage("Passwords do not match.");
                  return;
                }

                setErrorMessage(null);
                setIsSubmitting(true);

                const supabase = createClient();
                const { error } = await supabase.auth.updateUser({ password });

                setIsSubmitting(false);

                if (error) {
                  setErrorMessage(error.message);
                  return;
                }

                setDone(true);
              }}
            >
              <div>
                <label className="mb-1 block text-sm text-white/80">
                  New password
                </label>
                <div className="relative">
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    placeholder="Enter new password"
                    className="w-full rounded-md border border-white/10 bg-black/60 px-3 py-2.5 pr-10 text-sm text-white placeholder:text-white/40 outline-none focus:border-[var(--brand-gold)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80"
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

              <div>
                <label className="mb-1 block text-sm text-white/80">
                  Confirm new password
                </label>
                <input
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  placeholder="Re-enter new password"
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
                {isSubmitting ? "Updating..." : "Update password"}
              </button>
            </form>
          )}

          <div className="mt-4 text-sm text-white/70">
            <Link
              href="/login"
              className="font-semibold text-[var(--brand-gold)] hover:underline"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

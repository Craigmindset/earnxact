"use client";

import { useState } from "react";
import Link from "next/link";
import { FaGoogle, FaYoutube } from "react-icons/fa6";
import { SiTiktok } from "react-icons/si";
import SignupForm from "@/components/SignupForm";

export default function HeroSection() {
  const [email, setEmail] = useState("");
  const [showSignupForm, setShowSignupForm] = useState(false);

  return (
    <section className="relative min-h-[80vh] md:min-h-[88vh]">
      <div
        className="absolute inset-0 -z-20 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/hero-section.jpg')" }}
      />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(5,5,5,0.62),rgba(5,5,5,0.88)),radial-gradient(1200px_circle_at_20%_20%,rgba(244,163,0,0.15),transparent_45%),radial-gradient(900px_circle_at_80%_10%,rgba(120,70,255,0.12),transparent_50%)]" />

      <div className="mx-auto flex min-h-[80vh] max-w-6xl items-center px-4 py-12 md:min-h-[88vh] md:py-16">
        <div className="grid w-full items-center gap-10 md:grid-cols-2 md:gap-12">
          <div className="fade-up">
            <h1 className="text-5xl font-semibold leading-tight tracking-tight md:text-6xl lg:text-7xl">
              Earn real <span className="text-[var(--brand-gold)]">cash</span>{" "}
              <br className="hidden md:block" />
              completing tasks online
            </h1>

            <p className="mt-4 max-w-xl text-base leading-relaxed text-white/65 md:text-lg">
              Complete task online and earn legitimately today, no scam.
            </p>

            <div className="mt-7 grid gap-4 sm:grid-cols-3">
              <Link
                href="/signup"
                className="group rounded-xl border border-white/10 bg-[var(--brand-card-1)]/90 p-4 transition hover:-translate-y-0.5 hover:border-white/15 hover:bg-[var(--brand-card-2)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-white">
                      <SiTiktok className="text-xl" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">
                        TikTok task
                      </div>
                      <div className="text-xs text-white/50">Sign up & explore</div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-[var(--brand-gold)]">
                    $5.00
                  </div>
                </div>
              </Link>

              <Link
                href="/signup"
                className="group rounded-xl border border-white/10 bg-[var(--brand-card-1)]/90 p-4 transition hover:-translate-y-0.5 hover:border-white/15 hover:bg-[var(--brand-card-2)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-white">
                      <span className="text-lg font-semibold">$</span>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">
                        EarnXact task
                      </div>
                      <div className="text-xs text-white/50">Join & engage</div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-[var(--brand-gold)]">
                    $3.00
                  </div>
                </div>
              </Link>

              <Link
                href="/signup"
                className="group rounded-xl border border-white/10 bg-[var(--brand-card-1)]/90 p-4 transition hover:-translate-y-0.5 hover:border-white/15 hover:bg-[var(--brand-card-2)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-white">
                      <FaYoutube className="text-xl" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">
                        YouTube task
                      </div>
                      <div className="text-xs text-white/50">
                        Watch & subscribe
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-[var(--brand-gold)]">
                    $4.00
                  </div>
                </div>
              </Link>
            </div>
          </div>

          <div className="flex md:justify-end fade-up">
            {!showSignupForm ? (
              <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[var(--brand-card-1)]/90 p-6 text-white shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur">
                <div className="text-xl font-semibold">Create Free Account</div>
                <div className="mt-2 text-sm text-white/60">
                  Earn legitimately today, no scam.
                </div>

                <button
                  type="button"
                  onClick={() => {
                    // Backend/auth integration point:
                    // - Trigger Google OAuth (e.g. NextAuth, Clerk, Supabase Auth, Firebase Auth).
                  }}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  <FaGoogle className="text-base" />
                  <span>Continue with Google</span>
                </button>

                <div className="my-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/10" />
                  <div className="text-xs uppercase tracking-widest text-white/45">
                    or sign up with email
                  </div>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="Email address"
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none focus:border-[var(--brand-gold)]"
                />

                <button
                  type="button"
                  onClick={() => setShowSignupForm(true)}
                  className="mt-3 w-full rounded-lg bg-[var(--brand-gold)] px-4 py-3 text-sm font-semibold text-black transition hover:opacity-90"
                >
                  Start Earning - It&apos;s Free
                </button>

                <div className="mt-4 text-xs leading-relaxed text-white/45">
                  By signing up you agree to our Terms & Privacy Policy & Cookie
                  Policy.
                </div>

                <div className="mt-4 text-sm text-white/60">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="font-semibold text-[var(--brand-gold)] hover:underline"
                  >
                    Sign in
                  </Link>
                </div>
              </div>
            ) : (
              <SignupForm
                initialEmail={email}
                onClose={() => setShowSignupForm(false)}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import Lottie from "lottie-react";
import { FaGoogle } from "react-icons/fa6";
import SignupForm from "@/components/SignupForm";
import telegramAnimation from "../../../public/images/telegram logo beat.json";
import tiktokAnimation from "../../../public/images/tiktok icon.json";
import youtubeAnimation from "../../../public/images/You Tube Video Play Button.json";

const taskCards = [
  {
    href: "/signup",
    title: "TikTok tasks",
    description: "Sign up & explore",
    price: "cashout",
    animationData: tiktokAnimation,
  },
  {
    href: "/signup",
    title: "Telegram task",
    description: "Join & engage",
    price: "cashout",
    animationData: telegramAnimation,
  },
  {
    href: "/signup",
    title: "YouTube task",
    description: "Watch & subscribe",
    price: "cashout",
    animationData: youtubeAnimation,
  },
];

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
            <h1 className="font-display text-[2.1rem] font-extrabold leading-[1.05] tracking-[-0.03em] md:text-5xl md:leading-[0.99] md:tracking-[-0.07em] lg:text-6xl">
              Earn real <span className="text-[var(--brand-gold)]">cash</span>{" "}
              <br className="hidden md:block" />
              completing tasks{" "}
              <br className="md:hidden" />
              online
            </h1>

            <p className="mt-4 max-w-xl text-base leading-relaxed text-white/65 md:text-lg">
              Complete task online and earn legitimately today,{" "}
              <br className="hidden md:block" />
              no scam!
            </p>

            <div className="mt-6 flex gap-2 md:grid md:grid-cols-3 md:gap-2.5">
              {taskCards.map((card) => (
                <Link
                  key={card.title}
                  href={card.href}
                  className="group flex flex-1 flex-col rounded-[18px] bg-[var(--brand-card-1)]/90 p-2.5 transition hover:-translate-y-1 hover:bg-[var(--brand-card-2)] md:mx-auto md:min-h-[190px] md:p-3"
                >
                  <div className="flex min-h-[80px] items-center justify-center rounded-[14px] bg-white/[0.03] px-2 py-2 md:min-h-[104px]">
                    <Lottie
                      animationData={card.animationData}
                      loop
                      className="h-12 w-12 md:h-20 md:w-20"
                    />
                  </div>

                  <div className="mt-2.5">
                    <div className="flex flex-col gap-0.5 md:flex-row md:items-center md:justify-between md:gap-1">
                      <div className="text-xs font-medium leading-tight text-white md:text-sm">
                        {card.title}
                      </div>
                      <div className="shrink-0 text-[7px] font-semibold text-[var(--brand-gold)] md:text-[8px]">
                        {card.price}
                      </div>
                    </div>
                    <div className="mt-0.5 break-words text-[10px] leading-snug text-white/50 md:text-xs">
                      {card.description}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <Link
              href="/signup"
              className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-[var(--brand-gold)] px-4 py-3.5 text-sm font-semibold text-black transition hover:opacity-90 md:hidden"
            >
              Get Started — It&apos;s Free
            </Link>
          </div>

          <div className="hidden fade-up md:flex md:justify-end">
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

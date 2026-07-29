"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(180deg,#060606_0%,#080808_100%)]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(900px_circle_at_15%_0%,rgba(244,163,0,0.12),transparent_50%),radial-gradient(900px_circle_at_85%_10%,rgba(255,255,255,0.06),transparent_45%)]" />

      <div className="mx-auto flex min-h-[calc(100vh-72px)] max-w-6xl items-center justify-center px-4 py-10 md:py-14">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[var(--brand-card-1)]/90 p-6 text-white shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur">
          <div className="text-xl font-semibold">Login</div>
          <div className="mt-1 text-sm text-white/70">
            Enter your email to continue.
          </div>

          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();

              // Backend/auth integration point:
              // - Validate credentials with your auth provider.
              // - Store session (httpOnly cookie / JWT) and handle errors.
              router.push("/dashboard");
            }}
          >
            <div>
              <label className="mb-1 block text-sm text-white/80">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="Enter email"
                className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-[var(--brand-gold)]"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-white/80">Password</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="Enter password"
                className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-[var(--brand-gold)]"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-md bg-[var(--brand-gold)] px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
            >
              Login
            </button>
          </form>

          <div className="mt-4 text-sm text-white/70">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-semibold text-[var(--brand-gold)] hover:underline"
            >
              Register
            </Link>
            .
          </div>
        </div>
      </div>
    </section>
  );
}


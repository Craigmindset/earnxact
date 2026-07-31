"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MdVisibility, MdVisibilityOff } from "react-icons/md";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  return (
    <section className="relative overflow-hidden">
      {/* Same hero background as the home page */}
      <div
        className="absolute inset-0 -z-20 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/hero-section.jpg')" }}
      />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(5,5,5,0.65),rgba(5,5,5,0.92)),radial-gradient(1200px_circle_at_20%_20%,rgba(244,163,0,0.13),transparent_45%),radial-gradient(900px_circle_at_80%_10%,rgba(120,70,255,0.10),transparent_50%)]" />

      <div className="mx-auto flex min-h-[calc(100vh-61px)] max-w-6xl items-center justify-center px-4 py-10 md:py-14">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/80 p-6 text-white shadow-[0_18px_60px_rgba(0,0,0,0.7)] backdrop-blur">
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
                className="w-full rounded-md border border-white/10 bg-black/60 px-3 py-2.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-[var(--brand-gold)]"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-white/80">Password</label>
              <div className="relative">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
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

            <button
              type="submit"
              className="w-full rounded-md bg-[var(--brand-gold)] px-4 py-2.5 text-sm font-semibold text-black hover:opacity-90"
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


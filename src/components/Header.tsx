"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FiMenu, FiX } from "react-icons/fi";
import LanguageSelect from "@/components/LanguageSelect";

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[var(--brand-black)]/80 backdrop-blur supports-[backdrop-filter]:bg-[color:rgba(5,5,5,0.72)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="inline-flex items-center" aria-label="EarnXact Home">
          <Image
            src="/images/earnxact-logo.png"
            alt="EarnXact"
            width={168}
            height={44}
            priority
            className="h-9 w-auto sm:h-10 lg:h-22"
          />
        </Link>

        <div className="hidden items-center gap-2 sm:gap-3 md:flex">
          <LanguageSelect />
          <Link
            href="/login"
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-white hover:bg-white/10 sm:px-4"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-[var(--brand-gold)] px-3 py-2 text-sm font-semibold text-black hover:opacity-90 sm:px-4"
          >
            Register
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white transition hover:bg-white/10 md:hidden"
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileOpen}
          aria-controls="mobile-site-nav"
        >
          {mobileOpen ? <FiX className="text-xl" /> : <FiMenu className="text-xl" />}
        </button>
      </div>

      {mobileOpen ? (
        <nav id="mobile-site-nav" className="border-t border-white/10 px-4 pb-4 pt-3 md:hidden">
          <div className="flex flex-col gap-3">
            <LanguageSelect />
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-center text-sm font-medium text-white transition hover:bg-white/10"
            >
              Login
            </Link>
            <Link
              href="/signup"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg bg-[var(--brand-gold)] px-4 py-2.5 text-center text-sm font-semibold text-black transition hover:opacity-90"
            >
              Register
            </Link>
          </div>
        </nav>
      ) : null}
    </header>
  );
}

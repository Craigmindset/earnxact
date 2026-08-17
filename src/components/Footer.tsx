import Link from "next/link";
import { FaTelegram, FaXTwitter } from "react-icons/fa6";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[var(--brand-black)]">
      <div className="mx-auto max-w-6xl px-4 py-12 text-sm text-white/70">
        <div className="grid gap-10 md:grid-cols-2">
          <div className="max-w-sm">
            <div className="text-lg font-semibold tracking-tight text-white">
              <span className="text-white">Earn</span>
              <span className="text-[var(--brand-gold)]">Xact</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-white/60">
              Complete tasks, earn rewards. The easiest way to turn your time into
              cash.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:gap-8">
            <div>
              <div className="text-xs font-semibold tracking-widest text-white/70">
                EARN
              </div>
              <div className="mt-3 space-y-2 text-xs text-white/60 sm:text-sm">
                <Link href="/earn-acts#offers" className="block transition hover:text-white">
                  Offers
                </Link>
                <Link href="/earn-acts#tasks" className="block transition hover:text-white">
                  Tasks
                </Link>
                <Link href="/earn-acts#referrals" className="block transition hover:text-white">
                  Referrals
                </Link>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold tracking-widest text-white/70">
                COMPANY
              </div>
              <div className="mt-3 space-y-2 text-xs text-white/60 sm:text-sm">
                <Link href="/about-us" className="block transition hover:text-white">
                  About Us
                </Link>
                <Link href="/about-us#fraud-detection" className="block transition hover:text-white">
                  Fraud Detection
                </Link>
                <Link href="/support" className="block transition hover:text-white">
                  Support
                </Link>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold tracking-widest text-white/70">
                LEGAL
              </div>
              <div className="mt-3 space-y-2 text-xs text-white/60 sm:text-sm">
                <Link href="/terms-of-service" className="block transition hover:text-white">
                  Terms of Service
                </Link>
                <Link href="/privacy-policy" className="block transition hover:text-white">
                  Privacy Policy
                </Link>
                <Link href="/cookie-policy" className="block transition hover:text-white">
                  Cookie Policy
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-white/50">
              © 2026 EarnXact. All rights reserved.
            </div>
            <div className="flex flex-wrap items-center gap-2 text-white/60">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2">
                <FaTelegram className="text-base" />
                <span className="text-xs">Telegram</span>
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2">
                <FaXTwitter className="text-base" />
                <span className="text-xs">X</span>
              </span>
            </div>
          </div>
          <p className="mt-5 text-xs leading-relaxed text-white/40">
            We strictly prohibit illegal activities, fraud, and unauthorized content. All users and transactions are monitored for compliance.
          </p>
        </div>
      </div>
    </footer>
  );
}

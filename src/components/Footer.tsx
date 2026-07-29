import Link from "next/link";
import { FaDiscord, FaTelegram, FaXTwitter, FaYoutube } from "react-icons/fa6";

export default function Footer() {
  const links = {
    login: "/login",
    register: "/signup"
  } as const;

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

          <div className="grid gap-8 sm:grid-cols-3">
            <div>
              <div className="text-xs font-semibold tracking-widest text-white/70">
                EARN
              </div>
              <div className="mt-3 space-y-2 text-sm text-white/60">
                <span className="block">Surveys</span>
                <span className="block">Offers</span>
                <span className="block">Tasks</span>
                <span className="block">Referrals</span>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold tracking-widest text-white/70">
                COMPANY
              </div>
              <div className="mt-3 space-y-2 text-sm text-white/60">
                <span className="block">About</span>
                <span className="block">Search</span>
                <span className="block">Blog</span>
                <span className="block">Support</span>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold tracking-widest text-white/70">
                LEGAL
              </div>
              <div className="mt-3 space-y-2 text-sm text-white/60">
                <span className="block">Terms of Service</span>
                <span className="block">Privacy Policy</span>
                <span className="block">Cookie Policy</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-white/50">
              © 2026 EarnXact. All rights reserved.
            </div>
            <div className="flex items-center gap-3 text-white/60">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                <FaDiscord className="text-base" />
                <span className="text-xs">Discord</span>
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                <FaTelegram className="text-base" />
                <span className="text-xs">Telegram</span>
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                <FaXTwitter className="text-base" />
                <span className="text-xs">X</span>
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                <FaYoutube className="text-base" />
                <span className="text-xs">YouTube</span>
              </span>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-white/40">
            <Link href={links.login} className="hover:text-white/70">
              Login
            </Link>
            <Link href={links.register} className="hover:text-white/70">
              Register
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

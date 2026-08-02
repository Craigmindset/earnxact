import Image from "next/image";
import Link from "next/link";
import LanguageSelect from "@/components/LanguageSelect";

export default function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[var(--brand-black)]/80 backdrop-blur supports-[backdrop-filter]:bg-[color:rgba(5,5,5,0.72)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link
          href="/"
          className="inline-flex items-center"
          aria-label="EarnXact Home"
        >
          <Image
            src="/images/earnxact-logo.png"
            alt="EarnXact"
            width={200}
            height={44}
            priority
            className="h-9 w-auto sm:h-10 lg:h-22"
          />
        </Link>

        {/* Desktop nav */}
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
            className="rounded-lg bg-[var(--brand-smoky-white)] px-3 py-2 text-sm font-semibold text-black hover:opacity-90 sm:px-4"
          >
            Register
          </Link>
        </div>

        {/* Mobile: globe / language picker only */}
        <div className="md:hidden">
          <LanguageSelect />
        </div>
      </div>
    </header>
  );
}

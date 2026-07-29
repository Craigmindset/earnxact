import Link from "next/link";

export default function FinalCtaSection() {
  return (
    <section className="border-t border-white/10 bg-[var(--brand-black)]">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[var(--brand-card-1)] p-8 md:p-12">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(900px_circle_at_20%_30%,rgba(244,163,0,0.18),transparent_55%),radial-gradient(900px_circle_at_80%_20%,rgba(120,70,255,0.16),transparent_55%)]" />

          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="text-3xl font-semibold leading-tight tracking-tight text-white md:text-4xl">
                Turn free time into <br />
                <span className="text-[var(--brand-gold)]">real money.</span>
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/60 md:text-base">
                Complete task online and earn legitimately today, no scam.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-lg bg-[var(--brand-gold)] px-6 py-3 text-sm font-semibold text-black transition hover:opacity-90"
                >
                  Start Earning Free ↗
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Explore tasks ›
                </Link>
              </div>
              <div className="mt-5 text-xs text-white/45">
                PayPal · Crypto · Gift Cards · Robux
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/35 p-6 text-white/70">
              <div className="text-xs font-semibold tracking-widest text-white/50">
                START HERE
              </div>
              <div className="mt-3 text-lg font-semibold text-white">
                Create your free account
              </div>
              <div className="mt-2 text-sm leading-relaxed text-white/60">
                Use email or Google to register, then choose tasks that match your
                interests.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

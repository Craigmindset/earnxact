export default function CookiePolicyPage() {
  return (
    <div className="bg-[var(--brand-black)]">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top,rgba(244,163,0,0.14),transparent_35%)]">
        <div className="mx-auto max-w-4xl px-4 py-20">
          <div className="inline-flex rounded-full border border-[var(--brand-gold)]/25 bg-[var(--brand-gold)]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand-gold)]">
            Legal
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white md:text-5xl">
            Cookie Policy
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/65 md:text-base">
            This page explains the small browser technologies EarnXact uses to keep sessions secure and improve site performance.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-14">
        <div className="space-y-8 rounded-[28px] border border-white/10 bg-white/[0.03] p-6 md:p-8">
          <section>
            <h2 className="text-lg font-semibold text-white">Essential Cookies</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/65">
              Essential cookies help maintain login sessions, protect requests, and keep core platform features working correctly.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">Performance and Analytics</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/65">
              EarnXact may use measurement tools to understand traffic patterns, page performance, and product issues so the experience can be improved over time.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">Preference Storage</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/65">
              Some preferences, including display or installation prompts, may be stored locally in your browser to avoid showing the same prompt repeatedly.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">Managing Cookies</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/65">
              You can control cookies through your browser settings. Disabling certain cookies may reduce access to account, login, or payout-related features.
            </p>
          </section>
        </div>
      </section>
    </div>
  );
}
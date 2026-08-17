export default function TermsOfServicePage() {
  return (
    <div className="bg-[var(--brand-black)]">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top,rgba(244,163,0,0.14),transparent_35%)]">
        <div className="mx-auto max-w-4xl px-4 py-20">
          <div className="inline-flex rounded-full border border-[var(--brand-gold)]/25 bg-[var(--brand-gold)]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand-gold)]">
            Legal
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white md:text-5xl">
            Terms of Service
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/65 md:text-base">
            These terms explain how EarnXact may be used, what users are expected to do, and how rewards, suspensions, and withdrawals are handled on the platform.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-14">
        <div className="space-y-8 rounded-[28px] border border-white/10 bg-white/[0.03] p-6 md:p-8">
          <section>
            <h2 className="text-lg font-semibold text-white">Account Eligibility</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/65">
              Users must provide accurate information during registration and must not create duplicate, fraudulent, or misleading accounts to manipulate reward systems.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">Reward Rules</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/65">
              Earnings are only credited for valid activity confirmed by EarnXact systems, partner platforms, or manual review. EarnXact may reject, reverse, or delay rewards where abuse, duplicate submissions, or partner invalidation is detected.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">Prohibited Conduct</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/65">
              Botting, spoofing, VPN abuse, fake referrals, repeated screenshots, multiple-account farming, and any attempt to manipulate advertiser, task, or payout systems may result in suspension or permanent removal.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">Withdrawals and Reviews</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/65">
              Withdrawals may be delayed for security review. EarnXact may request additional verification before approving payout requests where unusual account activity or fraud signals are present.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">Changes to Terms</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/65">
              EarnXact may update these terms to reflect product, compliance, or payment-policy changes. Continued use of the platform after an update means you accept the revised terms.
            </p>
          </section>
        </div>
      </section>
    </div>
  );
}
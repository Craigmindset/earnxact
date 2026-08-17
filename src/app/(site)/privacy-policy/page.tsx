export default function PrivacyPolicyPage() {
  return (
    <div className="bg-[var(--brand-black)]">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top,rgba(244,163,0,0.14),transparent_35%)]">
        <div className="mx-auto max-w-4xl px-4 py-20">
          <div className="inline-flex rounded-full border border-[var(--brand-gold)]/25 bg-[var(--brand-gold)]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand-gold)]">
            Legal
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white md:text-5xl">
            Privacy Policy
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/65 md:text-base">
            This policy outlines what information EarnXact collects, why it is collected, and how it is protected while you use the platform.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-14">
        <div className="space-y-8 rounded-[28px] border border-white/10 bg-white/[0.03] p-6 md:p-8">
          <section>
            <h2 className="text-lg font-semibold text-white">Information We Collect</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/65">
              We collect details you provide at signup, profile information, task submissions, reward activity, and security data used to protect accounts and payment flows.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">How We Use Data</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/65">
              Your data is used to operate the platform, verify activity, calculate rewards, process withdrawals, prevent fraud, respond to support requests, and improve product performance.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">Sharing and Processors</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/65">
              EarnXact may share limited information with infrastructure, analytics, payment, and advertising partners only where required to deliver platform functionality and maintain security.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">Data Retention</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/65">
              We retain account and activity records for operational, payout, security, and compliance purposes for as long as reasonably necessary.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">Your Choices</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/65">
              You may request access, correction, or support-related clarification by contacting EarnXact support through the public support page.
            </p>
          </section>
        </div>
      </section>
    </div>
  );
}
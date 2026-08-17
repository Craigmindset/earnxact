import Link from "next/link";
import { MdArrowOutward, MdGppGood, MdShield } from "react-icons/md";

export default function AboutUsPage() {
  return (
    <div className="bg-[var(--brand-black)]">
      <section className="border-b border-white/10 bg-[linear-gradient(180deg,rgba(5,5,5,0.82),rgba(5,5,5,0.96)),radial-gradient(900px_circle_at_20%_20%,rgba(244,163,0,0.16),transparent_35%)]">
        <div className="mx-auto max-w-6xl px-4 py-20 md:py-24">
          <div className="inline-flex rounded-full border border-[var(--brand-gold)]/25 bg-[var(--brand-gold)]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand-gold)]">
            Company
          </div>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-white md:text-6xl md:leading-[1.02]">
            Built to make online earning clearer, safer, and more accountable.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/65 md:text-lg">
            EarnXact helps users access structured earning opportunities through tasks, offers, referrals, and wallet-based reward tracking in one system.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 md:py-20">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[30px] border border-white/10 bg-white/[0.03] p-6 md:p-8">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-gold)]">
              About EarnXact
            </div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
              A practical earning platform with real checks behind every reward.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-white/65 md:text-base">
              Our goal is to turn fragmented online earning activity into a more structured product experience. Instead of forcing users to guess what is valid or what pays, EarnXact centralizes action steps, review paths, payout rules, and wallet visibility inside one platform.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-white/65 md:text-base">
              We focus on transparent reward handling, clearly separated earning paths, and systems that let administrators review activity before money moves where manual approval is required.
            </p>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(244,163,0,0.12),rgba(255,255,255,0.03))] p-6 md:p-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--brand-gold)]/15 text-[var(--brand-gold)]">
              <MdGppGood className="text-3xl" />
            </div>
            <h2 className="mt-5 text-2xl font-semibold text-white">
              What we optimize for
            </h2>
            <div className="mt-5 space-y-3 text-sm leading-relaxed text-white/70">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">Clear earning rules</div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">Plan-based reward consistency</div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">Manual and automated fraud review</div>
            </div>
          </div>
        </div>
      </section>

      <section id="fraud-detection" className="scroll-mt-28 border-t border-white/10 bg-[var(--brand-surface-1)]/80">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
          <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand-gold)]/15 text-[var(--brand-gold)]">
                <MdShield className="text-2xl" />
              </div>
              <div className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-gold)]">
                Fraud Detection
              </div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                We review activity patterns before rewards are trusted.
              </h2>
            </div>

            <div className="space-y-4 text-sm leading-relaxed text-white/65 md:text-base">
              <p>
                EarnXact uses account, submission, and transaction signals to identify duplicate behavior, misleading proof, suspicious withdrawal patterns, and unauthorized reward activity.
              </p>
              <p>
                Where something looks wrong, approvals may be delayed, rewards may be reversed, and accounts may be suspended pending review. This protects legitimate users, advertisers, and payout flows.
              </p>
              <Link href="/support" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                Contact Support
                <MdArrowOutward className="text-lg" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
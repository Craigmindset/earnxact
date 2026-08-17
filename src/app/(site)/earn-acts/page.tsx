import Link from "next/link";
import { MdArrowOutward, MdChecklist, MdLocalOffer, MdPeopleAlt, MdVerified } from "react-icons/md";

const earnSections = [
  {
    id: "offers",
    eyebrow: "Offers",
    title: "Take high-value offers that convert your attention into cash rewards.",
    description:
      "Browse available offer opportunities, complete partner requirements carefully, and earn once the action is verified.",
    bullets: [
      "Short actions with tracked completion rules",
      "Payouts depend on valid advertiser confirmation",
      "Best for members who want larger one-off reward opportunities",
    ],
    icon: MdLocalOffer,
  },
  {
    id: "tasks",
    eyebrow: "Tasks",
    title: "Complete structured daily tasks designed for consistent earnings.",
    description:
      "Daily tasks give members a repeatable earning path, with submission review and plan-based payouts handled directly inside EarnXact.",
    bullets: [
      "One daily task flow tied to your active membership plan",
      "Screenshot review before approval",
      "Good for steady day-to-day earnings",
    ],
    icon: MdChecklist,
  },
  {
    id: "referrals",
    eyebrow: "Referrals",
    title: "Invite people who actually want to earn and grow your reward flow over time.",
    description:
      "Referral earnings work best when you bring real users who stay active, upgrade, and engage with the platform consistently.",
    bullets: [
      "Direct referral rewards for valid signups",
      "Extra upside from qualifying referral purchases",
      "Built for organic community-driven growth",
    ],
    icon: MdPeopleAlt,
  },
] as const;

export default function EarnActsPage() {
  return (
    <div className="overflow-x-hidden bg-[var(--brand-black)]">
      <section className="relative border-b border-white/10 bg-[linear-gradient(180deg,rgba(5,5,5,0.88),rgba(5,5,5,0.96)),radial-gradient(900px_circle_at_15%_15%,rgba(244,163,0,0.18),transparent_40%),radial-gradient(900px_circle_at_85%_0%,rgba(255,255,255,0.08),transparent_35%)]">
        <div className="mx-auto max-w-6xl px-4 py-20 md:py-24">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--brand-gold)]/25 bg-[var(--brand-gold)]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand-gold)]">
            <MdVerified className="text-sm" />
            Earn Acts
          </div>
          <div className="mt-6 grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white md:text-6xl md:leading-[1.02]">
                Three focused ways to earn inside EarnXact.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/65 md:text-lg">
                Explore offers, complete daily tasks, and build referrals from one guided earning path. Each section below explains how that earning stream works and where it fits best.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="#offers" className="rounded-xl bg-[var(--brand-smoky-white)] px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90">
                  Explore Offers
                </Link>
                <Link href="#tasks" className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                  See Tasks
                </Link>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                {earnSections.map(({ id, eyebrow, title }) => (
                  <Link
                    key={id}
                    href={`#${id}`}
                    className="rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-white/20 hover:bg-white/[0.04]"
                  >
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-gold)]">
                      {eyebrow}
                    </div>
                    <div className="mt-2 text-sm leading-relaxed text-white/80">
                      {title}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 md:py-20">
        <div className="space-y-6">
          {earnSections.map(({ id, eyebrow, title, description, bullets, icon: Icon }) => (
            <section
              key={id}
              id={id}
              className="scroll-mt-28 rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-6 md:p-8"
            >
              <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand-gold)]/15 text-[var(--brand-gold)]">
                    <Icon className="text-2xl" />
                  </div>
                  <div className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand-gold)]">
                    {eyebrow}
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white md:text-3xl">
                    {title}
                  </h2>
                </div>

                <div>
                  <p className="text-sm leading-relaxed text-white/65 md:text-base">
                    {description}
                  </p>
                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    {bullets.map((bullet) => (
                      <div key={bullet} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-relaxed text-white/70">
                        {bullet}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>
      </section>

      <section className="border-t border-white/10 border-b border-white/10 bg-[radial-gradient(circle_at_center,rgba(244,163,0,0.12),transparent_38%)]">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="rounded-[32px] border border-[var(--brand-gold)]/20 bg-[linear-gradient(135deg,rgba(244,163,0,0.12),rgba(255,255,255,0.04))] p-8 md:p-10">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-gold)]">
                  Ready to start
                </div>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                  Pick the earning path that fits how you want to work.
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/65 md:text-base">
                  Use offers for larger actions, tasks for consistency, and referrals for long-tail growth. EarnXact keeps all three paths inside one account.
                </p>
              </div>
              <Link href="/signup" className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-smoky-white)] px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90">
                Create Account
                <MdArrowOutward className="text-lg" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
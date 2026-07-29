import { MdCheckCircle, MdPlayCircleFilled } from "react-icons/md";

const benefits = [
  "No credit card or deposit needed",
  "Hundreds of tasks available immediately",
  "Cash out to PayPal, crypto & more"
];

export default function FirstPayoutSection() {
  return (
    <section className="border-t border-white/10 bg-[var(--brand-surface-2)]">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Your first payout is <br />
              <span className="text-[var(--brand-gold)]">one task away</span>
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/60 md:text-base">
              No credit card. No deposit. Join thousands of members earning daily -
              start right now.
            </p>

            <div className="mt-6 space-y-3">
              {benefits.map((benefit) => (
                <div key={benefit} className="flex items-start gap-3 text-white/75">
                  <MdCheckCircle className="mt-0.5 text-xl text-emerald-400" />
                  <span className="text-sm">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="md:justify-self-end">
            <div className="relative aspect-video w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-[var(--brand-card-1)]">
              <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_30%_30%,rgba(244,163,0,0.12),transparent_55%)]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex items-center gap-3 rounded-full border border-white/10 bg-black/50 px-5 py-3 text-white/80 backdrop-blur">
                  <MdPlayCircleFilled className="text-3xl text-[var(--brand-gold)]" />
                  <div className="text-sm font-medium">Watch how it works</div>
                </div>
              </div>
              <div className="absolute bottom-4 left-4 rounded-full border border-white/10 bg-black/50 px-4 py-2 text-xs text-white/70 backdrop-blur">
                EarnXact overview (placeholder)
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

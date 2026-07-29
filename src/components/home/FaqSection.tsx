"use client";

import { useState } from "react";
import { MdAdd, MdRemove } from "react-icons/md";

const faqs = [
  {
    q: "How much can you earn on EarnXact?",
    a: "Earnings depend on which tasks are available to you and how many you complete. Different offers have different reward amounts."
  },
  {
    q: "What is the minimum amount you can withdraw?",
    a: "Minimum withdrawal requirements can vary by payout method. Check the cashout page in your account for the latest limits and options."
  },
  {
    q: "How is EarnXact able to pay members?",
    a: "EarnXact partners with advertisers and offer providers. Rewards are funded through these partnerships when members complete eligible tasks."
  },
  {
    q: "How quickly will you get paid after making a withdrawal?",
    a: "Payout timing depends on the payout method and verification status. You’ll see an estimated processing time during withdrawal."
  },
  {
    q: "Does EarnXact have an age restriction?",
    a: "Eligibility depends on local laws and the requirements of offer providers. Review the platform terms for age and region restrictions."
  }
];

export default function FaqSection() {
  const [faqOpenId, setFaqOpenId] = useState<number | null>(null);

  return (
    <section className="border-t border-white/10 bg-[var(--brand-black)]">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-center text-3xl font-semibold tracking-tight text-white">
          Frequently Asked Questions
        </h2>

        <div className="mx-auto mt-8 max-w-3xl space-y-3">
          {faqs.map((faq, idx) => {
            const open = faqOpenId === idx;

            return (
              <button
                key={faq.q}
                type="button"
                onClick={() => setFaqOpenId(open ? null : idx)}
                className="w-full rounded-2xl border border-white/10 bg-[var(--brand-card-1)] px-5 py-4 text-left transition hover:border-white/15"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="text-sm font-semibold text-white">{faq.q}</div>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80">
                    {open ? (
                      <MdRemove className="text-xl" />
                    ) : (
                      <MdAdd className="text-xl" />
                    )}
                  </div>
                </div>
                <div
                  className={`grid transition-all duration-300 ${
                    open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="mt-3 text-sm leading-relaxed text-white/60">
                      {faq.a}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

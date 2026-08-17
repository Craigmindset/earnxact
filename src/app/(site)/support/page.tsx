"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { MdCheckCircle, MdClose, MdMailOutline, MdSend, MdSupportAgent } from "react-icons/md";

const FAQS = [
  {
    question: "How long does task approval take?",
    answer: "Approval timing depends on queue volume and review checks. Tasks that pass review are credited after approval, while flagged submissions may take longer.",
  },
  {
    question: "Why was my reward delayed or reversed?",
    answer: "Rewards may be delayed or reversed if advertiser validation fails, duplicate proof is detected, or the activity does not meet the task or offer rules.",
  },
  {
    question: "Can I use multiple accounts?",
    answer: "No. Multiple accounts, recycled referrals, and duplicate identities may trigger restrictions or permanent removal from the platform.",
  },
  {
    question: "How do I contact support about withdrawals?",
    answer: "Use the contact form below and include the account email, withdrawal context, and any useful timing details so the team can investigate quickly.",
  },
] as const;

export default function SupportPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(data?.error ?? "Failed to send your message. Please try again.");
        return;
      }

      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
      setShowSuccess(true);
    } catch {
      setError("Failed to send your message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-[var(--brand-black)]">
      <section className="border-b border-white/10 bg-[linear-gradient(180deg,rgba(5,5,5,0.84),rgba(5,5,5,0.96)),radial-gradient(900px_circle_at_20%_20%,rgba(244,163,0,0.16),transparent_35%)]">
        <div className="mx-auto max-w-6xl px-4 py-20 md:py-24">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--brand-gold)]/25 bg-[var(--brand-gold)]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand-gold)]">
            <MdSupportAgent className="text-sm" />
            Support
          </div>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-white md:text-6xl md:leading-[1.02]">
            Help for rewards, tasks, offers, referrals, and account issues.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/65 md:text-lg">
            Review common questions below or send a message directly to the EarnXact support team.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 md:py-20">
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[30px] border border-white/10 bg-white/[0.03] p-6 md:p-8">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-gold)]">
              FAQ
            </div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
              Common support questions
            </h2>
            <div className="mt-6 space-y-3">
              {FAQS.map((faq) => (
                <div key={faq.question} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-sm font-semibold text-white">{faq.question}</div>
                  <div className="mt-2 text-sm leading-relaxed text-white/65">{faq.answer}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-6 md:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--brand-gold)]/15 text-[var(--brand-gold)]">
                <MdMailOutline className="text-2xl" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-gold)]">
                  Contact Us
                </div>
                <h2 className="mt-1 text-2xl font-semibold text-white">Send a support message</h2>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="support-name" className="text-xs font-medium text-white/55">Name</label>
                <input
                  id="support-name"
                  type="text"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[var(--brand-gold)]/50"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label htmlFor="support-email" className="text-xs font-medium text-white/55">Email</label>
                <input
                  id="support-email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[var(--brand-gold)]/50"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="support-subject" className="text-xs font-medium text-white/55">Subject</label>
                <input
                  id="support-subject"
                  type="text"
                  required
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[var(--brand-gold)]/50"
                  placeholder="What do you need help with?"
                />
              </div>

              <div>
                <label htmlFor="support-message" className="text-xs font-medium text-white/55">Message</label>
                <textarea
                  id="support-message"
                  required
                  rows={6}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[var(--brand-gold)]/50"
                  placeholder="Describe the issue clearly so the support team can review it faster."
                />
              </div>

              {error ? <div className="text-sm text-red-300">{error}</div> : null}

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand-smoky-white)] px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/25 border-t-black" />
                    Sending...
                  </>
                ) : (
                  <>
                    <MdSend className="text-lg" />
                    Submit
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </section>

      {showSuccess ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[var(--brand-card-1)] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
                  <MdCheckCircle className="text-3xl" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Sent successfully</h3>
                  <p className="mt-1 text-sm leading-relaxed text-white/65">
                    Your message has been received. Our support team will review it and respond as soon as possible.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSuccess(false)}
                className="rounded-lg border border-white/10 p-2 text-white/65 transition hover:bg-white/5 hover:text-white"
              >
                <MdClose className="text-xl" />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
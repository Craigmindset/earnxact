"use client";

import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  MdBolt,
  MdCheckCircle,
  MdClose,
  MdConfirmationNumber,
  MdMail,
  MdSupportAgent
} from "react-icons/md";
import LiveChatWidget from "@/components/dashboard/LiveChatWidget";

const SUPPORT_EMAIL = "support@earnxact.com";
const MAX_MESSAGE_WORDS = 1000;

function countWords(value: string) {
  return value.trim().length === 0 ? 0 : value.trim().split(/\s+/).length;
}

export default function SupportPage() {
  const [subject, setSubject] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [ticketSubmitted, setTicketSubmitted] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const wordCount = countWords(message);

  function handleMessageChange(event: ChangeEvent<HTMLTextAreaElement>) {
    const value = event.target.value;

    if (countWords(value) <= MAX_MESSAGE_WORDS) {
      setMessage(value);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Backend integration point:
    // - Send { subject, name, email, message } to your support ticketing API.
    setTicketSubmitted(true);
    setShowModal(true);
    setSubject("");
    setName("");
    setEmail("");
    setMessage("");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--brand-gold)]/30 bg-[var(--brand-gold)]/10 px-3 py-1 text-xs font-semibold text-[var(--brand-gold)]">
            <MdBolt className="text-sm" />
            Support
          </div>

          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--brand-gold)]/15 text-[var(--brand-gold)]">
              <MdSupportAgent className="text-xl" />
            </div>
            <h1 className="text-2xl font-semibold text-white md:text-3xl">
              Get help from our team
            </h1>
          </div>

          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/60">
            Send us a message and we&apos;ll get back to you as soon as
            possible.
          </p>
        </div>

        <div
          className={`inline-flex shrink-0 items-center gap-2 self-start rounded-full border px-3 py-2 text-xs font-medium sm:self-auto ${
            ticketSubmitted
              ? "border-[var(--brand-gold)]/30 bg-[var(--brand-gold)]/10 text-[var(--brand-gold)]"
              : "border-white/10 bg-white/5 text-white/40"
          }`}
        >
          <MdConfirmationNumber className="text-base" />
          {ticketSubmitted ? "Ticket submitted · pending answer" : "No tickets submitted yet"}
        </div>
      </div>

      <a
        href={`mailto:${SUPPORT_EMAIL}`}
        className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10 md:p-5"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-gold)]/15 text-[var(--brand-gold)]">
          <MdMail className="text-lg" />
        </div>
        <div>
          <div className="text-sm font-semibold text-white">Prefer email?</div>
          <div className="text-xs text-white/60">
            Reach us anytime at{" "}
            <span className="text-[var(--brand-gold)]">{SUPPORT_EMAIL}</span>
          </div>
        </div>
      </a>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5 md:p-6"
      >
        <h2 className="text-sm font-semibold text-white md:text-base">
          Submit a ticket
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="support-subject" className="text-xs font-medium text-white/50">
              Subject
            </label>
            <input
              id="support-subject"
              type="text"
              required
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="What do you need help with?"
              className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-[var(--brand-gold)]/50"
            />
          </div>

          <div>
            <label htmlFor="support-name" className="text-xs font-medium text-white/50">
              Name
            </label>
            <input
              id="support-name"
              type="text"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your full name"
              className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-[var(--brand-gold)]/50"
            />
          </div>
        </div>

        <div>
          <label htmlFor="support-email" className="text-xs font-medium text-white/50">
            Email
          </label>
          <input
            id="support-email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-[var(--brand-gold)]/50"
          />
        </div>

        <div>
          <label htmlFor="support-message" className="text-xs font-medium text-white/50">
            Message
          </label>
          <textarea
            id="support-message"
            required
            rows={6}
            value={message}
            onChange={handleMessageChange}
            placeholder="Describe your issue in detail..."
            className="mt-1.5 w-full resize-none rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-[var(--brand-gold)]/50"
          />
          <div className="mt-1.5 text-right text-xs text-white/40">
            {wordCount} / {MAX_MESSAGE_WORDS} words
          </div>
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-[var(--brand-smoky-white)] px-4 py-2.5 text-sm font-semibold text-black transition hover:opacity-90 sm:w-auto"
        >
          Submit ticket
        </button>
      </form>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[var(--brand-card-1)] p-6 text-center">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              aria-label="Close"
              className="absolute right-4 top-4 text-white/40 transition hover:text-white"
            >
              <MdClose className="text-lg" />
            </button>

            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
              <MdCheckCircle className="text-2xl" />
            </div>

            <h2 className="mt-4 text-base font-semibold text-white">
              Ticket submitted successfully.
            </h2>
            <p className="mt-2 text-sm text-white/60">
              Our support team will get back to you shortly.
            </p>

            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="mt-5 w-full rounded-lg bg-[var(--brand-smoky-white)] px-4 py-2.5 text-sm font-semibold text-black transition hover:opacity-90"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <LiveChatWidget />
    </div>
  );
}

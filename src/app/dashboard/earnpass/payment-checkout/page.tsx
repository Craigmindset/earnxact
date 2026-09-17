"use client";

import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  MdArrowBack,
  MdOutlineAccountBalance,
  MdOutlineAttachFile,
  MdOutlineMail,
  MdOutlinePerson
} from "react-icons/md";
import { CURRENCY_SYMBOL } from "@/lib/currency";
import { createClient } from "@/lib/supabase/client";
import type { MembershipPlanRow } from "@/lib/database.types";

type CheckoutProfile = {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
};

type LoadState = "loading" | "ready" | "error";

const MAX_RECEIPT_SIZE_BYTES = 3 * 1024 * 1024;
const ACCEPTED_RECEIPT_TYPES = ["application/pdf", "image/jpeg", "image/png"];

export default function PaymentCheckoutPage() {
  return (
    <Suspense fallback={null}>
      <PaymentCheckoutContent />
    </Suspense>
  );
}

function PaymentCheckoutContent() {
  const searchParams = useSearchParams();
  const planId = searchParams.get("planId");

  const [state, setState] = useState<LoadState>("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [plan, setPlan] = useState<MembershipPlanRow | null>(null);
  const [profile, setProfile] = useState<CheckoutProfile>({
    firstName: null,
    lastName: null,
    email: null
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fullName = useMemo(() => {
    const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim();
    return name || "—";
  }, [profile.firstName, profile.lastName]);

  useEffect(() => {
    if (!planId) {
      setState("error");
      setMessage("No membership plan was selected.");
      return;
    }

    const selectedPlanId = planId;
    let cancelled = false;
    const supabase = createClient();

    async function loadCheckout() {
      const [{ data: userRes, error: userError }, { data: planRow, error: planError }] = await Promise.all([
        supabase.auth.getUser(),
        supabase
          .from("membership_plans")
          .select("id, name, amount, description, is_available, created_at")
          .eq("id", selectedPlanId)
          .maybeSingle()
      ]);

      if (cancelled) return;

      if (userError || !userRes?.user) {
        setState("error");
        setMessage("You need to be signed in to continue.");
        return;
      }

      if (planError || !planRow || !planRow.is_available) {
        setState("error");
        setMessage("This membership plan is not available.");
        return;
      }

      const { data: userProfile } = await supabase
        .from("user_profile")
        .select("first_name, last_name, email")
        .eq("user_id", userRes.user.id)
        .maybeSingle();

      if (cancelled) return;

      setPlan(planRow);
      setProfile({
        firstName: userProfile?.first_name ?? null,
        lastName: userProfile?.last_name ?? null,
        email: userProfile?.email ?? userRes.user.email ?? null
      });
      setState("ready");
    }

    loadCheckout();

    return () => {
      cancelled = true;
    };
  }, [planId]);

  function handleReceiptChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;

    setSubmitError(null);
    setSubmitSuccess(null);

    if (!nextFile) {
      setReceiptFile(null);
      setReceiptError(null);
      return;
    }

    if (!ACCEPTED_RECEIPT_TYPES.includes(nextFile.type)) {
      setReceiptFile(null);
      setReceiptError("Unsupported file format. Upload PDF, JPG, JPEG, or PNG.");
      event.target.value = "";
      return;
    }

    if (nextFile.size > MAX_RECEIPT_SIZE_BYTES) {
      setReceiptFile(null);
      setReceiptError("Receipt must be 3MB or smaller.");
      event.target.value = "";
      return;
    }

    setReceiptFile(nextFile);
    setReceiptError(null);
  }

  async function handlePaymentSubmission() {
    if (!receiptFile || !plan || submitting) return;

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const formData = new FormData();
      formData.append("planId", plan.id);
      formData.append("file", receiptFile);

      const response = await fetch("/api/payments/manual-submission", {
        method: "POST",
        body: formData
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setSubmitError(data?.error ?? "Failed to submit your receipt. Please try again.");
        return;
      }

      setSubmitSuccess(
        `Payment submitted successfully. Reference: ${data?.reference ?? "pending"}. Your receipt is now waiting for admin review.`
      );
      setReceiptFile(null);
      setReceiptError(null);
    } catch {
      setSubmitError("Failed to submit your receipt. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href="/dashboard/earnpass"
        className="inline-flex items-center gap-2 text-sm font-medium text-white/65 transition hover:text-white"
      >
        <MdArrowBack className="text-base" />
        Back to EarnPass
      </Link>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))]">
        <div className="border-b border-white/10 px-6 py-6 sm:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--brand-gold)]/30 bg-[var(--brand-gold)]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-gold)]">
            Payment checkout
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-white sm:text-3xl">Complete your EarnPass payment</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/65">
            Use the account details below to make your transfer, then keep your payment proof ready for confirmation.
          </p>
        </div>

        <div className="space-y-6 px-6 py-6 sm:px-8">
          <div className="space-y-4">
            {state === "loading" && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/60">
                Loading checkout details...
              </div>
            )}

            {state === "error" && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200">
                {message}
              </div>
            )}

            {state === "ready" && plan && (
              <div className="grid gap-4 xl:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-white/45">
                    <MdOutlinePerson className="text-base" />
                    User name
                  </div>
                  <div className="mt-3 text-lg font-semibold text-white">{fullName}</div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-white/45">
                    <MdOutlineMail className="text-base" />
                    Email
                  </div>
                  <div className="mt-3 break-all text-lg font-semibold text-white">
                    {profile.email || "—"}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="text-xs font-medium uppercase tracking-[0.14em] text-white/45">
                    Selected plan
                  </div>
                  <div className="mt-3 text-lg font-semibold text-white">{plan.name}</div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="text-xs font-medium uppercase tracking-[0.14em] text-white/45">
                    Amount
                  </div>
                  <div className="mt-3 text-lg font-semibold text-[var(--brand-gold)]">
                    {CURRENCY_SYMBOL}
                    {Number(plan.amount).toLocaleString()}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-[var(--brand-gold)]/20 bg-[var(--brand-gold)]/8 p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white px-2 py-2">
                <Image
                  src="/images/zenith logo.png"
                  alt="Zenith Bank logo"
                  fill
                  className="object-contain p-2"
                />
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-[var(--brand-gold)]/80">
                  <MdOutlineAccountBalance className="text-base" />
                  Payment account
                </div>
                <h2 className="mt-1 text-lg font-semibold text-white">Bank transfer details</h2>
              </div>
            </div>

            <div className="mt-6 grid gap-4 rounded-2xl border border-white/10 bg-black/20 p-5 md:grid-cols-3">
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.14em] text-white/45">Account number</div>
                <div className="mt-2 text-2xl font-semibold tracking-[0.08em] text-white">1313037857</div>
              </div>

              <div>
                <div className="text-xs font-medium uppercase tracking-[0.14em] text-white/45">Account name</div>
                <div className="mt-2 text-base font-semibold text-white">Tyolumum Enterprises</div>
              </div>

              <div>
                <div className="text-xs font-medium uppercase tracking-[0.14em] text-white/45">Bank</div>
                <div className="mt-2 text-base font-semibold text-white">Zenith Bank</div>
              </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-white/60">
              Ensure the transfer amount matches your selected plan exactly so the payment can be confirmed correctly.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-white/45">
              <MdOutlineAttachFile className="text-base" />
              Payment receipt
            </div>
            <h2 className="mt-3 text-lg font-semibold text-white">Upload your transfer receipt</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/60">
              Allowed formats: PDF, JPG, JPEG, PNG. Maximum file size: 3MB.
            </p>

            <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-black/20 px-5 py-8 text-center transition hover:border-[var(--brand-gold)]/40 hover:bg-[var(--brand-gold)]/5">
              <span className="rounded-full bg-white/10 p-3 text-white/70">
                <MdOutlineAttachFile className="text-xl" />
              </span>
              <span className="mt-4 text-sm font-medium text-white">
                {receiptFile ? receiptFile.name : "Choose receipt file"}
              </span>
              <span className="mt-1 text-xs text-white/50">
                {receiptFile
                  ? `${(receiptFile.size / (1024 * 1024)).toFixed(2)} MB selected`
                  : "Tap to upload a payment receipt"}
              </span>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleReceiptChange}
                className="sr-only"
                key={receiptFile ? receiptFile.name : "empty-receipt"}
              />
            </label>

            {receiptError && (
              <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {receiptError}
              </div>
            )}

            {submitError && (
              <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {submitError}
              </div>
            )}

            {submitSuccess && (
              <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                {submitSuccess}
              </div>
            )}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-white/55">
                The confirmation button stays inactive until a valid receipt is attached.
              </p>

              <button
                type="button"
                onClick={handlePaymentSubmission}
                disabled={!receiptFile || submitting || state !== "ready" || !plan}
                className="inline-flex items-center justify-center rounded-xl bg-[var(--brand-smoky-white)] px-6 py-3 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35"
              >
                {submitting ? "Submitting..." : "I have paid"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
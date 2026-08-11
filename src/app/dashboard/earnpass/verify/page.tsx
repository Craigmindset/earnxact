"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MdCheckCircle, MdErrorOutline, MdHourglassTop } from "react-icons/md";
import { CURRENCY_SYMBOL } from "@/lib/currency";

type VerifyState = "verifying" | "success" | "error";

export default function EarnPassVerifyPage() {
  return (
    <Suspense fallback={null}>
      <EarnPassVerifyContent />
    </Suspense>
  );
}

function EarnPassVerifyContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference") ?? searchParams.get("trxref");

  const [state, setState] = useState<VerifyState>("verifying");
  const [message, setMessage] = useState<string | null>(null);
  const [planName, setPlanName] = useState<string | null>(null);
  const [bonusAwarded, setBonusAwarded] = useState<number>(0);

  useEffect(() => {
    if (!reference) {
      setState("error");
      setMessage("Missing payment reference.");
      return;
    }

    let cancelled = false;

    async function verify() {
      try {
        const res = await fetch(`/api/payments/verify?reference=${encodeURIComponent(reference!)}`);
        const data = await res.json().catch(() => null);

        if (cancelled) return;

        if (!res.ok || !data?.success) {
          setState("error");
          setMessage(data?.error ?? "We couldn't confirm this payment.");
          return;
        }

        setState("success");
        setPlanName(data.planName ?? null);
        setBonusAwarded(Number(data.bonusAwarded ?? 0));
      } catch {
        if (!cancelled) {
          setState("error");
          setMessage("We couldn't confirm this payment.");
        }
      }
    }

    verify();
    return () => {
      cancelled = true;
    };
  }, [reference]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
      {state === "verifying" && (
        <>
          <MdHourglassTop className="text-4xl text-[var(--brand-gold)]" />
          <h1 className="text-lg font-semibold text-white">Confirming your payment…</h1>
          <p className="text-sm text-white/60">Please wait, this only takes a moment.</p>
        </>
      )}

      {state === "success" && (
        <>
          <MdCheckCircle className="text-4xl text-emerald-400" />
          <h1 className="text-lg font-semibold text-white">Payment successful</h1>
          <p className="text-sm text-white/60">
            {planName ? `You're now on the ${planName} plan.` : "Your EarnPass has been upgraded."}
          </p>
          {bonusAwarded > 0 && (
            <p className="text-sm font-semibold text-[var(--brand-gold)]">
              +{CURRENCY_SYMBOL}
              {bonusAwarded.toLocaleString()} bonus added to your wallet
            </p>
          )}
        </>
      )}

      {state === "error" && (
        <>
          <MdErrorOutline className="text-4xl text-red-400" />
          <h1 className="text-lg font-semibold text-white">Payment not confirmed</h1>
          <p className="text-sm text-white/60">{message}</p>
        </>
      )}

      <Link
        href="/dashboard/earnpass"
        className="mt-2 inline-flex items-center justify-center rounded-lg bg-[var(--brand-smoky-white)] px-5 py-2.5 text-sm font-semibold text-black transition hover:opacity-90"
      >
        Back to EarnPass
      </Link>
    </div>
  );
}

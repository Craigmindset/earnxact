"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MdCheckCircle, MdHourglassTop, MdOpenInNew, MdRefresh, MdReportProblem } from "react-icons/md";
import { CURRENCY_SYMBOL } from "@/lib/currency";
import { createClient } from "@/lib/supabase/client";
import type { MembershipPaymentSubmissionStatus } from "@/lib/database.types";
import { useUserProfile } from "@/hooks/useUserProfile";

type PaymentSubmission = {
  id: string;
  reference: string;
  plan_id: string;
  plan_name: string;
  expected_amount: number;
  receipt_url: string;
  receipt_file_name: string;
  receipt_mime_type: string;
  receipt_size_bytes: number;
  status: MembershipPaymentSubmissionStatus;
  admin_note: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  applied_at: string | null;
};

const FILTERS = ["all", "pending", "rejected", "applied"] as const;

function formatMoney(amount: number) {
  return `${CURRENCY_SYMBOL}${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatFileSize(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function StatusBadge({ status }: { status: MembershipPaymentSubmissionStatus }) {
  const styles = {
    pending: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    rejected: "border-red-500/30 bg-red-500/10 text-red-300",
    applied: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
  } as const;

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${styles[status]}`}>
      {status}
    </span>
  );
}

export default function PaymentStatusPage() {
  const { userId } = useUserProfile();
  const [submissions, setSubmissions] = useState<PaymentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const supabase = createClient();

  async function loadSubmissions() {
    const { data, error: rpcError } = await supabase.rpc("get_my_membership_payment_submissions");

    if (rpcError) {
      setError(rpcError.message);
      setSubmissions([]);
      setLoading(false);
      return;
    }

    setSubmissions((data ?? []) as PaymentSubmission[]);
    setError(null);
    setLoading(false);
  }

  useEffect(() => {
    if (!userId) {
      setSubmissions([]);
      setLoading(false);
      return;
    }

    void loadSubmissions();

    const channel = supabase
      .channel(`my_membership_payment_submissions_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "membership_payment_submissions",
          filter: `user_id=eq.${userId}`
        },
        () => {
          setLoading(true);
          void loadSubmissions();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const filteredSubmissions = useMemo(
    () => submissions.filter((submission) => filter === "all" || submission.status === filter),
    [filter, submissions]
  );

  const summary = useMemo(
    () => ({
      total: submissions.length,
      pending: submissions.filter((item) => item.status === "pending").length,
      rejected: submissions.filter((item) => item.status === "rejected").length,
      applied: submissions.filter((item) => item.status === "applied").length
    }),
    [submissions]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white md:text-3xl">Payment Status</h1>
          <p className="mt-1 text-sm text-white/50">
            Track your uploaded transfer receipts, pending reviews, and completed EarnPass approvals.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/earnpass"
            className="inline-flex items-center rounded-xl bg-[var(--brand-smoky-white)] px-4 py-2.5 text-sm font-semibold text-black transition hover:opacity-90"
          >
            Submit another receipt
          </Link>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              void loadSubmissions();
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/10"
          >
            <MdRefresh className="text-base" />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-white/50">Total</div>
          <div className="mt-2 text-3xl font-semibold text-white">{summary.total}</div>
        </div>
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-amber-300">Pending</div>
          <div className="mt-2 text-3xl font-semibold text-white">{summary.pending}</div>
        </div>
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-red-300">Rejected</div>
          <div className="mt-2 text-3xl font-semibold text-white">{summary.rejected}</div>
        </div>
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-300">Applied</div>
          <div className="mt-2 text-3xl font-semibold text-white">{summary.applied}</div>
        </div>
      </div>

      {summary.pending > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-100">
          <MdHourglassTop className="mt-0.5 shrink-0 text-xl text-amber-300" />
          <div>
            <div className="font-semibold">Payment awaiting admin approval</div>
            <div className="mt-1 text-sm text-amber-100/85">
              You have {summary.pending} pending payment {summary.pending === 1 ? "submission" : "submissions"}. Admin will review the receipt before your EarnPass is activated.
            </div>
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                filter === option
                  ? "border-[var(--brand-gold)]/40 bg-[var(--brand-gold)]/15 text-[var(--brand-gold)]"
                  : "border-white/10 bg-black/20 text-white/60 hover:text-white"
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10 bg-black/20">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-white/50">
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Reference</th>
                <th className="px-4 py-3 font-medium">Receipt</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Review Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {!loading && filteredSubmissions.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-white/50">
                    No payment submissions found for this filter.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-white/50">
                    Loading payment status...
                  </td>
                </tr>
              )}

              {filteredSubmissions.map((submission) => (
                <tr key={submission.id} className="transition hover:bg-white/5">
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium text-white/85">{submission.plan_name}</div>
                    {submission.applied_at ? (
                      <div className="mt-1 text-[11px] text-white/40">Applied {formatDateTime(submission.applied_at)}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 align-top font-medium text-[var(--brand-gold)]">
                    {formatMoney(submission.expected_amount)}
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-white/55">{submission.reference}</td>
                  <td className="px-4 py-3 align-top">
                    <a
                      href={submission.receipt_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/10"
                    >
                      <MdOpenInNew className="text-sm" />
                      View receipt
                    </a>
                    <div className="mt-2 text-xs text-white/45">
                      {submission.receipt_file_name} • {formatFileSize(submission.receipt_size_bytes)}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-white/55">
                    {formatDateTime(submission.submitted_at)}
                    {submission.reviewed_at ? (
                      <div className="mt-1 text-[11px] text-white/40">Reviewed {formatDateTime(submission.reviewed_at)}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <StatusBadge status={submission.status} />
                  </td>
                  <td className="px-4 py-3 align-top">
                    {submission.admin_note ? (
                      <div className="max-w-xs text-sm leading-relaxed text-white/70">{submission.admin_note}</div>
                    ) : submission.status === "pending" ? (
                      <div className="inline-flex items-center gap-2 text-sm text-amber-300">
                        <MdHourglassTop className="text-base" />
                        Waiting for admin review
                      </div>
                    ) : submission.status === "applied" ? (
                      <div className="inline-flex items-center gap-2 text-sm text-emerald-300">
                        <MdCheckCircle className="text-base" />
                        Payment approved and applied
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 text-sm text-red-300">
                        <MdReportProblem className="text-base" />
                        No note added
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
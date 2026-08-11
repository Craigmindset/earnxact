import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Confirms an EarnPass payment with Paystack (the only source of truth for
 * whether money actually moved) and, only on a verified success, applies
 * the plan from the transaction's own metadata (set server-side at
 * /api/payments/initialize) to the signed-in user - never a plan/amount
 * supplied by the client on this request. The actual DB writes (plan,
 * account_type, +5% wallet bonus, transaction records) all happen
 * atomically and idempotently inside apply_membership_payment() - see
 * supabase/migrations/0005_membership_payment_processing.sql.
 */
export async function GET(request: Request) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    console.error("[Payments] PAYSTACK_SECRET_KEY is not configured");
    return NextResponse.json({ error: "Payments are not configured yet." }, { status: 500 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const reference = searchParams.get("reference");

  if (!reference) {
    return NextResponse.json({ error: "Missing payment reference" }, { status: 400 });
  }

  try {
    const paystackRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${secretKey}` } }
    );

    const paystackData = await paystackRes.json();

    if (!paystackRes.ok || !paystackData?.status) {
      return NextResponse.json(
        { error: paystackData?.message ?? "Failed to verify payment" },
        { status: 502 }
      );
    }

    const transaction = paystackData.data;

    if (transaction?.status !== "success") {
      return NextResponse.json({ error: "Payment was not successful", status: transaction?.status });
    }

    const metaUserId = transaction.metadata?.user_id;
    const planId = transaction.metadata?.plan_id;
    const amountPaid = Number(transaction.amount) / 100;

    // The reference belongs to whoever it was created for, not necessarily
    // whoever is currently signed in on this browser - refuse to apply a
    // plan to the wrong account.
    if (!planId || metaUserId !== user.id) {
      return NextResponse.json({ error: "This payment does not belong to your account." }, { status: 403 });
    }

    const { data: result, error: rpcError } = await supabase
      .rpc("apply_membership_payment", {
        p_plan_id: planId,
        p_reference: reference,
        p_amount: amountPaid
      })
      .single();

    if (rpcError || !result) {
      console.error("[Payments] Failed to apply membership plan after payment", rpcError);
      return NextResponse.json({ error: "Payment succeeded but activating your plan failed. Contact support." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      planId,
      planName: result.plan_name,
      bonusAwarded: Number(result.bonus_awarded),
      newWalletBalance: Number(result.new_wallet_balance)
    });
  } catch (err) {
    console.error("[Payments] Unexpected error verifying payment", err);
    return NextResponse.json({ error: "Failed to verify payment" }, { status: 500 });
  }
}

import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Called directly by CPX Research's servers (not the browser) - must stay
// public/unauthenticated, and must run on Node.js so `crypto` is available.
export const runtime = "nodejs";

const PROVIDER = "cpx";

// CPX's standard secure hash is md5(trans_id + "-" + your security hash).
// Confirm the exact formula/param names against your CPX publisher
// dashboard's postback docs - some CPX setups differ slightly.
function isValidHash(transId: string, hash: string, secret: string) {
  const expected = createHash("md5").update(`${transId}-${secret}`).digest("hex");
  return expected === hash;
}

export async function GET(request: Request) {
  const secret = process.env.CPX_SECURITY_HASH;
  if (!secret) {
    console.error("[CPX Postback] CPX_SECURITY_HASH is not configured");
    return new NextResponse("0", { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const transId = searchParams.get("trans_id");
  const userId = searchParams.get("user_id");
  const hash = searchParams.get("hash");
  const amountLocalRaw = searchParams.get("amount_local");
  const offerId = searchParams.get("offer_id");

  if (!transId || !userId || !hash || !amountLocalRaw) {
    return new NextResponse("0", { status: 400 });
  }

  if (!isValidHash(transId, hash, secret)) {
    console.warn("[CPX Postback] Hash mismatch - rejecting", { transId });
    return new NextResponse("0", { status: 401 });
  }

  const amount = Number(amountLocalRaw);
  if (!Number.isFinite(amount) || amount <= 0) {
    return new NextResponse("0", { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    if (status === "2") {
      // Chargeback/reversal: only reverse a transaction we still have
      // recorded as 'credited', so a duplicate reversal postback is a no-op.
      const { data: reversedRows, error: reverseError } = await supabase
        .from("offerwall_transactions")
        .update({ status: "reversed" })
        .eq("provider", PROVIDER)
        .eq("external_trans_id", transId)
        .eq("status", "credited")
        .select();

      if (reverseError) {
        console.error("[CPX Postback] Failed to mark transaction reversed", reverseError);
        return new NextResponse("0", { status: 500 });
      }

      if (reversedRows && reversedRows.length > 0) {
        const { error: creditError } = await supabase.rpc("credit_offerwall_transaction", {
          p_user_id: userId,
          p_amount: -amount,
          p_reference: "cpx_reversal",
          p_description: `CPX reward reversed: ${transId}${offerId ? ` (offer ${offerId})` : ""}`
        });

        if (creditError) {
          console.error("[CPX Postback] Failed to debit reversed reward", creditError);
          return new NextResponse("0", { status: 500 });
        }
      }

      return new NextResponse("1", { status: 200 });
    }

    // Idempotent insert: if this trans_id was already recorded (a retried
    // postback), ignoreDuplicates means no row comes back and we skip
    // crediting the wallet a second time.
    const { data: insertedRows, error: insertError } = await supabase
      .from("offerwall_transactions")
      .upsert(
        { user_id: userId, provider: PROVIDER, external_trans_id: transId, amount, status: "credited" },
        { onConflict: "provider,external_trans_id", ignoreDuplicates: true }
      )
      .select();

    if (insertError) {
      console.error("[CPX Postback] Failed to record transaction", insertError);
      return new NextResponse("0", { status: 500 });
    }

    if (insertedRows && insertedRows.length > 0) {
      const { error: creditError } = await supabase.rpc("credit_offerwall_transaction", {
        p_user_id: userId,
        p_amount: amount,
        p_reference: "cpx",
        p_description: `CPX Research reward: ${transId}${offerId ? ` (offer ${offerId})` : ""}`
      });

      if (creditError) {
        console.error("[CPX Postback] Failed to credit wallet", creditError);
        return new NextResponse("0", { status: 500 });
      }
    }

    return new NextResponse("1", { status: 200 });
  } catch (err) {
    console.error("[CPX Postback] Unexpected error", err);
    return new NextResponse("0", { status: 500 });
  }
}

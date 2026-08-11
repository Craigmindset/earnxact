import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { CURRENCY_CODE } from "@/lib/currency";

export const runtime = "nodejs";

/**
 * Starts a Paystack checkout for an EarnPass membership plan. Only ever
 * charges the amount stored server-side on public.membership_plans (never
 * a client-supplied amount), and stamps the user + plan onto the
 * transaction's metadata so /api/payments/verify can attribute the
 * eventual payment back to the right user/plan without trusting anything
 * else the client sends.
 */
export async function POST(request: Request) {
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

  if (userError || !user || !user.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let planId: unknown;
  try {
    const body = await request.json();
    planId = body?.planId;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (typeof planId !== "string" || planId.length === 0) {
    return NextResponse.json({ error: "Missing membership plan" }, { status: 400 });
  }

  const { data: plan, error: planError } = await supabase
    .from("membership_plans")
    .select("id, name, amount, is_available")
    .eq("id", planId)
    .maybeSingle();

  if (planError || !plan) {
    return NextResponse.json({ error: "Membership plan not found" }, { status: 404 });
  }

  if (!plan.is_available || Number(plan.amount) <= 0) {
    return NextResponse.json({ error: "This plan is not available for purchase." }, { status: 400 });
  }

  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host");
  const protocol = headersList.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const callbackUrl = `${protocol}://${host}/dashboard/earnpass/verify`;

  try {
    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: user.email,
        // Paystack expects the smallest currency unit (kobo for NGN).
        amount: Math.round(Number(plan.amount) * 100),
        currency: CURRENCY_CODE,
        callback_url: callbackUrl,
        metadata: {
          user_id: user.id,
          plan_id: plan.id,
          plan_name: plan.name
        }
      })
    });

    const paystackData = await paystackRes.json();

    if (!paystackRes.ok || !paystackData?.status) {
      console.error("[Payments] Paystack initialize failed", paystackData);
      return NextResponse.json(
        { error: paystackData?.message ?? "Failed to start payment" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      authorizationUrl: paystackData.data.authorization_url,
      reference: paystackData.data.reference
    });
  } catch (err) {
    console.error("[Payments] Unexpected error initializing payment", err);
    return NextResponse.json({ error: "Failed to start payment" }, { status: 500 });
  }
}

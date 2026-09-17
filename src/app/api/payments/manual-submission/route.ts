import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 3 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

function getManualPaymentConfigError() {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    return "Manual payment uploads are not configured yet. Missing CLOUDINARY_CLOUD_NAME.";
  }

  if (!process.env.CLOUDINARY_API_KEY) {
    return "Manual payment uploads are not configured yet. Missing CLOUDINARY_API_KEY.";
  }

  if (!process.env.CLOUDINARY_API_SECRET) {
    return "Manual payment uploads are not configured yet. Missing CLOUDINARY_API_SECRET.";
  }

  return null;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const errorRecord = error as Record<string, unknown>;
    const directMessage = errorRecord.message;

    if (typeof directMessage === "string" && directMessage.trim()) {
      return directMessage;
    }

    const nestedError = errorRecord.error;
    if (typeof nestedError === "object" && nestedError !== null) {
      const nestedMessage = (nestedError as Record<string, unknown>).message;
      if (typeof nestedMessage === "string" && nestedMessage.trim()) {
        return nestedMessage;
      }
    }

    const httpCode = errorRecord.http_code;
    if (typeof httpCode === "number") {
      return `Cloudinary request failed with status ${httpCode}`;
    }
  }

  return "Failed to submit payment receipt";
}

export async function POST(request: Request) {
  const configError = getManualPaymentConfigError();
  if (configError) {
    console.error("[ManualPayment] Configuration error", configError);
    return NextResponse.json({ error: configError }, { status: 500 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const planId = formData.get("planId");
  const file = formData.get("file");

  if (typeof planId !== "string" || planId.length === 0) {
    return NextResponse.json({ error: "Missing membership plan" }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No receipt uploaded" }, { status: 400 });
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Unsupported file type. Please upload a PDF, JPG, JPEG, or PNG receipt." },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: "Receipt is too large. Maximum size is 3MB." },
      { status: 400 }
    );
  }

  let receiptUrl: string;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUri = `data:${file.type};base64,${base64}`;

    const uploadResult = await cloudinary.uploader.upload(dataUri, {
      folder: "earnxact/membership-payment-receipts",
      public_id: `${user.id}_${planId}_${Date.now()}`,
      resource_type: "auto"
    });

    if (!uploadResult.secure_url) {
      console.error("[ManualPayment] Cloudinary upload returned no secure_url", uploadResult);
      return NextResponse.json({ error: "Failed to upload payment receipt" }, { status: 502 });
    }

    receiptUrl = uploadResult.secure_url;
  } catch (err) {
    console.error("[ManualPayment] Cloudinary upload failed", err);
    return NextResponse.json({ error: `Failed to upload payment receipt: ${getErrorMessage(err)}` }, { status: 502 });
  }

  try {
    const { data, error: rpcError } = await supabase.rpc("create_membership_payment_submission", {
      p_plan_id: planId,
      p_receipt_url: receiptUrl,
      p_receipt_file_name: file.name,
      p_receipt_mime_type: file.type,
      p_receipt_size_bytes: file.size
    });

    if (rpcError) {
      return NextResponse.json({ error: rpcError.message }, { status: 400 });
    }

    const result = data?.[0];

    if (!result) {
      return NextResponse.json({ error: "Failed to create payment submission" }, { status: 500 });
    }

    return NextResponse.json({
      submissionId: result.submission_id,
      reference: result.reference,
      planName: result.plan_name,
      expectedAmount: result.expected_amount,
      status: result.status
    });
  } catch (err) {
    console.error("[ManualPayment] Submission RPC failed", err);
    return NextResponse.json({ error: `Failed to record payment receipt: ${getErrorMessage(err)}` }, { status: 500 });
  }
}
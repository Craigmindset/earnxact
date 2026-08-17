import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { createClient } from "@/lib/supabase/server";

// Buffers/File APIs used here require the Node.js runtime (not Edge).
export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024; // 4MB
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

function getTaskSubmissionConfigError() {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    return "Task submissions are not configured yet. Missing CLOUDINARY_CLOUD_NAME.";
  }

  if (!process.env.CLOUDINARY_API_KEY) {
    return "Task submissions are not configured yet. Missing CLOUDINARY_API_KEY.";
  }

  if (!process.env.CLOUDINARY_API_SECRET) {
    return "Task submissions are not configured yet. Missing CLOUDINARY_API_SECRET.";
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

  return "Failed to submit task";
}

/**
 * Uploads the authenticated user's proof screenshot for today's daily task
 * to Cloudinary, then calls submit_daily_task() to atomically record the
 * submission and credit the wallet. The Cloudinary API secret never reaches
 * the browser - this route runs entirely server-side.
 */
export async function POST(request: Request) {
  const configError = getTaskSubmissionConfigError();
  if (configError) {
    console.error("[TaskSubmit] Configuration error", configError);
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

  const file = formData.get("file");
  const templateId = formData.get("templateId");

  if (typeof templateId !== "string" || templateId.length === 0) {
    return NextResponse.json({ error: "Missing task template id" }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No proof screenshot provided" }, { status: 400 });
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Unsupported file type. Please upload a JPEG, PNG, WEBP or GIF image." },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: "Image is too large. Maximum size is 4MB." },
      { status: 400 }
    );
  }

  let proofUrl: string;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUri = `data:${file.type};base64,${base64}`;

    // public_id is derived from the authenticated user's own id + template +
    // timestamp (never from client input), so uploads can't collide/overwrite
    // another user's or another day's proof.
    const uploadResult = await cloudinary.uploader.upload(dataUri, {
      folder: "earnxact/task-submissions",
      public_id: `${user.id}_${templateId}_${Date.now()}`,
      resource_type: "image"
    });

    if (!uploadResult.secure_url) {
      console.error("[TaskSubmit] Cloudinary upload returned no secure_url", uploadResult);
      return NextResponse.json({ error: "Failed to upload proof screenshot" }, { status: 502 });
    }

    proofUrl = uploadResult.secure_url;
  } catch (err) {
    console.error("[TaskSubmit] Cloudinary upload failed", err);
    return NextResponse.json({ error: `Failed to upload proof screenshot: ${getErrorMessage(err)}` }, { status: 502 });
  }

  try {
    const { data, error: rpcError } = await supabase.rpc("submit_daily_task", {
      p_template_id: templateId,
      p_proof_url: proofUrl
    });

    if (rpcError) {
      return NextResponse.json({ error: rpcError.message }, { status: 400 });
    }

    const result = data?.[0];

    if (!result) {
      return NextResponse.json({ error: "Submission failed" }, { status: 500 });
    }

    return NextResponse.json({
      status: result.status,
      reward: result.reward,
      newWalletBalance: result.new_wallet_balance
    });
  } catch (err) {
    console.error("[TaskSubmit] Task submission RPC failed", err);
    return NextResponse.json({ error: `Failed to record task submission: ${getErrorMessage(err)}` }, { status: 500 });
  }
}

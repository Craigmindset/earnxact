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

/**
 * Uploads the authenticated user's new profile photo to Cloudinary and saves
 * the resulting URL on their user_profile row. The Cloudinary API secret
 * never reaches the browser — this route runs entirely server-side.
 */
export async function POST(request: Request) {
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

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No image file provided" }, { status: 400 });
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

  try {
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUri = `data:${file.type};base64,${base64}`;

    // public_id is derived from the authenticated user's own id (never from
    // client input), so uploads can't overwrite another user's asset.
    const uploadResult = await cloudinary.uploader.upload(dataUri, {
      folder: "earnxact/avatars",
      public_id: user.id,
      overwrite: true,
      resource_type: "image"
    });

    const { error: updateError } = await supabase
      .from("user_profile")
      .update({ avatar_url: uploadResult.secure_url })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("[Avatar] Failed to save avatar_url on user_profile", updateError);
      return NextResponse.json({ error: "Failed to save profile image" }, { status: 500 });
    }

    return NextResponse.json({ avatarUrl: uploadResult.secure_url });
  } catch (err) {
    console.error("[Avatar] Cloudinary upload failed", err);
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
  }
}

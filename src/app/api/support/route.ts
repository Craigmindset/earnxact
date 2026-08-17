import { NextResponse } from "next/server";

type SupportPayload = {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
};

function isBlank(value: string | undefined) {
  return !value || value.trim().length === 0;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as SupportPayload | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { name, email, subject, message } = body;

  if ([name, email, subject, message].some((value) => isBlank(value))) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  return NextResponse.json({ success: true, message: "Support message sent successfully" });
}
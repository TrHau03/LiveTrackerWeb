import { NextRequest, NextResponse } from "next/server";

import { INSTAGRAM_APP_ID } from "@/lib/instagram-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const INSTAGRAM_TOKEN_URL = "https://api.instagram.com/oauth/access_token";

export async function POST(request: NextRequest) {
  const secret = process.env.INSTAGRAM_APP_SECRET ?? "";

  if (!secret) {
    return NextResponse.json(
      {
        success: false,
        message: "Missing INSTAGRAM_APP_SECRET environment variable.",
      },
      { status: 500 },
    );
  }

  let payload: {
    code?: string;
    redirectUri?: string;
  } = {};

  try {
    payload = (await request.json()) as {
      code?: string;
      redirectUri?: string;
    };
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid JSON body.",
      },
      { status: 400 },
    );
  }

  const code = payload.code?.trim() ?? "";
  const redirectUri = payload.redirectUri?.trim() ?? "";

  if (!code || !redirectUri) {
    return NextResponse.json(
      {
        success: false,
        message: "Missing code or redirectUri.",
      },
      { status: 400 },
    );
  }

  const body = new URLSearchParams({
    client_id: INSTAGRAM_APP_ID,
    client_secret: secret,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
  });

  const response = await fetch(INSTAGRAM_TOKEN_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  const data = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    return NextResponse.json(
      {
        success: false,
        message:
          extractErrorMessage(data) || "Failed to exchange Instagram code.",
        data,
      },
      { status: response.status },
    );
  }

  return NextResponse.json({
    success: true,
    message: "Exchanged Instagram code successfully.",
    data: {
      accessToken:
        typeof data.access_token === "string" ? data.access_token : "",
      userId: typeof data.user_id === "string" ? data.user_id : "",
    },
  });
}

function extractErrorMessage(data: Record<string, unknown>) {
  if (typeof data.error_message === "string" && data.error_message.trim()) {
    return data.error_message;
  }

  if (typeof data.error_description === "string" && data.error_description.trim()) {
    return data.error_description;
  }

  const error = data.error;
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    if (typeof record.message === "string" && record.message.trim()) {
      return record.message;
    }
  }

  return "";
}

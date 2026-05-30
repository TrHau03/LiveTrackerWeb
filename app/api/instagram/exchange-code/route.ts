import { NextRequest, NextResponse } from "next/server";

const INSTAGRAM_TOKEN_URL = "https://api.instagram.com/oauth/access_token";

/**
 * POST /api/instagram/exchange-code
 *
 * Exchanges an Instagram authorization code for a short-lived access token.
 * The client_secret is kept server-side and never exposed to the browser.
 *
 * Body: { code: string; redirectUri: string }
 * Response: { success: true; data: { accessToken: string; userId: string } }
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      code?: string;
      redirectUri?: string;
    };

    const code = body.code?.trim();
    const redirectUri = body.redirectUri?.trim();

    if (!code) {
      return NextResponse.json(
        { success: false, message: "Missing required field: code" },
        { status: 400 },
      );
    }

    if (!redirectUri) {
      return NextResponse.json(
        { success: false, message: "Missing required field: redirectUri" },
        { status: 400 },
      );
    }

    const clientId = process.env.INSTAGRAM_CLIENT_ID ?? process.env.NEXT_PUBLIC_INSTAGRAM_CLIENT_ID;
    const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error("[instagram/exchange-code] Missing INSTAGRAM_CLIENT_ID or INSTAGRAM_CLIENT_SECRET");
      return NextResponse.json(
        { success: false, message: "Server configuration error: missing Instagram credentials" },
        { status: 500 },
      );
    }

    // Exchange authorization code for short-lived token via Instagram API
    const formData = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    });

    const igResponse = await fetch(INSTAGRAM_TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
      cache: "no-store",
    });

    const igPayload = (await igResponse.json()) as Record<string, unknown>;

    if (!igResponse.ok) {
      const errorMsg =
        (igPayload.error_message as string) ||
        (igPayload.error_description as string) ||
        (igPayload.message as string) ||
        "Instagram token exchange failed";
      return NextResponse.json(
        { success: false, message: errorMsg },
        { status: 400 },
      );
    }

    const accessToken = igPayload.access_token as string;
    const userId = String(igPayload.user_id ?? "");

    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: "No access_token returned by Instagram" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Token exchanged successfully",
      data: { accessToken, userId },
    });
  } catch (err) {
    console.error("[instagram/exchange-code] Unexpected error:", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}

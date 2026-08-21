import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

/**
 * Server-side ephemeral token endpoint.
 *
 * The permanent GEMINI_API_KEY lives only on the server. This route uses
 * the official @google/genai SDK (client.authTokens.create) to mint a
 * short-lived Live API token and returns only that token to the browser.
 * The API key is never exposed, logged, or included in responses.
 *
 * https://ai.google.dev/gemini-api/docs/live-api/ephemeral-tokens
 */
export const runtime = "nodejs";

const TOKEN_TTL_MS = 30 * 60 * 1000;
const NEW_SESSION_TTL_MS = 60 * 1000;

function toSafeCategory(error: unknown): string | undefined {
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as { status: number }).status;
    if (status === 400) return "INVALID_KEY_OR_REQUEST";
    if (status === 401 || status === 403) return "UNAUTHENTICATED_OR_FORBIDDEN";
    if (status === 404) return "NOT_FOUND";
    if (status === 429) return "RATE_LIMITED";
    if (status >= 500) return "GEMINI_SERVER_ERROR";
  }
  return "UNKNOWN";
}

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;
  const geminiApiKeyConfigured = Boolean(apiKey && apiKey.trim().length > 0);

  if (!geminiApiKeyConfigured) {
    console.error("[gemini] GEMINI_API_KEY is not configured on the server.");
    return NextResponse.json(
      { error: "server_not_configured", geminiApiKeyConfigured: false },
      { status: 500 },
    );
  }

  try {
    const client = new GoogleGenAI({ apiKey });
    const token = await client.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
        newSessionExpireTime: new Date(
          Date.now() + NEW_SESSION_TTL_MS,
        ).toISOString(),
      },
    });

    if (!token.name) {
      console.error("[gemini] auth_tokens response did not include a token name.");
      return NextResponse.json(
        { error: "token_fetch_failed", category: "MISSING_TOKEN_NAME" },
        { status: 502 },
      );
    }

    return NextResponse.json({ token: token.name });
  } catch (error) {
    const category = toSafeCategory(error);
    const message = error instanceof Error ? error.message : String(error);
    // Safe diagnostics only: category and message never contain the key.
    console.error(`[gemini] auth_tokens create failed [${category}]: ${message.slice(0, 300)}`);
    return NextResponse.json(
      { error: "token_fetch_failed", category },
      { status: 502 },
    );
  }
}
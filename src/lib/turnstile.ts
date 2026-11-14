import "server-only";
import { randomUUID } from "node:crypto";

type SiteverifyReply = {
  success: boolean;
  action?: string;
  "error-codes"?: string[];
};

export type TurnstileVerification = "valid" | "invalid" | "unconfigured" | "misconfigured" | "unavailable";

export async function verifyRegistrationTurnstile(token: string): Promise<TurnstileVerification> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return "unconfigured";
  if (!token || token.length > 2048) return "invalid";

  const idempotencyKey = randomUUID();
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const body = new URLSearchParams({ secret, response: token, idempotency_key: idempotencyKey });
      const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body,
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      });
      const result = await response.json().catch(() => null) as SiteverifyReply | null;
      if (!response.ok) {
        console.error("Turnstile Siteverify returned an HTTP error:", { status: response.status, attempt, errorCodes: result?.["error-codes"] ?? [] });
        if (response.status >= 500 && attempt < 2) continue;
        return "unavailable";
      }
      if (!result) {
        console.error("Turnstile Siteverify returned an unreadable response:", { attempt });
        return "unavailable";
      }
      if (result?.["error-codes"]?.some((code) => code === "invalid-input-secret" || code === "missing-input-secret")) {
        console.error("Turnstile Siteverify rejected the configured secret:", { errorCodes: result["error-codes"] });
        return "misconfigured";
      }
      if (result["error-codes"]?.includes("internal-error")) {
        if (attempt < 2) continue;
        return "unavailable";
      }
      return result?.success && result.action === "registration" ? "valid" : "invalid";
    } catch (error) {
      console.error("Turnstile Siteverify request failed:", { attempt, reason: error instanceof Error ? error.name : "unknown" });
      if (attempt === 2) return "unavailable";
    }
  }
  return "unavailable";
}

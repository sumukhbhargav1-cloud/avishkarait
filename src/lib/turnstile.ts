import "server-only";

type SiteverifyReply = {
  success: boolean;
  action?: string;
};

export type TurnstileVerification = "valid" | "invalid" | "unconfigured" | "unavailable";

export async function verifyRegistrationTurnstile(token: string): Promise<TurnstileVerification> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return "unconfigured";
  if (!token || token.length > 2048) return "invalid";

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ secret, response: token }),
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) return "unavailable";
    const result = await response.json() as SiteverifyReply;
    return result.success && result.action === "registration" ? "valid" : "invalid";
  } catch {
    return "unavailable";
  }
}

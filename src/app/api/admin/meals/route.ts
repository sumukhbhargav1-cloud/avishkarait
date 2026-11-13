import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.admin || !auth.supabase) return auth.response!;
  let body: { token?: string; email?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Enter a participant QR code or email." }, { status: 400 }); }
  let tokenHash: string | null = null;
  if (body.token?.trim()) tokenHash = createHash("sha256").update(body.token.trim()).digest("hex");
  else if (body.email?.trim()) {
    const { data } = await auth.supabase.from("participant_qr_tokens").select("token_hash,registrations!inner(status,payment_status)").eq("participant_email", body.email.trim().toLowerCase()).is("revoked_at", null).eq("registrations.status", "confirmed").eq("registrations.payment_status", "confirmed").maybeSingle();
    tokenHash = data?.token_hash ?? null;
    if (!tokenHash) return NextResponse.json({ outcome: "invalid", message: "No confirmed participant matches that email." }, { status: 404 });
  }
  if (!tokenHash) return NextResponse.json({ error: "Enter a participant QR code or email." }, { status: 400 });
  const { data, error } = await auth.supabase.rpc("admin_meal_checkin", { p_token_hash: tokenHash, p_admin_user_id: auth.admin.id });
  if (error) return NextResponse.json({ error: "Could not save meal check-in." }, { status: 500 });
  const messages: Record<string, string> = { success: "Meal collected and check-in saved.", duplicate: "This participant has already collected a meal.", invalid: "This QR code is not valid for the portal.", unconfirmed: "Payment must be confirmed before meal collection." };
  return NextResponse.json({ ...data, message: messages[data.outcome] ?? "Check-in could not be completed." }, { status: data.outcome === "success" ? 200 : data.outcome === "duplicate" ? 409 : 400 });
}

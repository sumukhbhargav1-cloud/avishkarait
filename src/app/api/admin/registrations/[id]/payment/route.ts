import { createHash, randomBytes, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/admin-auth";
import { openSecret, sealSecret } from "@/lib/credential-vault";

export const dynamic = "force-dynamic";

async function findAuthUserByEmail(supabase: ReturnType<typeof getSupabaseAdmin>, email: string) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const match = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (match) return match;
    if (data.users.length < 1000) break;
  }
  return null;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (!auth.admin || !auth.supabase) return auth.response!;
  const { id } = await context.params;
  let action = "confirm";
  try { action = String((await request.json()).action ?? "confirm"); } catch { /* default confirm */ }
  const supabase = auth.supabase;
  const { data: registration, error: readError } = await supabase.from("registrations").select("*").eq("id", id).maybeSingle();
  if (readError || !registration) return NextResponse.json({ error: "Registration not found." }, { status: 404 });

  if (action === "reject") {
    const { error } = await supabase.rpc("admin_mark_payment_rejected", {
      p_registration_id: id,
      p_admin_user_id: auth.admin.id,
      p_reason: "Payment proof requires correction or could not be verified.",
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 409 });
    return NextResponse.json({ success: true, paymentStatus: "rejected" });
  }
  if (action !== "confirm") return NextResponse.json({ error: "Choose confirm or reject." }, { status: 400 });

  if (registration.payment_status === "confirmed") {
    let temporaryPassword: string | null = null;
    if (registration.temporary_password_ciphertext) {
      try {
        temporaryPassword = openSecret({ ciphertext: registration.temporary_password_ciphertext, nonce: registration.temporary_password_nonce, tag: registration.temporary_password_tag });
      } catch (error) {
        console.error("Could not read encrypted temporary credentials:", error);
      }
    }
    return NextResponse.json({ success: true, idempotent: true, temporaryPassword, credentialNote: temporaryPassword ? null : "This participant account already existed. Use the account’s current sign-in method.", registration });
  }

  const { data: claimed, error: claimError } = await supabase.rpc("admin_claim_registration_confirmation", { p_registration_id: id, p_admin_user_id: auth.admin.id });
  if (claimError || !claimed) return NextResponse.json({ error: "Payment confirmation is already being processed. Refresh in a moment." }, { status: 409 });

  let createdPassword: string | null = null;
  try {
    const { data: members, error: membersError } = await supabase.from("registration_members").select("full_name,email,phone").eq("registration_id", id);
    if (membersError) throw membersError;
    let user = await findAuthUserByEmail(supabase, registration.team_leader_email);
    if (!user) {
      if (registration.temporary_password_ciphertext) {
        createdPassword = openSecret({ ciphertext: registration.temporary_password_ciphertext, nonce: registration.temporary_password_nonce, tag: registration.temporary_password_tag });
      } else {
        createdPassword = randomBytes(24).toString("base64url");
        const candidate = sealSecret(createdPassword);
        const { error: credentialError } = await supabase.from("registrations").update({ temporary_password_ciphertext: candidate.ciphertext, temporary_password_nonce: candidate.nonce, temporary_password_tag: candidate.tag }).eq("id", id).eq("payment_status", "pending");
        if (credentialError) throw credentialError;
      }
      const { data, error } = await supabase.auth.admin.createUser({
        email: registration.team_leader_email,
        password: createdPassword,
        email_confirm: true,
        user_metadata: { full_name: registration.team_leader_name, phone: registration.team_leader_phone, must_change_password: true },
      });
      if (error) throw error;
      user = data.user;
    } else if (registration.temporary_password_ciphertext) {
      createdPassword = openSecret({ ciphertext: registration.temporary_password_ciphertext, nonce: registration.temporary_password_nonce, tag: registration.temporary_password_tag });
    }
    if (!user) throw new Error("Could not create or locate the team leader account.");
    const { error: profileError } = await supabase.from("profiles").upsert({ id: user.id, full_name: registration.team_leader_name, phone: registration.team_leader_phone }, { onConflict: "id" });
    if (profileError) throw profileError;

    const roster = [{ full_name: registration.team_leader_name, email: registration.team_leader_email }, ...(members ?? [])];
    const qrRecords = await Promise.all(roster.map(async (person) => {
      const raw = randomBytes(32).toString("base64url");
      const sealed = sealSecret(raw);
      return {
        registration_id: id,
        participant_email: person.email.toLowerCase(),
        participant_name: person.full_name,
        token_hash: createHash("sha256").update(raw).digest("hex"),
        token_ciphertext: sealed.ciphertext,
        token_nonce: sealed.nonce,
        token_tag: sealed.tag,
      };
    }));
    const { error: qrError } = await supabase.from("participant_qr_tokens").upsert(qrRecords, { onConflict: "registration_id,participant_email" });
    if (qrError) throw qrError;
    const { data: updated, error: updateError } = await supabase.from("registrations").update({
      team_leader_id: user.id,
      payment_status: "confirmed",
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
      confirmation_claimed_at: null,
    }).eq("id", id).eq("payment_status", "pending").select("*").maybeSingle();
    if (updateError) throw updateError;
    if (!updated) throw new Error("The registration changed while confirmation was being saved.");

    await supabase.from("admin_audit_log").insert({ admin_user_id: auth.admin.id, action: "payment_confirmed", entity_type: "registration", entity_id: id, details: { team_name: registration.team_name, participant_count: roster.length } });
    return NextResponse.json({ success: true, temporaryPassword: createdPassword, credentialNote: createdPassword ? null : "This participant account already existed. Use the account’s current sign-in method.", registration: updated });
  } catch (error) {
    await supabase.rpc("admin_release_registration_confirmation", { p_registration_id: id });
    console.error("Payment confirmation failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Payment could not be confirmed." }, { status: 500 });
  }
}

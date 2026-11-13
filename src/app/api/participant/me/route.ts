import { NextResponse } from "next/server";
import { openSecret } from "@/lib/credential-vault";
import { requirePortalUser } from "@/lib/portal-auth";

export async function GET(request: Request) {
  const auth = await requirePortalUser(request);
  if (!auth.user || !auth.supabase) return auth.response!;
  const { data: registration } = await auth.supabase.from("registrations").select("id,team_name,domain_slug,domain_name,challenge_id,team_size,status,payment_status,registration_reference,team_leader_name,team_leader_email,team_leader_phone,registration_members(full_name,email,phone)").eq("team_leader_id", auth.user.id).eq("status", "confirmed").maybeSingle();
  if (!registration) return NextResponse.json({ error: "No confirmed team registration is linked to this account." }, { status: 404 });
  const { data: tokens } = await auth.supabase.from("participant_qr_tokens").select("participant_email,participant_name,token_ciphertext,token_nonce,token_tag").eq("registration_id", registration.id).is("revoked_at", null);
  const qrs = (tokens ?? []).map((token) => ({ email: token.participant_email, name: token.participant_name, value: openSecret({ ciphertext: token.token_ciphertext, nonce: token.token_nonce, tag: token.token_tag }) }));
  const { data: accommodations } = await auth.supabase.from("accommodation_requests").select("id,guest_count,check_in,check_out,requirements,status,created_at").eq("registration_id", registration.id).order("created_at", { ascending: false });
  return NextResponse.json({ registration, qrs, accommodations: accommodations ?? [], mustChangePassword: auth.user.user_metadata?.must_change_password === true });
}

import { NextResponse } from "next/server";
import { registrationDomains } from "@/config/registration-domains";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = await requireAdmin(request);
  if (!context.admin || !context.supabase) return context.response!;
  const { supabase } = context;
  const [{ data: registrations, error }, { data: accommodations }, { data: mealCheckins }, { data: attempts }] = await Promise.all([
    supabase.from("registrations").select("id,team_name,domain_slug,domain_name,challenge_id,team_size,team_leader_name,team_leader_email,team_leader_phone,status,payment_status,utr_reference,payment_proof_path,submitted_at,created_at,registration_reference,confirmed_at,registration_members(id,full_name,email,phone)").order("created_at", { ascending: false }),
    supabase.from("accommodation_requests").select("id,registration_id,participant_name,guest_count,check_in,check_out,requirements,status,created_at").order("created_at", { ascending: false }),
    supabase.from("meal_checkins").select("id,checked_in_at,participant_token_id,participant_qr_tokens(participant_name,participant_email,registration_id)").order("checked_in_at", { ascending: false }).limit(100),
    supabase.from("meal_checkin_attempts").select("id,outcome,created_at").order("created_at", { ascending: false }).limit(100),
  ]);
  if (error) {
    console.error("Admin registration query failed:", error.message);
    return NextResponse.json({ error: "Could not load registrations. Apply the portal migrations first." }, { status: 503 });
  }
  const all = registrations ?? [];
  const ids = all.map((registration) => registration.id);
  const teamNames = new Map(all.map((registration) => [registration.id, registration.team_name]));
  const requests = (accommodations ?? []).map((requestItem) => ({ ...requestItem, teamName: teamNames.get(requestItem.registration_id) ?? "Unknown team" }));
  const checkins = (mealCheckins ?? []).map((item) => {
    const token = Array.isArray(item.participant_qr_tokens) ? item.participant_qr_tokens[0] : item.participant_qr_tokens;
    return { ...item, participantName: token?.participant_name ?? "Participant", participantEmail: token?.participant_email ?? "", teamName: token ? teamNames.get(token.registration_id) ?? "Unknown team" : "Unknown team" };
  });
  const signedCards = await Promise.all(all.map(async (registration) => {
    let paymentProofUrl: string | null = null;
    if (registration.payment_proof_path) {
      const { data } = await supabase.storage.from("payment-proofs").createSignedUrl(registration.payment_proof_path, 60 * 5);
      paymentProofUrl = data?.signedUrl ?? null;
    }
    return { ...registration, paymentProofUrl };
  }));
  const domains = registrationDomains.map((domain) => {
    const registered = all.filter((registration) => registration.domain_slug === domain.slug).length;
    return { slug: domain.slug, name: domain.name, capacity: domain.capacity, registered, remaining: Math.max(0, domain.capacity - registered) };
  });
  return NextResponse.json({
    registrations: signedCards,
    accommodations: requests,
    mealCheckins: checkins,
    mealAttempts: attempts ?? [],
    metrics: {
      teams: all.length,
      participants: all.reduce((sum, item) => sum + (item.team_size ?? 0), 0),
      paymentPending: all.filter((item) => item.payment_status === "pending").length,
      paymentConfirmed: all.filter((item) => item.payment_status === "confirmed").length,
      accommodationRequests: requests.filter((item) => item.status === "pending").length,
      mealCheckins: mealCheckins?.length ?? 0,
    },
    domains,
  });
}

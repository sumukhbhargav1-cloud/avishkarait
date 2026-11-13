import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { paymentConfig, registrationDomains } from "@/config/registration-domains";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { validatePaymentProof, validateRegistrationInput } from "@/lib/registration-validation";
import { verifyRegistrationTurnstile } from "@/lib/turnstile";

export const dynamic = "force-dynamic";

const bucketName = "payment-proofs";
const fileTypes = new Map([["image/png", "png"], ["image/jpeg", "jpg"], ["image/webp", "webp"]]);

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "The registration form could not be read." }, { status: 400 });
  }

  if (String(formData.get("website") ?? "").trim()) {
    return NextResponse.json({ error: "Registration could not be accepted." }, { status: 400 });
  }
  const turnstile = await verifyRegistrationTurnstile(String(formData.get("turnstileToken") ?? ""));
  if (turnstile === "unconfigured") {
    return NextResponse.json({ error: "Registration security verification is not configured. No registration was saved." }, { status: 503 });
  }
  if (turnstile === "unavailable") {
    return NextResponse.json({ error: "Anti-spam verification is temporarily unavailable. Please try again." }, { status: 503 });
  }
  if (turnstile !== "valid") {
    return NextResponse.json({ error: "Anti-spam verification expired or failed. Please complete it again." }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(String(formData.get("registration") ?? ""));
  } catch {
    return NextResponse.json({ error: "The registration details are invalid." }, { status: 400 });
  }
  const validated = validateRegistrationInput(payload);
  if (validated.error || !validated.input || !validated.domain) {
    return NextResponse.json({ error: validated.error ?? "Check the registration details." }, { status: 400 });
  }
  const proof = formData.get("paymentProof");
  if (!(proof instanceof File)) return NextResponse.json({ error: "Upload your payment screenshot." }, { status: 400 });
  const proofError = await validatePaymentProof(proof);
  if (proofError) return NextResponse.json({ error: proofError }, { status: 400 });
  if (!paymentConfig.upiId || !validated.domain.capacity) {
    return NextResponse.json({ error: "Payment or capacity configuration is incomplete. No registration was saved." }, { status: 503 });
  }

  let supabase: ReturnType<typeof getSupabaseAdmin>;
  try {
    supabase = getSupabaseAdmin();
  } catch (error) {
    console.error("Registration service is not configured:", error);
    return NextResponse.json({ error: "Registration service is not configured. No registration was saved." }, { status: 503 });
  }

  const registrationId = randomUUID();
  const extension = fileTypes.get(proof.type)!;
  const proofPath = `${registrationId}/payment-proof.${extension}`;
  const buffer = Buffer.from(await proof.arrayBuffer());
  const { error: uploadError } = await supabase.storage.from(bucketName).upload(proofPath, buffer, {
    contentType: proof.type,
    cacheControl: "0",
    upsert: false,
  });
  if (uploadError) {
    console.error("Private payment proof upload failed:", uploadError.message);
    return NextResponse.json({ error: "Payment screenshot could not be stored securely. No registration was saved." }, { status: 500 });
  }

  const input = validated.input;
  const { data, error } = await supabase.rpc("submit_registration", {
    p_registration_id: registrationId,
    p_domain_slug: validated.domain.slug,
    p_domain_name: validated.domain.name,
    p_challenge_id: input.challengeId,
    p_capacity: validated.domain.capacity,
    p_minimum_team_size: validated.domain.challengeSelection === "at_event" ? validated.domain.minimumTeamSize : validated.domain.challenges.find((item) => item.id === input.challengeId)!.minimumTeamSize,
    p_maximum_team_size: validated.domain.challengeSelection === "at_event" ? validated.domain.maximumTeamSize : validated.domain.challenges.find((item) => item.id === input.challengeId)!.maximumTeamSize,
    p_team_name: input.teamName.trim(),
    p_team_size: input.teamSize,
    p_leader_name: input.leader.fullName.trim(),
    p_leader_email: input.leader.email.trim().toLowerCase(),
    p_leader_phone: input.leader.phone.trim(),
    p_members: input.members.map((member) => ({
      fullName: member.fullName.trim(),
      email: member.email.trim().toLowerCase(),
      phone: member.phone.trim(),
    })),
    p_utr_reference: input.utrReference.trim(),
    p_payment_proof_path: proofPath,
  });

  if (error || !data?.length) {
    await supabase.storage.from(bucketName).remove([proofPath]);
    const message = error?.message ?? "Registration was not confirmed.";
    const status = error?.code === "P0001" ? 409 : error?.code === "23505" ? 409 : error?.code === "22023" ? 400 : 500;
    return NextResponse.json({ error: message, saved: false }, { status });
  }

  const result = data[0];
  return NextResponse.json({
    success: true,
    registrationReference: result.registration_reference,
    domain: validated.domain.name,
    teamName: input.teamName.trim(),
    teamLeaderPhone: input.leader.phone.trim(),
    status: "payment_pending",
    paymentStatus: "pending",
    registeredTeams: Number(result.registered_teams),
    remainingSlots: Number(result.remaining_slots),
  }, { status: 201, headers: { "cache-control": "no-store" } });
}

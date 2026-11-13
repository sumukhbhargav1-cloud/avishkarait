import { NextResponse } from "next/server";
import { requirePortalUser } from "@/lib/portal-auth";

export async function POST(request: Request) {
  const auth = await requirePortalUser(request);
  if (!auth.user || !auth.supabase) return auth.response!;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Check the accommodation request fields." }, { status: 400 }); }
  const guests = Number(body.guestCount);
  const requirements = String(body.requirements ?? "").trim();
  const checkIn = body.checkIn ? String(body.checkIn) : null;
  const checkOut = body.checkOut ? String(body.checkOut) : null;
  if (!Number.isInteger(guests) || guests < 1 || guests > 10 || requirements.length > 1000 || (checkIn && checkOut && checkOut <= checkIn)) {
    return NextResponse.json({ error: "Guest count, dates or requirements are invalid." }, { status: 400 });
  }
  const { data: registration } = await auth.supabase.from("registrations").select("id,team_leader_name").eq("team_leader_id", auth.user.id).eq("status", "confirmed").maybeSingle();
  if (!registration) return NextResponse.json({ error: "No confirmed team is linked to this account." }, { status: 403 });
  const { data, error } = await auth.supabase.from("accommodation_requests").insert({ registration_id: registration.id, participant_user_id: auth.user.id, participant_name: registration.team_leader_name, guest_count: guests, check_in: checkIn, check_out: checkOut, requirements }).select("id,status,guest_count,check_in,check_out,requirements").single();
  if (error) return NextResponse.json({ error: "Could not save the accommodation request." }, { status: 500 });
  return NextResponse.json({ success: true, request: data }, { status: 201 });
}

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

const statuses = new Set(["approved", "rejected", "completed"]);
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (!auth.admin || !auth.supabase) return auth.response!;
  const { id } = await context.params;
  let status = "";
  try { status = String((await request.json()).status ?? ""); } catch { /* invalid body */ }
  if (!statuses.has(status)) return NextResponse.json({ error: "Choose approve, reject or complete." }, { status: 400 });
  const { data, error } = await auth.supabase.from("accommodation_requests").update({ status }).eq("id", id).select("id,status,registration_id").maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Could not update this accommodation request." }, { status: 404 });
  await auth.supabase.from("admin_audit_log").insert({ admin_user_id: auth.admin.id, action: `accommodation_${status}`, entity_type: "accommodation_request", entity_id: id });
  return NextResponse.json({ success: true, request: data });
}

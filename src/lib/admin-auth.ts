import "server-only";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function requireAdmin(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return { response: NextResponse.json({ error: "Sign in with an administrator account." }, { status: 401 }) };
  try {
    const supabase = getSupabaseAdmin();
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return { response: NextResponse.json({ error: "Your session is invalid or expired." }, { status: 401 }) };
    const { data: profile, error: profileError } = await supabase.from("profiles").select("role,full_name").eq("id", user.id).maybeSingle();
    if (profileError || profile?.role !== "admin") return { response: NextResponse.json({ error: "Administrator access is required." }, { status: 403 }) };
    return { admin: { id: user.id, email: user.email ?? "", name: profile.full_name ?? "Administrator" }, supabase };
  } catch (error) {
    console.error("Admin authentication could not be checked:", error);
    return { response: NextResponse.json({ error: "Portal administration is not configured." }, { status: 503 }) };
  }
}

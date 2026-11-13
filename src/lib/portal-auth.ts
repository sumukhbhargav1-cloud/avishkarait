import "server-only";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function requirePortalUser(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return { response: NextResponse.json({ error: "Sign in to continue." }, { status: 401 }) };
  try {
    const supabase = getSupabaseAdmin();
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return { response: NextResponse.json({ error: "Your session is invalid or expired." }, { status: 401 }) };
    return { user, supabase };
  } catch {
    return { response: NextResponse.json({ error: "Participant portal is not configured." }, { status: 503 }) };
  }
}

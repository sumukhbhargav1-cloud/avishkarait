import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ configured: false, authenticated: false }, { status: 503 });
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ configured: true, authenticated: false });
  return NextResponse.json({ configured: true, authenticated: true, email: user.email ?? null });
}

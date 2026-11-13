import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const failure = () => NextResponse.json(
  { error: 'Sign-in failed. Check your username and passphrase.' },
  { status: 401, headers: { 'cache-control': 'no-store' } },
);

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Request origin is not allowed.' }, { status: 403 });
  }

  const expectedUsername = process.env.ADMIN_LOGIN_USERNAME;
  const authEmail = process.env.ADMIN_LOGIN_EMAIL;
  if (!expectedUsername || !authEmail) {
    return NextResponse.json({ error: 'Admin sign-in is not configured on the server.' }, { status: 503 });
  }

  let body: { username?: unknown; passphrase?: unknown };
  try {
    body = await request.json();
  } catch {
    return failure();
  }
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const passphrase = typeof body.passphrase === 'string' ? body.passphrase : '';
  if (!username || username.length > 80 || !passphrase || passphrase.length > 256) return failure();

  // The public form accepts a username. Supabase Auth uses the administrator's
  // internally configured email as the account identifier; no email is sent.
  if (username.toLowerCase() !== expectedUsername.trim().toLowerCase()) return failure();

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email: authEmail, password: passphrase });
  if (error || !data.user) return failure();

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle();
  if (profileError || profile?.role !== 'admin') {
    await supabase.auth.signOut();
    return failure();
  }

  return NextResponse.json({ success: true }, { headers: { 'cache-control': 'no-store' } });
}


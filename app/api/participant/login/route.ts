import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// ── rate-limiting store ──────────────────────────────────────────────────────
const rateLimitStore = new Map<string, number[]>();

function checkRateLimit(key: string, maxRequests = 5, windowMs = 10000): boolean {
  const now = Date.now();
  const timestamps = rateLimitStore.get(key) || [];
  const recent = timestamps.filter((t) => now - t < windowMs);
  if (recent.length >= maxRequests) return false;
  recent.push(now);
  rateLimitStore.set(key, recent);
  return true;
}

// ── participant login POST ────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  // ── rate limiting ───────────────────────────────────────────────────────────
  const ip = request.ip ?? 'unknown';
  if (!checkRateLimit(`participant-login-${ip}`, 5, 10_000)) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again later.' },
      { status: 429, headers: { 'cache-control': 'no-store' } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'The login data could not be read.' },
      { status: 400, headers: { 'cache-control': 'no-store' } }
    );
  }

  const { email, passphrase } = body as { email: string; passphrase: string };

  if (!email || !passphrase) {
    return NextResponse.json(
      { error: 'Email and passphrase are required.' },
      { status: 400, headers: { 'cache-control': 'no-store' } }
    );
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Supabase is not configured.' },
      { status: 503, headers: { 'cache-control': 'no-store' } }
    );
  }

  // ── sign in with password using the passphrase ─────────────────────────────
  const { data, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: passphrase,
  });

  if (signInError || !data.user || !data.session) {
    return NextResponse.json(
      { error: 'Invalid email or passphrase.' },
      { status: 401, headers: { 'cache-control': 'no-store' } }
    );
  }

  // ── verify profiles.role === 'participant' ──────────────────────────────────
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle()

  if (profileError || !(profile?.role === 'participant' || profile?.role === 'team_leader')) {
    // Sign out the user since they don't have participant role
    try {
      await supabase.auth.signOut()
    } catch {}
    return NextResponse.json(
      { error: 'Access denied. This account does not have participant role.' },
      { status: 403, headers: { 'cache-control': 'no-store' } }
    );
  }

  // ── return success with user info and session data ────────────────────────
  // Session data is required for the browser client to establish an authenticated session
  return NextResponse.json(
    {
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      },
    },
    { headers: { 'cache-control': 'no-store' } }
  )
}
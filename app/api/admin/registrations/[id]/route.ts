import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedContext } from '@/lib/auth/require-user';

const schema = z.object({ status: z.enum(['pending', 'approved', 'rejected']) });

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { supabase, user, role } = await getAuthenticatedContext();
  if (!supabase) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  if (role !== 'admin') return NextResponse.json({ error: 'Administrator role required.' }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid registration status.' }, { status: 400 });

  const status = parsed.data.status;
  const { error } = await supabase.from('registrations').update({
    status,
    reviewed_at: new Date().toISOString(),
    reviewed_by: user.id,
    approved_at: status === 'approved' ? new Date().toISOString() : null,
  }).eq('id', params.id);

  if (error) return NextResponse.json({ error: 'Registration status could not be updated.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const { supabase, user, role } = await getAuthenticatedContext();

  if (!supabase) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  if (role !== 'admin') return NextResponse.json({ error: 'Administrator role required.' }, { status: 403 });

  const registrationId = params.id;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(registrationId)) {
    return NextResponse.json({ error: 'Invalid registration ID.' }, { status: 400 });
  }

  // Foreign keys cascade registrations -> teams -> team members,
  // accommodation requests and meal check-ins. Keep the auth/profile account.
  const { data, error } = await supabase
    .from('registrations')
    .delete()
    .eq('id', registrationId)
    .select('id, team_name, team_uid')
    .maybeSingle();

  if (error) {
    console.error('ADMIN REGISTRATION DELETE ERROR:', error.message);
    return NextResponse.json(
      { error: 'Registration could not be deleted. Check linked records and database constraints.' },
      { status: 500 }
    );
  }
  if (!data) return NextResponse.json({ error: 'Registration not found or no longer available.' }, { status: 404 });

  return NextResponse.json({
    ok: true,
    deleted: { id: data.id, teamName: data.team_name, teamUid: data.team_uid },
  });
}

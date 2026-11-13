import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedContext } from '@/lib/auth/require-user';

const schema = z.object({ status: z.enum(['pending', 'confirmed', 'declined']) });

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { supabase, user, role } = await getAuthenticatedContext();
  if (!supabase) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });
  if (!user || role !== 'admin') return NextResponse.json({ error: 'Administrator access is required.' }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Choose a valid accommodation status.' }, { status: 400 });
  const { error } = await supabase.from('accommodation_requests').update({ status: parsed.data.status }).eq('id', params.id);
  if (error) return NextResponse.json({ error: 'Accommodation status could not be updated.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

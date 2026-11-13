import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedContext } from '@/lib/auth/require-user';

const schema = z.object({ qrValue: z.string().trim().min(10).max(200), mealType: z.enum(['breakfast', 'lunch', 'dinner']) });
function indiaDate() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export async function POST(request: Request) {
  const { supabase, user, role } = await getAuthenticatedContext();
  if (!supabase) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });
  if (!user || role !== 'admin') return NextResponse.json({ error: 'Administrator access is required.' }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Scan a valid AVISHKAR team QR code.' }, { status: 400 });
  const token = parsed.data.qrValue.replace(/^AV26MEAL:/i, '');
  if (!/^[a-f0-9]{32}$/i.test(token)) return NextResponse.json({ error: 'This QR code is not an AVISHKAR team code.' }, { status: 400 });
  const { data: team } = await supabase.from('teams').select('id,name').eq('meal_qr_token', token).maybeSingle();
  if (!team) return NextResponse.json({ error: 'Team QR code not recognised.' }, { status: 404 });
  const mealDate = indiaDate();
  const { error } = await supabase.from('meal_checkins').insert({ team_id: team.id, meal_date: mealDate, meal_type: parsed.data.mealType, scanned_by: user.id });
  if (error?.code === '23505') return NextResponse.json({ error: `${team.name} has already checked in for ${parsed.data.mealType} today.` }, { status: 409 });
  if (error) return NextResponse.json({ error: 'Meal check-in could not be recorded.' }, { status: 500 });
  return NextResponse.json({ ok: true, teamName: team.name, mealType: parsed.data.mealType, mealDate });
}

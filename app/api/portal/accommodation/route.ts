import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedContext } from '@/lib/auth/require-user';

const schema = z.object({
  teamId: z.string().uuid(),
  participantCount: z.number().int().min(1).max(10),
  arrivalDate: z.string().date(),
  departureDate: z.string().date(),
  notes: z.string().trim().max(2000),
}).refine((value) => value.departureDate > value.arrivalDate, { message: 'Departure must be after arrival.' });

export async function PUT(request: Request) {
  const { supabase, user } = await getAuthenticatedContext();
  if (!supabase) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });
  if (!user) return NextResponse.json({ error: 'Sign in to submit an accommodation request.' }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Check participant count and accommodation dates.' }, { status: 400 });
  const value = parsed.data;
  const { data: team } = await supabase.from('teams').select('id').eq('id', value.teamId).eq('leader_id', user.id).maybeSingle();
  if (!team) return NextResponse.json({ error: 'This team is not managed by the signed-in leader.' }, { status: 404 });
  const { count: memberCount, error: memberCountError } = await supabase.from('team_members').select('id', { count: 'exact', head: true }).eq('team_id', team.id);
  if (memberCountError) return NextResponse.json({ error: 'Team size could not be verified.' }, { status: 500 });
  if (value.participantCount > (memberCount ?? 0)) return NextResponse.json({ error: 'Accommodation participant count cannot exceed the registered team size.' }, { status: 400 });
  const { error } = await supabase.from('accommodation_requests').upsert({
    team_id: team.id,
    participant_count: value.participantCount,
    arrival_date: value.arrivalDate,
    departure_date: value.departureDate,
    notes: value.notes,
    status: 'pending',
  }, { onConflict: 'team_id' });
  if (error) return NextResponse.json({ error: 'Accommodation request could not be saved.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from 'next/server';
import { registrationInputSchema } from '@/lib/registration-schema';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Request origin is not allowed.' }, { status: 403 });
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'Supabase is not configured. Registration has not been submitted.' }, { status: 503 });

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user?.email) return NextResponse.json({ error: 'Sign in required to register a participant.' }, { status: 401 });

  let payload: unknown;
  try { payload = await request.json(); }
  catch { return NextResponse.json({ error: 'The registration data could not be read.' }, { status: 400 }); }

  const parsed = registrationInputSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Check the required fields and try again.', fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const input = parsed.data;
  if (input.leaderEmail.toLowerCase() !== user.email.toLowerCase()) {
    return NextResponse.json({ error: 'The team leader email must match the signed-in email.' }, { status: 400 });
  }

  const { data, error } = await supabase.rpc('submit_team_registrations', {
    p_leader_name: input.leaderName,
    p_leader_email: input.leaderEmail,
    p_leader_phone: input.leaderPhone,
    p_leader_github: input.leaderGithubUsername || null,
    p_teams: input.teams.map(team => ({
      teamName: team.teamName,
      institution: team.institution,
      city: team.city,
      state: team.state,
      domainId: team.domainId,
      challengeId: team.challengeId,
      members: team.members.map(member => ({ fullName: member.fullName, email: member.email, githubUsername: member.githubUsername || null })),
      repositoryUrl: team.repositoryUrl || null,
      rulesAccepted: team.rulesAccepted,
    })),
  });

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: error.message }, { status: 409 });
    if (error.code === '28000') return NextResponse.json({ error: error.message }, { status: 401 });
    if (error.code === '22023') return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: 'Registration could not be saved. No registration was confirmed.' }, { status: 500 });
  }

  const saved = Array.isArray(data) ? data : [];
  if (!saved.length || saved.some(item => !item.registration_reference)) return NextResponse.json({ error: 'Registration was not confirmed. Please try again.' }, { status: 500 });
  const { data: identifiers } = await supabase.from('registrations').select('id,team_uid').in('id', saved.map(item => item.registration_id));
  const teamUidByRegistration = new Map((identifiers ?? []).map(item => [item.id, item.team_uid]));
  return NextResponse.json({
    registrations: saved.map(item => ({ registrationId: item.registration_id, teamId: item.team_id, teamUid: teamUidByRegistration.get(item.registration_id) ?? null, domain: item.domain_name, referenceId: item.registration_reference, status: item.registration_status })),
  }, { status: 201 });
}

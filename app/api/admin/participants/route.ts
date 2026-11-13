import { NextResponse } from 'next/server';
import { getAuthenticatedContext } from '@/lib/auth/require-user';

export async function GET(request: Request) {
  const { supabase, user, role } = await getAuthenticatedContext();
  if (!supabase) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  if (role !== 'admin') return NextResponse.json({ error: 'Administrator role required.' }, { status: 403 });

  try {
    // Fetch registrations with verified nested relationships (same pattern as app/admin/page.tsx)
    // Using ONLY allowed tables and verified field names
    const { data: registrations, error } = await supabase
      .from('registrations')
      .select(`
        id,
        reference_id,
        team_uid,
        team_name,
        institution,
        status,
        created_at,
        challenge_id,
        domain:domains(id, name, event_details),
        team:teams(id, name, institution, college_city, college_state, domain_id, challenge_id, assigned_repository_url, members:team_members(id, full_name, email, github_username, is_leader))
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching registrations:', error);
      return NextResponse.json({ error: 'Registrations could not be fetched.' }, { status: 500 });
    }

    // Also fetch domains for filter options
    const { data: domains, error: domainsError } = await supabase
      .from('domains')
      .select('id, name, slug, is_active')
      .order('name');

    if (domainsError) {
      console.error('Error fetching domains:', domainsError);
    }

    // Build domain filter options
    const domainOptions = (domains || []).map((d: any) => ({
      value: d.id,
      label: d.name,
    }));

    // Transform registrations for the participants page
    const transformedRegistrations = (registrations || []).map((reg: any) => {
      const team = reg.team || {};
      const domain = reg.domain?.[0] || {};
      const members = team.members || [];

      // Determine registration status (pending / approved / rejected)
      const registrationStatus = reg.status || 'pending';

      // Get institution
      const institution = reg.institution || team.institution || 'Unknown College';

      // Calculate member count
      const memberCount = members.length;

      // Get the team leader from members (first is_leader member) or team name
      const leader = members.find((m: any) => m.is_leader);
      const leaderName = leader ? leader.full_name : (team.name ? `${team.name} Team` : 'Unknown');

      // Format created date
      const createdAt = reg.created_at ? new Date(reg.created_at).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }) : 'Unknown';

      return {
        id: reg.id,
        reference_id: reg.reference_id,
        team_uid: reg.team_uid,
        team_name: reg.team_name || team.name || 'Unnamed Team',
        institution,
        domain: {
          id: domain.id,
          name: domain.name || 'Unknown',
        },
        challenge_id: reg.challenge_id,
        registration_status: registrationStatus, // pending / approved / rejected
        member_count: memberCount,
        created_at: createdAt,
        college: team.college_city || team.college_state ? `${team.college_city}${team.college_state ? ', ' + team.college_state : ''}` : 'Unknown College',
        // Team details
        team_details: {
          id: team.id,
          name: team.name,
          institution: team.institution,
          college_city: team.college_city,
          college_state: team.college_state,
          domain_id: team.domain_id,
          challenge_id: team.challenge_id,
          assigned_repository_url: team.assigned_repository_url,
        },
        // Participants / team members
        participants: members.map((m: any) => ({
          id: m.id,
          full_name: m.full_name,
          email: m.email,
          github_username: m.github_username || '',
          is_leader: m.is_leader,
        })),
      };
    });

    return NextResponse.json({
      registrations: transformedRegistrations,
      domainOptions,
    });
  } catch (err) {
    console.error('Unexpected error in participants API:', err);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
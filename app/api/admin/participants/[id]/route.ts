import { NextResponse } from 'next/server';
import { getAuthenticatedContext } from '@/lib/auth/require-user';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { supabase, user, role } = await getAuthenticatedContext();
  if (!supabase) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  if (role !== 'admin') return NextResponse.json({ error: 'Administrator role required.' }, { status: 403 });

  try {
    // Fetch the team with registration status, domain info, and team members
    // Using ONLY allowed tables: teams, registrations, domains, team_members
    const { data: team, error } = await supabase
      .from('teams')
      .select(`
        *,
        registrations!inner(id, status),
        domains!inner(id, name, slug),
        team_members(*)
      `)
      .eq('id', params.id)
      .single();

    if (error) {
      console.error('Error fetching team details:', error);
      return NextResponse.json({ error: 'Team not found.' }, { status: 404 });
    }

    if (!team) {
      return NextResponse.json({ error: 'Team not found.' }, { status: 404 });
    }

    const registration = team.registrations?.[0] || {};
    const domain = team.domains?.[0] || {};
    const members = team.team_members || [];

    // Registration status from registrations table (pending/approved/rejected)
    const registrationStatus = registration.status || 'pending';

    // Get the team leader from team.leader_id or first is_leader member
    const leader = members.find((m: any) => m.is_leader) || {
      full_name: team.leader_id ? 'Unknown' : 'Not set',
      email: '',
      phone: ''
    };

    // Calculate member count
    const memberCount = members.length;

    // Format created date
    const createdAt = team.created_at ? new Date(team.created_at).toLocaleString() : 'Unknown';

    // Build domain info
    let domainInfo = { name: 'Unknown', code: '?' };
    if (domain.id) {
      domainInfo = { name: domain.name || 'Unknown', code: domain.slug || domain.id || '?' };
    }

    // Transform participants for display
    const participants = members.map((m: any) => ({
      id: m.id,
      full_name: m.full_name,
      email: m.email,
      phone: m.phone || '',
      member_position: m.is_leader ? 1 : 0,
      is_leader: m.is_leader,
    }));

    return NextResponse.json({
      id: team.id,
      team_name: team.name || 'Unnamed Team',
      institution: team.institution || registration.institution || 'Unknown College',
      domain: domainInfo,
      registration_status: registrationStatus, // pending / approved / rejected
      member_count: memberCount,
      created_at: createdAt,
      participants,
      // No payment information - removed per requirements
      // No event information - removed per requirements
    });
  } catch (err) {
    console.error('Unexpected error in team detail API:', err);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
import { redirect } from 'next/navigation';
import { getAuthenticatedContext } from '@/lib/auth/require-user';
import AdminPortal from '@/src/AdminPortal';

// Client-side filter component for search and filters
import ParticipantsFilter from '@/app/admin/participants/components/ParticipantsFilter';

export const dynamic = 'force-dynamic';

export default async function AdminParticipantsPage() {
  const { supabase, user, role } = await getAuthenticatedContext();
  if (!supabase) return <main className="section"><h1>Administrator portal unavailable</h1><p>Supabase is not configured for this deployment.</p></main>;
  if (!user) redirect('/admin/login');
  if (role !== 'admin') return <main className="section"><h1>Administrator access required</h1><p>This account does not have the administrator role.</p></main>;

  const [{ data: registrations }, { data: domains }] = await Promise.all([
    supabase.from('registrations').select('id,reference_id,team_uid,team_name,institution,status,created_at,challenge_id,domain:domains(id,name,event_details),team:teams(id,name,institution,college_city,college_state,domain_id,challenge_id,assigned_repository_url,members:team_members(id,full_name,email,github_username,is_leader))').order('created_at',{ascending:false}),
    supabase.from('domains').select('id,name,slug,is_active,event_details').order('name'),
  ]);

  // Build domain options from fetched data
  const domainOptions = (domains || []).map((d: any) => ({
    value: d.id,
    label: d.name,
  }));

  // Transform registrations matching the shape expected by ParticipantsFilter
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

  return (
    <main className="section portal-section admin-section">
      <ParticipantsFilter teams={transformedRegistrations} domainOptions={domainOptions} />
    </main>
  );
}
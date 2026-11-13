import { redirect } from 'next/navigation';
import { getAuthenticatedContext } from '@/lib/auth/require-user';
import ParticipantPortal from '@/src/ParticipantPortal';

export const dynamic = 'force-dynamic';

export default async function PortalPage() {
  const { supabase, user, role } = await getAuthenticatedContext();
  if (!supabase) return <PortalMessage title="Portal unavailable" text="Supabase is not configured for this deployment."/>;
  if (!user) redirect('/login?next=%2Fportal');
  if (role !== 'participant' && role !== 'team_leader' && role !== 'admin') return <PortalMessage title="Access unavailable" text="This account does not have participant portal access."/>;
  const [{ data: memberships }, { data: ledTeams }] = await Promise.all([
    supabase.from('team_members').select('team_id').eq('profile_id', user.id),
    supabase.from('teams').select('id').eq('leader_id', user.id),
  ]);
  const teamIds=[...new Set([...(memberships??[]).map(m=>m.team_id),...(ledTeams??[]).map(t=>t.id)])];
  const { data: teams } = teamIds.length ? await supabase.from('teams').select('id,name,institution,college_city,college_state,domain_id,challenge_id,leader_id,assigned_repository_url,meal_qr_token,accommodation:accommodation_requests(id,participant_count,arrival_date,departure_date,notes,status),registration:registrations(team_uid,reference_id,status,created_at,approved_at,challenge_id,payment_status,payment_reference),domain:domains(name,event_details),members:team_members(id,full_name,email,github_username,is_leader),submission:submissions(project_title,summary,demo_url,repository_url,submitted_at,status)').in('id',teamIds).order('created_at',{ascending:true}) : {data:[]};
  const { data: announcements } = await supabase.from('announcements').select('id,title,body,published_at').not('published_at','is',null).order('published_at',{ascending:false}).limit(20);
  return <ParticipantPortal teams={teams ?? []} announcements={announcements ?? []} email={user.email ?? ''} userId={user.id} isAdmin={role === 'admin'}/>;
}

function PortalMessage({title,text}:{title:string;text:string}) { return <main className="section"><h1>{title}</h1><p>{text}</p></main>; }

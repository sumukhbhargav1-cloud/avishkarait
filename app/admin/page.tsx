import { redirect } from 'next/navigation';
import { getAuthenticatedContext } from '@/lib/auth/require-user';
import AdminPortal from '@/src/AdminPortal';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const { supabase, user, role } = await getAuthenticatedContext();
  if (!supabase) return <main className="section"><h1>Administrator portal unavailable</h1><p>Supabase is not configured for this deployment.</p></main>;
  if (!user) redirect('/admin/login');
  if (role !== 'admin') return <main className="section"><h1>Administrator access required</h1><p>This account does not have the administrator role.</p><a className="text-link" href="/portal">Go to participant portal</a></main>;
  const [{ data }, { data: domains }] = await Promise.all([
    supabase.from('registrations').select('id,reference_id,team_uid,team_name,institution,status,created_at,challenge_id,domain:domains(id,name,event_details),team:teams(id,name,institution,college_city,college_state,domain_id,challenge_id,assigned_repository_url,members:team_members(id,full_name,email,github_username,is_leader))').order('created_at',{ascending:false}),
    supabase.from('domains').select('id,name,description,minimum_team_size,maximum_team_size,registration_open,is_active,event_details').order('slug'),
  ]);
  return <AdminPortal registrations={data ?? []} domains={domains ?? []} />;
}

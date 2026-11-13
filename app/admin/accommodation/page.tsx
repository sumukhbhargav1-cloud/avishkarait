import { redirect } from 'next/navigation';
import { getAuthenticatedContext } from '@/lib/auth/require-user';
import AdminAccommodation from '@/src/AdminAccommodation';

export const dynamic = 'force-dynamic';

export default async function AdminAccommodationPage() {
  const { supabase, user, role } = await getAuthenticatedContext();
  if (!supabase) return <main className="section"><h1>Accommodation management unavailable</h1><p>Supabase is not configured.</p></main>;
  if (!user) redirect('/admin/login');
  if (role !== 'admin') return <main className="section"><h1>Administrator access required</h1></main>;
  const { data } = await supabase.from('accommodation_requests').select('id,team_id,participant_count,arrival_date,departure_date,notes,status,team:teams(name,registration:registrations(team_uid,reference_id))').order('created_at', { ascending: false });
  return <AdminAccommodation requests={data ?? []} />;
}

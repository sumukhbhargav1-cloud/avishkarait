import { redirect } from 'next/navigation';
import { getAuthenticatedContext } from '@/lib/auth/require-user';
import AdminMealsScanner from '@/src/AdminMealsScanner';

export const dynamic = 'force-dynamic';

export default async function AdminMealsPage() {
  const { supabase, user, role } = await getAuthenticatedContext();
  if (!supabase) return <main className="section"><h1>Meal scanner unavailable</h1><p>Supabase is not configured.</p></main>;
  if (!user) redirect('/admin/login');
  if (role !== 'admin') return <main className="section"><h1>Administrator access required</h1></main>;
  return <AdminMealsScanner />;
}

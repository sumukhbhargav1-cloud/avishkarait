import { createSupabaseServerClient } from '../supabase/server';

export type AppRole = 'participant' | 'team_leader' | 'admin' | 'judge';

/** Resolves the signed-in user's database role on the server. Never trust a client role claim. */
export async function getCurrentRole(): Promise<AppRole | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const role = data?.role;
  return role === 'participant' || role === 'team_leader' || role === 'admin' || role === 'judge' ? role : null;
}

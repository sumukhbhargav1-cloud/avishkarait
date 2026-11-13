import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function getAuthenticatedContext() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { supabase: null, user: null, role: null };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, role: null };
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  return { supabase, user, role: profile?.role ?? null };
}

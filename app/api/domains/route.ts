import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'Supabase is not configured. Add the required environment variables and restart the app.' }, { status: 503 });

  const { data, error } = await supabase.from('domains').select('id,slug,name,description,minimum_team_size,maximum_team_size,registration_open,event_details').eq('is_active', true).order('slug');
  if (error) return NextResponse.json({ error: 'Event domains are temporarily unavailable.' }, { status: 503 });
  return NextResponse.json({ domains: data });
}

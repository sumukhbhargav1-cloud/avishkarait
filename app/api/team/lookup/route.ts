import { NextRequest, NextResponse } from 'next/server';
import { getTeamByUid, getSiteSettings } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get('uid');

    if (!uid) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }

    const team = await getTeamByUid(uid);
    if (!team) {
      return NextResponse.json({ error: 'No registration found with this Team ID' }, { status: 404 });
    }

    const settings = await getSiteSettings();

    return NextResponse.json({
      success: true,
      team,
      settings,
    });
  } catch (error: any) {
    console.error('Team Lookup Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { logVisitor } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { anonymousVisitorId, pagePath, referralSource, deviceCategory } = body;

    if (!anonymousVisitorId || !pagePath) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    await logVisitor({
      anonymousVisitorId,
      pagePath,
      referralSource,
      deviceCategory,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


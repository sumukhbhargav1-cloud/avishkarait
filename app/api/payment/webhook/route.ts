import { NextRequest, NextResponse } from 'next/server';
import { getTeamByUid, updatePaymentToPaid, getSiteSettings } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    // UPI payments don't use webhook signatures - handle UPI payment confirmation manually
    // For now, return success - admin will verify payment proofs via the verification API
    const body = JSON.parse(rawBody);

    // Accept UTR reference updates from manual submission
    if (body.utrReference && body.teamUid) {
      const team = await getTeamByUid(body.teamUid);
      if (team) {
        await updatePaymentToPaid({
          teamId: team.id,
          transactionRef: body.utrReference,
          method: 'STATIC_QR',
        });
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


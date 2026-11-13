import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isValidUtr, normalizeUtr } from '@/lib/payment';

export const dynamic = 'force-dynamic';

const noStore = { 'cache-control': 'no-store' } as const;

function paymentDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// Payment status for a team (used by the portal to refresh after submitting).
export async function GET(request: NextRequest) {
  const teamUid = (new URL(request.url).searchParams.get('teamUid') || '').trim().toUpperCase();
  if (!teamUid) {
    return NextResponse.json({ error: 'Team ID is required.' }, { status: 400, headers: noStore });
  }

  const db = paymentDb();
  if (!db) {
    return NextResponse.json({ error: 'Payment service is not configured.' }, { status: 503, headers: noStore });
  }

  const { data, error } = await db
    .from('registrations')
    .select('team_uid, payment_status, payment_reference, payment_amount, payment_submitted_at')
    .eq('team_uid', teamUid)
    .maybeSingle();

  if (error) {
    console.error('PAYMENT STATUS ERROR:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500, headers: noStore });
  }
  if (!data) {
    return NextResponse.json({ error: 'No registration found with this team ID.' }, { status: 404, headers: noStore });
  }

  return NextResponse.json(
    {
      teamUid: data.team_uid,
      paymentStatus: data.payment_status,
      paymentReference: data.payment_reference,
      amount: data.payment_amount,
      submittedAt: data.payment_submitted_at,
    },
    { headers: noStore }
  );
}

export async function POST(request: NextRequest) {
  let body: { teamUid?: unknown; utrReference?: unknown };
  try {
    body = (await request.json()) as { teamUid?: unknown; utrReference?: unknown };
  } catch {
    return NextResponse.json({ error: 'The payment reference could not be read.' }, { status: 400, headers: noStore });
  }

  const teamUid = typeof body.teamUid === 'string' ? body.teamUid.trim().toUpperCase() : '';
  const utrReference = normalizeUtr(body.utrReference);

  if (!teamUid) {
    return NextResponse.json({ error: 'Team ID is required.' }, { status: 400, headers: noStore });
  }
  if (!isValidUtr(utrReference)) {
    return NextResponse.json(
      { error: 'Enter the UTR / transaction reference from your payment app (6–40 letters or numbers).' },
      { status: 400, headers: noStore }
    );
  }

  const db = paymentDb();
  if (!db) {
    return NextResponse.json({ error: 'Payment service is not configured.' }, { status: 503, headers: noStore });
  }

  const { data: registration, error: lookupError } = await db
    .from('registrations')
    .select('id, payment_status, payment_reference')
    .eq('team_uid', teamUid)
    .maybeSingle();

  if (lookupError) {
    console.error('PAYMENT LOOKUP ERROR:', lookupError.message);
    return NextResponse.json({ error: lookupError.message }, { status: 500, headers: noStore });
  }
  if (!registration) {
    return NextResponse.json({ error: 'No registration found with this team ID.' }, { status: 404, headers: noStore });
  }
  if (registration.payment_status === 'PAID') {
    return NextResponse.json(
      { error: 'This registration is already marked as paid. Contact the organisers if you need a correction.' },
      { status: 409, headers: noStore }
    );
  }

  // Make client retries idempotent: don't rewrite an already-pending identical UTR.
  // A different UTR, or a previously rejected submission, can still be resubmitted.
  if (registration.payment_status === 'PENDING' && registration.payment_reference === utrReference) {
    return NextResponse.json(
      {
        success: true,
        paymentStatus: 'PENDING',
        paymentReference: utrReference,
        message: 'This payment reference is already submitted and pending verification.',
      },
      { headers: noStore }
    );
  }

  const { error: updateError } = await db
    .from('registrations')
    .update({
      payment_status: 'PENDING',
      payment_reference: utrReference,
      payment_submitted_at: new Date().toISOString(),
    })
    .eq('id', registration.id);

  if (updateError) {
    console.error('PAYMENT UPDATE ERROR:', updateError.message);
    return NextResponse.json({ error: updateError.message }, { status: 500, headers: noStore });
  }

  return NextResponse.json(
    {
      success: true,
      paymentStatus: 'PENDING',
      paymentReference: utrReference,
      message: 'Payment reference received. Status updated to PENDING VERIFICATION.',
    },
    { headers: noStore }
  );
}

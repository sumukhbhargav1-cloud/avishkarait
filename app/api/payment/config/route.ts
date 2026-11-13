import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { normalizePaymentSettings } from '@/lib/payment';

export const dynamic = 'force-dynamic';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { error: 'Payment service is not configured.' },
      { status: 503, headers: { 'cache-control': 'no-store' } }
    );
  }

  const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await db
    .from('registration_settings')
    .select('upi_id, beneficiary_name, registration_fee, official_qr_image_url, payment_enabled')
    .eq('singleton', true)
    .maybeSingle();

  if (error) {
    console.error('PAYMENT CONFIG ERROR:', error.message);
    return NextResponse.json(
      { error: `Payment settings could not be loaded: ${error.message}` },
      { status: 500, headers: { 'cache-control': 'no-store' } }
    );
  }

  return NextResponse.json(normalizePaymentSettings(data), {
    headers: { 'cache-control': 'no-store' },
  });
}
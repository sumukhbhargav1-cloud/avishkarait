import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });

  const { data, error } = await supabase.from('registration_settings').select('minimum_team_size,maximum_team_size,upi_id,beneficiary_name,registration_fee,official_qr_image_url,payment_enabled').eq('singleton', true).single();
  if (error || !data) return NextResponse.json({ error: 'Registration settings are unavailable.' }, { status: 503 });

  // Return UPI and payment configuration alongside registration settings
  return NextResponse.json({
    minimumTeamSize: data.minimum_team_size,
    maximumTeamSize: data.maximum_team_size,
    upiId: data.upi_id,
    beneficiaryName: data.beneficiary_name,
    registrationFee: data.registration_fee,
    officialQrImageUrl: data.official_qr_image_url,
    paymentEnabled: data.payment_enabled !== false, // default to true
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      minimumTeamSize,
      maximumTeamSize,
      upiId,
      beneficiaryName,
      registrationFee,
      officialQrImageUrl,
      paymentEnabled
    } = body;

    const supabase = await createSupabaseServerClient();
    if (!supabase) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });

    // UPSERT: ensure there's always a singleton row
    const { error } = await supabase
      .from('registration_settings')
      .upsert({
        singleton: true,
        minimum_team_size: minimumTeamSize,
        maximum_team_size: maximumTeamSize,
        upi_id: upiId || null,
        beneficiary_name: beneficiaryName || null,
        registration_fee: registrationFee !== undefined ? registrationFee : 1500,
        official_qr_image_url: officialQrImageUrl || null,
        payment_enabled: paymentEnabled !== false,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'singleton' });

    if (error) {
      return NextResponse.json({ error: 'Failed to update registration settings.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      minimumTeamSize,
      maximumTeamSize,
      upiId,
      beneficiaryName,
      registrationFee: registrationFee || 1500,
      officialQrImageUrl,
      paymentEnabled,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update registration settings.' }, { status: 500 });
  }
}
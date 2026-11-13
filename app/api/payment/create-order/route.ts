import { NextRequest, NextResponse } from 'next/server';
import { getTeamByUid, getSiteSettings } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  try {
    const { teamUid } = await req.json();

    if (!teamUid) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }

    const team = await getTeamByUid(teamUid);
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const settings = await getSiteSettings();

    // UPI only - no Razorpay order creation
    // Check if UPI is configured
    if (!settings?.upi_id) {
      return NextResponse.json({
        error: 'UPI payment is not yet configured. Please contact the administrator.'
      }, { status: 503 });
    }

    // Return UPI static payment details
    return NextResponse.json({
      success: true,
      upiId: settings.upi_id,
      beneficiaryName: settings.beneficiary_name || 'COLLEGE EVENT ACCOUNT',
      amount: settings.registration_fee || 1500,
      // Static QR code will be displayed to the user
      // No order ID needed for UPI - use teamUid as reference
      staticPayment: {
        type: 'upi',
        upiUrl: `upi://pay?pa=${settings.upi_id}&pn=${settings.beneficiary_name || 'COLLEGE EVENT ACCOUNT'}&am=${settings.registration_fee || 1500}&cu=INR&mc=5122`,
        qrCodeUrl: settings.official_qr_image_url || null,
      },
      team: {
        teamUid: team.team_uid,
        teamName: team.team_name,
        teamLeadName: team.team_lead_name,
        teamLeadEmail: team.team_lead_email,
      },
    });
  } catch (error: any) {
    console.error('Create Order Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create payment order' }, { status: 500 });
  }
}
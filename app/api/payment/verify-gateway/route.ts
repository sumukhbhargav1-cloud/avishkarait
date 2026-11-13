import { NextRequest, NextResponse } from 'next/server';
import { getTeamByUid, getSiteSettings, verifySubmissionByAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  try {
    const { teamUid, submissionId, adminEmail, status, rejectionReason } = await req.json();

    if (!teamUid) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }

    const team = await getTeamByUid(teamUid);
    if (!team) {
      return NextResponse.json({ error: 'Team record not found' }, { status: 404 });
    }

    // Handle admin verification/rejection of payment proof
    if (adminEmail && submissionId && status) {
      await verifySubmissionByAdmin({
        submissionId,
        status: status as 'APPROVED' | 'REJECTED',
        adminEmail,
        rejectionReason,
      });

      return NextResponse.json({
        success: true,
        message: status === 'APPROVED'
          ? 'Payment proof approved. Team payment status updated to PAID.'
          : 'Payment proof rejected.',
      });
    }

    // For non-admin queries, return team payment status
    const settings = await getSiteSettings();
    const payment = team.payments?.[0] || { payment_status: 'NOT PAID' };
    const submission = team.payment_submissions?.[0] || { verification_status: 'PENDING' };

    return NextResponse.json({
      success: true,
      paymentStatus: payment.payment_status,
      paymentMethod: payment.payment_method,
      submissionStatus: submission.verification_status,
      registrationStatus: team.registration_status,
      upiId: settings?.upi_id,
      beneficiaryName: settings?.beneficiary_name,
    });
  } catch (error: any) {
    console.error('Verify Gateway Error:', error);
    return NextResponse.json({ error: error.message || 'Payment verification failed' }, { status: 500 });
  }
}
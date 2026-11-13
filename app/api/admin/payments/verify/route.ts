import { NextRequest, NextResponse } from 'next/server';
import { verifySubmissionByAdmin, getTeamByUid, getSiteSettings } from '@/lib/supabase-admin';
import { getAdminSession } from '@/lib/admin-auth';
import { sendPaymentConfirmationEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 401 });
    }

    const { submissionId, teamUid, status, rejectionReason } = await req.json();

    if (!submissionId || !status || !['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid verification parameters' }, { status: 400 });
    }

    await verifySubmissionByAdmin({
      submissionId,
      status,
      adminEmail: session.email,
      rejectionReason,
    });

    // If approved, trigger payment confirmation email to team lead!
    if (status === 'APPROVED' && teamUid) {
      const team = await getTeamByUid(teamUid);
      if (team) {
        const settings = await getSiteSettings();
        sendPaymentConfirmationEmail({
          teamId: team.id,
          teamUid: team.team_uid,
          teamName: team.team_name,
          eventDomain: team.events?.event_name || team.event_id,
          collegeName: team.college_name,
          teamLead: {
            fullName: team.team_lead_name,
            email: team.team_lead_email,
          },
          participants: (team.participants || []).map((p: any) => ({
            fullName: p.participant_name,
          })),
          amountPaid: settings?.registration_fee || 1500,
          transactionRef: 'VERIFIED_OFFICIAL_QR',
          paymentDate: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          hackathonName: settings?.hackathon_name,
        }).catch((err) => console.error('Admin approval email error:', err));
      }
    }

    return NextResponse.json({
      success: true,
      message: `Payment submission successfully marked as ${status}`,
    });
  } catch (error: any) {
    console.error('Verify Payment Submission Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


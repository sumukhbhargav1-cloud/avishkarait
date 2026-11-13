import { NextRequest, NextResponse } from 'next/server';
import { getAllRegistrations } from '@/lib/supabase-admin';
import { generateRegistrationsExcel, RegistrationExportRow } from '@/lib/excel';
import { getAdminSession } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized administrative access' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const eventFilter = searchParams.get('event');
    const statusFilter = searchParams.get('status');

    let teams = await getAllRegistrations();

    // Apply filters if requested
    if (eventFilter && eventFilter !== 'ALL') {
      teams = teams.filter(
        (t: any) =>
          t.events?.event_code === eventFilter ||
          t.event_id === eventFilter ||
          t.event_code === eventFilter
      );
    }

    if (statusFilter && statusFilter !== 'ALL') {
      teams = teams.filter((t: any) => t.payments?.[0]?.payment_status === statusFilter);
    }

    // Map database rows to exact 25 Excel columns
    const exportRows: RegistrationExportRow[] = teams.map((team: any, index: number) => {
      const pList = team.participants || [];
      const payment = team.payments?.[0] || {};
      const submission = team.payment_submissions?.[0] || {};

      const p1 = pList[0] || {};
      const p2 = pList[1] || {};
      const p3 = pList[2] || {};

      return {
        serialNumber: index + 1,
        teamUid: team.team_uid,
        teamName: team.team_name,
        eventDomain: team.events?.event_name || team.event_id,
        selectedChallenge: team.selected_challenge || 'N/A',
        teamLeadName: team.team_lead_name,
        teamLeadEmail: team.team_lead_email,
        teamLeadPhone: team.team_lead_phone,
        collegeName: team.college_name,
        p1Name: p1.participant_name || '',
        p1Email: p1.participant_email || '',
        p1Phone: p1.participant_phone || '',
        p2Name: p2.participant_name || '',
        p2Email: p2.participant_email || '',
        p2Phone: p2.participant_phone || '',
        p3Name: p3.participant_name || '',
        p3Email: p3.participant_email || '',
        p3Phone: p3.participant_phone || '',
        totalMembers: 1 + pList.length,
        registrationDate: new Date(team.created_at).toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
        }),
        paymentAmount: Number(payment.amount || 1500),
        paymentStatus: payment.payment_status || 'NOT PAID',
        paymentMethod: payment.payment_method || 'GATEWAY',
        transactionReference:
          payment.transaction_reference ||
          payment.gateway_payment_id ||
          submission.utr_reference ||
          'N/A',
        registrationStatus: team.registration_status || 'REGISTERED',
      };
    });

    const buffer = await generateRegistrationsExcel(
      exportRows,
      `Hackathon Registrations (${exportRows.length})`
    );

    const filename = `Hackathon_Registrations_${new Date().toISOString().split('T')[0]}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('Export Excel Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

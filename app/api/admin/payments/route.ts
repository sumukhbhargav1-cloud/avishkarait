import { NextRequest, NextResponse } from 'next/server';
import { verifySubmissionByAdmin, getTeamByUid, getSiteSettings } from '@/lib/supabase-admin';
import { getAdminSession } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

function withCacheControl(res: NextResponse): NextResponse {
  res.headers.set('cache-control', 'no-store');
  return res;
}

// GET - List payment submissions (derived from registrations with payment info)
export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      const errRes = NextResponse.json({ error: 'Unauthorized admin access' }, { status: 401 });
      return withCacheControl(errRes);
    }

    // We'll derive payment info from the registrations endpoint
    // For now, return an empty list with a note - the admin panel can fetch from /api/admin/registrations
    const okRes = NextResponse.json({
      submissions: [],
      message:
        'Use /api/admin/registrations for full team data with payment status. This endpoint lists payment submissions.',
    });
    return withCacheControl(okRes);
  } catch (error: any) {
    console.error('Admin payments GET error:', error);
    const errRes = NextResponse.json({ error: error.message || 'Failed to load payment submissions' }, { status: 500 });
    return withCacheControl(errRes);
  }
}

// POST - Approve or reject a payment submission
export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      const errRes = NextResponse.json({ error: 'Unauthorized admin access' }, { status: 401 });
      return withCacheControl(errRes);
    }

    const { submissionId, teamUid, status, rejectionReason } = await request.json();

    if (!submissionId || !status || !['APPROVED', 'REJECTED'].includes(status)) {
      const errRes = NextResponse.json({ error: 'Invalid verification parameters' }, { status: 400 });
      return withCacheControl(errRes);
    }

    await verifySubmissionByAdmin({
      submissionId,
      status,
      adminEmail: session.email,
      rejectionReason,
    });

    const okRes = NextResponse.json({
      success: true,
      message: `Payment submission successfully marked as ${status}`,
    });
    return withCacheControl(okRes);
  } catch (error: any) {
    console.error('Admin payments POST error:', error);
    const errRes = NextResponse.json({ error: error.message || 'Failed to update payment submission' }, { status: 500 });
    return withCacheControl(errRes);
  }
}
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users2, Shield, Loader2, AlertCircle, CheckCircle, XCircle, ArrowUpRight } from 'lucide-react';

type PaymentSubmission = {
  id: string;
  team_id: string;
  utr_reference: string;
  verification_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  verified_by: string | null;
  verification_timestamp: string | null;
  rejection_reason: string | null;
  created_at: string;
};

type Team = {
  id: string;
  team_uid: string;
  team_name: string;
  institution: string;
  college_city: string | null;
  college_state: string | null;
  domain_id: string;
  challenge_id: string | null;
  leader_id: string;
  registration_status: string;
  team_lead_name: string;
  team_lead_email: string;
  members: { id: string; full_name: string; email: string; github_username: string | null; is_leader: boolean }[];
  payments: { id: string; payment_status: string; payment_method: string; transaction_reference: string | null; paid_at: string | null; amount: number }[];
  participants: { participant_name: string; participant_email: string; participant_phone: string }[];
  events: { event_code: string; event_name: string } | null;
  domain: { name: string; event_details: { eventCode?: string; challenges?: { id: string; name: string }[] } | null } | null;
};

type Registration = {
  id: string;
  reference_id: string;
  team_uid: string;
  team_name: string;
  institution: string;
  domain_id: string;
  challenge_id: string | null;
  status: string;
  created_at: string;
  payment_status: string;
  payment_reference: string | null;
  payment_amount: number;
};

export default function AdminPaymentsPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [submissions, setSubmissions] = useState<PaymentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [approving, setApproving] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/registrations', { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not load registrations');
        if (cancelled) return;
        setRegistrations(data ?? []);
      } catch (e: any) {
        if (cancelled) return;
        setError(`Failed to load registrations: ${e.message}`);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/payments', { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not load payment submissions');
        if (cancelled) return;
        setSubmissions(data ?? []);
      } catch (e: any) {
        if (cancelled) return;
        setError(`Failed to load payment submissions: ${e.message}`);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function handleApprove(submissionId: string, teamUid: string, reason?: string) {
    setApproving(teamUid);
    try {
      const res = await fetch('/api/admin/payments/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ submissionId, teamUid, status: 'APPROVED', rejectionReason: reason || undefined }),
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Approval failed');
      setTimeout(() => { window.location.reload(); }, 500);
    } catch (e: any) {
      setError(`Approval failed: ${e.message}`);
    } finally {
      setApproving(null);
    }
  }

  async function handleReject(submissionId: string, teamUid: string, reason: string) {
    setRejecting(teamUid);
    try {
      const res = await fetch('/api/admin/payments/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ submissionId, teamUid, status: 'REJECTED', rejectionReason: reason }),
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Rejection failed');
      setTimeout(() => { window.location.reload(); }, 500);
    } catch (e: any) {
      setError(`Rejection failed: ${e.message}`);
    } finally {
      setRejecting(null);
    }
  }

  if (loading && registrations.length === 0 && submissions.length === 0) {
    return (
      <section className="section admin-section">
        <div className="utility-page" style={{ textAlign: 'center', paddingTop: 120 }}>
          <Loader2 className="animate-spin" style={{ margin: '0 auto 12px', color: '#D71935' }} />
          <span className="utility-label">LOADING ADMIN PAYMENTS...</span>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="section admin-section">
        <div className="info-note">
          <AlertCircle size={18} color="D71935" />
          <b>Error.</b> {error}
        </div>
      </section>
    );
  }

  const payable = registrations.filter(
    (r) => r.payment_status === 'PENDING' || r.payment_status === 'NOT PAID'
  );

  return (
    <section className="section admin-section">
      <div className="admin-header">
        <h1>AVISHKAR 2K26 / ADMINISTRATION</h1>
        <Link href="/admin" className="text-link">
          <span className="sr-only">Back to Admin Dashboard</span>
          <ArrowUpRight size={15} />
        </Link>
      </div>

      <div className="admin-content">
        <div className="admin-stats">
          <div className="stat-card">
            <Shield size={20} /> <span>Total Teams</span> <strong>{registrations.length}</strong>
          </div>
          <div className="stat-card">
            <CheckCircle size={20} /> <span>Paid</span> <strong>{registrations.filter((r) => r.payment_status === 'PAID').length}</strong>
          </div>
          <div className="stat-card">
            <XCircle size={20} /> <span>Pending</span> <strong>{payable.length}</strong>
          </div>
          <div className="stat-card">
            <AlertCircle size={20} /> <span>Failed</span> <strong>{registrations.filter((r) => r.payment_status === 'FAILED').length}</strong>
          </div>
        </div>

        <div className="admin-table-wrapper">
          <h2>Payment Submissions Review</h2>

          {registrations.length === 0 ? (
            <div className="info-note">
              No registrations found. Teams may not have submitted payments yet.
            </div>
          ) : (
            <div className="admin-table">
              <table>
                <thead>
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-bold uppercase text-black">Team</th>
                    <th className="text-left px-4 py-3 text-xs font-bold uppercase text-black">Domain</th>
                    <th className="text-left px-4 py-3 text-xs font-bold uppercase text-black">Registration</th>
                    <th className="text-left px-4 py-3 text-xs font-bold uppercase text-black">Payment Status</th>
                    <th className="text-left px-4 py-3 text-xs font-bold uppercase text-black">UTR Reference</th>
                    <th className="text-left px-4 py-3 text-xs font-bold uppercase text-black">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((reg) => {
                    const teamUid = reg.team_uid || reg.id;
                    const submission = submissions.find(
                      (s) => s.team_id === teamUid || (s.utr_reference && s.utr_reference.includes(reg.reference_id ?? ''))
                    ) || null;

                    const paymentStatus = reg.payment_status || 'NOT PAID';
                    const isPayable = paymentStatus === 'PENDING' || paymentStatus === 'NOT PAID';

                    return (
                      <tr key={reg.id} className="border-b border-brand-grey/20">
                        <td className="p-3 font-medium">
                          <Link
                            href={`/admin/teams/${teamUid}`}
                            className="hover:text-brand-red"
                          >
                            {reg.team_name || '—'}
                          </Link>
                        </td>
                        <td className="p-3 text-sm text-black/60">
                          {reg.domain_id || '—'}
                        </td>
                        <td className="p-3 text-sm text-black/60">
                          {reg.reference_id || '—'}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold uppercase ${paymentStatus === 'PAID' ? 'bg-black text-white' : paymentStatus === 'PENDING' ? 'bg-brand-grey text-black' : 'bg-red-100 text-red-800'}`}
                          >
                            {paymentStatus}
                          </span>
                        </td>
                        <td className="p-3 text-sm text-black/60">
                          {submission?.utr_reference || reg.payment_reference || '—'}
                        </td>
                        <td className="p-3">
                          {isPayable ? (
                            <>
                              <button
                                onClick={() => handleApprove(
                                  submission?.id || `sub-${teamUid}`,
                                  teamUid,
                                  ''
                                )}
                                disabled={approving === teamUid}
                                className="button button-red text-xs px-3"
                              >
                                {approving === teamUid ? 'Approving…' : 'Approve'}
                              </button>
                              <button
                                onClick={() => handleReject(
                                  submission?.id || `sub-${teamUid}`,
                                  teamUid,
                                  'Enter rejection reason'
                                )}
                                disabled={rejecting === teamUid}
                                className="button button-outline text-xs px-3 ml-2"
                              >
                                {rejecting === teamUid ? 'Rejecting…' : 'Reject'}
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-black/60">Paid</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {registrations.every((r) => r.payment_status === 'PAID') && (
            <div className="info-note">
              All registrations are marked as paid. No further action needed.
            </div>
          )}

          {registrations.some((r) => r.payment_status === 'FAILED') && (
            <div className="info-note">
              Some teams have failed payments. Review and contact team leads if needed.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
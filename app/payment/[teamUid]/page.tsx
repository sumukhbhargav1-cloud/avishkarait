'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { CreditCard, Loader2, AlertTriangle, Download, Copy, CheckCircle2 } from 'lucide-react';
import { Header, Footer } from '@/src/App';

export default function PaymentPage({ params }: { params: Promise<{ teamUid: string }> }) {
  const { teamUid } = use(params);
  const [team, setTeam] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/team/lookup?uid=${encodeURIComponent(teamUid)}`);
        const data = await res.json();
        if (!res.ok || !data.team) throw new Error(data.error || 'Team registration not found');
        setTeam(data.team); setSettings(data.settings);
      } catch (err: any) { setError(err.message); } finally { setLoading(false); }
    })();
  }, [teamUid]);

  const copy = (v: string) => { navigator.clipboard.writeText(v); setCopied(true); setTimeout(() => setCopied(false), 1200); };

  if (loading) return <><Header /><main className="utility-page" style={{ textAlign: 'center', paddingTop: 120 }}><Loader2 className="animate-spin" style={{ margin: '0 auto 12px', color: '#D71935' }} /><span className="utility-label">LOADING PAYMENT DETAILS…</span></main><Footer /></>;
  if (error || !team) return <><Header /><main className="utility-page"><div className="info-note"><AlertTriangle size={18} color="#D71935" /> <b>Registration not found.</b> {error}</div><Link href="/" className="button button-red" style={{ marginTop: 16 }}>Back to home</Link></main><Footer /></>;

  const payment = team.payments?.[0] || { payment_status: 'NOT PAID', amount: 1500 };
  const fee = payment.amount || 1500;
  const qr = settings?.qr_code_url || team.qr_code_url;
  const upi = settings?.upi_id || team.upi_id || 'pending-configuration@upi';

  return <>
    <Header />
    <main className="page-content">
      <section className="page-hero">
        <div className="page-hero-pattern" />
        <div className="eyebrow"><span className="eyebrow-line"/> PAYMENT <span className="eyebrow-line"/></div>
        <span className="page-index">PAY</span>
        <h1>COMPLETE<br/>REGISTRATION FEE.</h1>
        <p>Pay ₹{fee} per team via UPI/QR to confirm your registration.</p>
      </section>
      <section className="utility-page" style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 24, alignItems: 'start' }}>
        <div>
          <div className="utility-card dark">
            <span className="utility-label">TEAM</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <div>
                <div style={{ font: "800 26px 'Barlow Condensed', sans-serif", color: '#fff' }}>{team.team_uid}</div>
                <div style={{ color: '#b8c3d2', fontSize: 12 }}>{team.team_name} · {team.college_name}</div>
              </div>
              <span className={`status-pill ${payment.payment_status === 'PAID' ? 'status-paid' : payment.payment_status === 'PENDING' ? 'status-pending' : 'status-unpaid'}`}>{payment.payment_status}</span>
            </div>
          </div>
          <div className="utility-card">
            <span className="utility-label">AMOUNT PAYABLE</span>
            <div style={{ font: "800 52px 'Barlow Condensed', sans-serif", color: '#D71935' }}>₹{fee}</div>
            <p style={{ margin: '8px 0 0', color: '#555' }}>Upload proof / submit payment details via the portal once paid, or as instructed by the organisers. This page reflects recorded payment status only.</p>
          </div>
          <div className="utility-card">
            <span className="utility-label">UPI ID</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #e4e5e6' }}>
              <div style={{ font: "600 18px 'DM Mono', monospace" }}>{upi}</div>
              <button className="button" style={{ border: '1px solid #dfe2e5' }} onClick={() => copy(upi)}>{copied ? <><CheckCircle2 size={14} /> Copied</> : <><Copy size={14} /> Copy</>}</button>
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link href={`/registration-success/${team.team_uid}`} className="button" style={{ background: '#071935', color: '#fff' }}>View admission pass</Link>
              <Link href="/portal" className="button button-red"><CreditCard size={15} /> Go to participant portal</Link>
            </div>
          </div>
        </div>
        <div className="utility-card" style={{ textAlign: 'center' }}>
          <span className="utility-label">SCAN TO PAY</span>
          {qr ? <img src={qr} alt="Payment QR" style={{ width: '100%', maxWidth: 320, margin: '16px auto', border: '1px solid #e4e5e6' }} /> : <div style={{ margin: '40px 0', color: '#777' }}>QR code not configured yet.<br/>Use the UPI ID above.</div>}
          <p style={{ margin: 0, fontSize: 12, color: '#666' }}>Scan with any UPI app. Keep a screenshot of the transaction for reference.</p>
        </div>
      </section>
    </main>
    <Footer />
  </>;
}

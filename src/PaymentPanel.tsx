'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Copy, Loader2 } from 'lucide-react';
import { paymentStatusLabel } from '@/lib/payment';

export type PaymentTeam = {
  teamUid: string;
  label: string;
  status?: string | null;
  reference?: string | null;
};

type PaymentConfig = {
  enabled: boolean;
  upiId: string | null;
  beneficiaryName: string | null;
  fee: number;
  qrCodeUrl: string | null;
};

const networkMessage = (e: unknown, fallback: string) => {
  const message = e instanceof Error ? e.message : '';
  return /failed to fetch|networkerror|load failed|network request failed/i.test(message)
    ? 'Could not reach the payment service. Check your connection and try again.'
    : message || fallback;
};

export default function PaymentPanel({ teams }: { teams: PaymentTeam[] }) {
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [rows, setRows] = useState<PaymentTeam[]>(teams);
  const [utr, setUtr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setRows(teams);
  }, [teams]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/payment/config');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Payment details are unavailable.');
        if (active) setConfig(data);
      } catch (e) {
        if (active) setError(networkMessage(e, 'Payment details are unavailable.'));
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (!rows.length) return null;

  function copy(value: string) {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function submit(teamUid: string) {
    const value = (utr[teamUid] || '').trim();
    if (value.replace(/[^A-Za-z0-9]/g, '').length < 6) {
      setError('Enter the UTR / transaction reference from your payment app (at least 6 characters).');
      return;
    }
    setError('');
    setNotice('');
    setBusy(teamUid);
    try {
      const res = await fetch('/api/payment/submit-utr', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ teamUid, utrReference: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'The payment reference could not be saved.');
      setRows((v) =>
        v.map((row) =>
          row.teamUid === teamUid
            ? { ...row, status: data.paymentStatus || 'PENDING', reference: data.paymentReference || value }
            : row
        )
      );
      setUtr((v) => ({ ...v, [teamUid]: '' }));
      setNotice('Payment reference received. The organisers will verify it and confirm your registration.');
    } catch (e) {
      setError(networkMessage(e, 'The payment reference could not be saved.'));
    } finally {
      setBusy('');
    }
  }

  const fee = config?.fee ?? 0;
  const payable = rows.filter((row) => row.status !== 'PAID');

  return (
    <section className="portal-panel" style={{ marginTop: 24 }}>
      <div className="section-label">
        <span>REGISTRATION FEE</span>
        <span>{config && !config.enabled ? 'PAYMENT NOT OPEN YET' : `${rows.length} ${rows.length === 1 ? 'TEAM' : 'TEAMS'}`}</span>
      </div>

      {!config && !error && (
        <p style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Loader2 size={15} className="animate-spin" /> Loading payment details…
        </p>
      )}

      {error && <p className="form-error" role="alert">{error}</p>}
      {notice && <p role="status" style={{ color: '#16a34a' }}>{notice}</p>}

      {config && !config.enabled && (
        <p>Payment is not open yet. The organisers will publish UPI details here before the deadline.</p>
      )}

      {config && config.enabled && (
        <>
          <h2 style={{ margin: '8px 0 4px' }}>₹{(fee * rows.length).toLocaleString('en-IN')}</h2>
          <p>
            ₹{fee.toLocaleString('en-IN')} per team. Pay by UPI
            {config.beneficiaryName ? ` to ${config.beneficiaryName}` : ''}, then submit the transaction reference below.
            {payable.length === 0 ? ' All teams are marked as paid.' : ''}
          </p>

          {config.upiId ? (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                padding: '10px 0',
                borderBottom: '1px solid #e4e5e6',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <span className="portal-label">UPI ID</span>
                <div style={{ font: "600 17px 'DM Mono', monospace" }}>{config.upiId}</div>
              </div>
              <button type="button" className="button" style={{ border: '1px solid #dfe2e5' }} onClick={() => copy(config.upiId!)}>
                {copied ? (
                  <>
                    <CheckCircle2 size={14} /> Copied
                  </>
                ) : (
                  <>
                    <Copy size={14} /> Copy UPI ID
                  </>
                )}
              </button>
            </div>
          ) : (
            <p className="info-note">The UPI ID has not been published yet. Contact the organisers or check back shortly.</p>
          )}

          {config.qrCodeUrl && (
            <div style={{ textAlign: 'center', margin: '16px 0' }}>
              {/* Organiser-supplied payment QR; rendered as-is. */}
              <img src={config.qrCodeUrl} alt="UPI payment QR code" style={{ width: '100%', maxWidth: 260, border: '1px solid #e4e5e6' }} />
              <p style={{ margin: '6px 0 0', fontSize: 12, color: '#666' }}>Scan with any UPI app, then submit the reference below.</p>
            </div>
          )}

          <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
              {rows.map((row) => {
                const paid = row.status === 'PAID';
                return (
                  <div key={row.teamUid} style={{ border: '1px solid #e4e5e6', padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                      <b>{row.label}</b>
                      <span
                        className={`status-pill ${
                          paid ? 'status-paid' : row.status === 'PENDING' ? 'status-pending' : 'status-unpaid'
                        }`}
                      >
                        {paymentStatusLabel(row.status)}
                      </span>
                    </div>
                    {row.reference && (
                      <small style={{ color: '#555' }}>Reference: {row.reference}</small>
                    )}
                    {!paid && (
                      <form
                        style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}
                        onSubmit={(e) => {
                          e.preventDefault();
                          void submit(row.teamUid);
                        }}
                      >
                        <input
                          aria-label={`UTR / transaction reference for ${row.label}`}
                          placeholder="UTR / transaction reference"
                          value={utr[row.teamUid] || ''}
                          onChange={(e) => setUtr((v) => ({ ...v, [row.teamUid]: e.target.value }))}
                          maxLength={40}
                          style={{ flex: '1 1 200px', minWidth: 180 }}
                        />
                        <button className="button button-red" type="submit" disabled={busy === row.teamUid}>
                          {busy === row.teamUid ? 'Saving…' : 'I have paid'}
                        </button>
                      </form>
                    )}
                  </div>
                );
              })}
          </div>
          <p style={{ fontSize: 12, color: '#666', marginTop: 10 }}>
            Team: <b>{rows.map((row) => row.teamUid).join(', ')}</b>. Keep your payment screenshot until the organisers confirm.
          </p>
        </>
      )}
    </section>
  );
}

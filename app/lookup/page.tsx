'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, AlertTriangle, ArrowRight, FileText, Loader2 } from 'lucide-react';
import { Header, Footer } from '@/src/App';

export default function RegistrationLookupPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [team, setTeam] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setLoading(true); setError(null); setTeam(null); setSearched(true);
    try {
      const res = await fetch(`/api/team/lookup?uid=${encodeURIComponent(searchQuery.trim().toUpperCase())}`);
      const data = await res.json();
      if (!res.ok || !data.team) throw new Error(data.error || 'No registration record matches this Team ID');
      setTeam(data.team);
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const status = team?.payments?.[0]?.payment_status || 'NOT PAID';
  const pill = status === 'PAID' ? 'status-pill status-paid' : status === 'PENDING' ? 'status-pill status-pending' : 'status-pill status-unpaid';

  return <>
    <Header />
    <main className="page-content">
      <section className="page-hero">
        <div className="page-hero-pattern" />
        <div className="eyebrow"><span className="eyebrow-line"/> PARTICIPANT PORTAL <span className="eyebrow-line"/></div>
        <span className="page-index">ID</span>
        <h1>FIND YOUR<br/>REGISTRATION.</h1>
        <p>Enter your Team ID to view status, payment details, or your admission pass.</p>
      </section>
      <section className="utility-page">
        <form onSubmit={handleSearch} className="form" style={{ maxWidth: 720, display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end' }}>
          <label>Team ID
            <input required placeholder="e.g. CYB-26-0001" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ fontFamily: "'DM Mono', monospace", textTransform: 'uppercase' }} />
          </label>
          <button type="submit" disabled={loading} className="button button-red" style={{ height: 46 }}>
            {loading ? <><Loader2 size={15} className="animate-spin" /> Searching</> : <><Search size={15} /> Lookup</>}
          </button>
        </form>

        {searched && !loading && error && (
          <div className="info-note" style={{ borderLeftColor: '#D71935', marginTop: 24 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}><AlertTriangle size={18} color="#D71935" /><div><b style={{ display: 'block', marginBottom: 4 }}>Record not found</b><span>{error}</span></div></div>
          </div>
        )}

        {team && (
          <div style={{ marginTop: 28 }}>
            <div className="utility-card dark">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <div>
                  <span className="utility-label">REGISTRATION FOUND</span>
                  <div style={{ font: "800 34px 'Barlow Condensed', sans-serif", color: '#fff' }}>{team.team_uid}</div>
                  <div style={{ fontSize: 12, color: '#b8c3d2' }}>{team.team_name} · {team.college_name}</div>
                </div>
                <span className={pill}>{status}</span>
              </div>
            </div>
            <div className="utility-card">
              <div className="utility-row">
                <div><span className="utility-label">DOMAIN</span><div className="utility-value">{team.events?.event_name || team.event_id || '—'}</div></div>
                <div><span className="utility-label">CHALLENGE</span><div className="utility-value" style={{ fontSize: 16 }}>{team.selected_challenge || 'General'}</div></div>
                <div><span className="utility-label">TEAM LEAD</span><div className="utility-value" style={{ fontSize: 16 }}>{team.team_lead_name}</div></div>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 22, paddingTop: 18, borderTop: '1px solid #e4e5e6' }}>
                <Link href={`/registration-success/${team.team_uid}`} className="button" style={{ background: '#071935', color: '#fff' }}><FileText size={15} /> View admission pass</Link>
                {status !== 'PAID' && <Link href={`/payment/${team.team_uid}`} className="button button-red">Settle fee <ArrowRight size={15} /></Link>}
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
    <Footer />
  </>;
}

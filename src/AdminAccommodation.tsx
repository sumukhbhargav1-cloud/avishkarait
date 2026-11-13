'use client';

import { useState } from 'react';
import Link from 'next/link';

type AccommodationRequest = {
  id: string;
  team_id: string;
  participant_count: number;
  arrival_date: string;
  departure_date: string;
  notes: string;
  status: 'pending' | 'confirmed' | 'declined';
  team: { name: string; registration: { team_uid: string; reference_id: string } | { team_uid: string; reference_id: string }[] | null } | { name: string; registration: { team_uid: string; reference_id: string } | { team_uid: string; reference_id: string }[] | null }[] | null;
};
const one = <T,>(value: T | T[] | null | undefined): T | null => Array.isArray(value) ? value[0] ?? null : value ?? null;

export default function AdminAccommodation({ requests }: { requests: AccommodationRequest[] }) {
  const [states, setStates] = useState<Record<string, string>>(() => Object.fromEntries(requests.map((r) => [r.id, r.status])));
  const [message, setMessage] = useState('');
  async function save(id: string) {
    setMessage('');
    const response = await fetch(`/api/admin/accommodation/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: states[id] }) });
    const result = await response.json();
    setMessage(response.ok ? 'Accommodation status saved.' : result.error || 'Could not save status.');
  }
  return <main className="section portal-section"><div className="section-label"><span>AVISHKAR 2K26 / ADMINISTRATION</span><Link className="text-link" href="/admin">Back to admin</Link></div><div className="portal-heading"><div><span className="eyebrow">EVENT OPERATIONS</span><h1>ACCOMMODATION<br/><span>REQUESTS.</span></h1></div><Link className="button button-red" href="/admin/meals">Open meal scanner</Link></div>{message && <p role="status">{message}</p>}{requests.length ? <div className="admin-accommodation-list">{requests.map((request) => { const team = one(request.team); const registration = one(team?.registration); return <article className="portal-panel admin-accommodation-card" key={request.id}><div><small>{registration?.team_uid ?? registration?.reference_id ?? request.team_id}</small><h2>{team?.name ?? 'Team'}</h2><p>{request.participant_count} participants · {request.arrival_date} to {request.departure_date}</p><p>{request.notes || 'No additional requirements.'}</p></div><div><label>Status<select value={states[request.id]} onChange={(event) => setStates({ ...states, [request.id]: event.target.value })}><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="declined">Declined</option></select></label><button className="button button-red" onClick={() => void save(request.id)}>Save status</button></div></article>; })}</div> : <article className="portal-panel"><h2>No accommodation requests yet</h2><p>Participant team leaders can submit requests from their portal.</p></article>}</main>;
}

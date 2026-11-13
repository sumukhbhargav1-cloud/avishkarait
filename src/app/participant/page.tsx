"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { getSupabaseClient } from "@/lib/supabase";
import { PUBLIC_WEBSITE_URL } from "@/config/site";

export default function ParticipantPage() {
  const [token, setToken] = useState("");
  const [account, setAccount] = useState<any>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [password, setPassword] = useState("");
  const [accommodation, setAccommodation] = useState({ guestCount: 1, checkIn: "", checkOut: "", requirements: "" });

  async function load(access: string) {
    const response = await fetch("/api/participant/me", { headers: { Authorization: `Bearer ${access}` }, cache: "no-store" });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "Could not open participant portal.");
    setAccount(body);
  }

  useEffect(() => {
    let active = true;
    try {
      getSupabaseClient().auth.getSession().then(async ({ data }) => {
        if (!data.session?.access_token) { if (active) setError("Sign in with your team leader email to open the participant portal."); return; }
        if (active) setToken(data.session.access_token);
        try { await load(data.session.access_token); } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : "Participant portal is unavailable."); }
      });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Portal configuration is missing."); }
    return () => { active = false; };
  }, []);

  async function updatePassword(event: FormEvent) {
    event.preventDefault(); setBusy(true); setStatus("");
    try {
      if (password.length < 12) throw new Error("Use at least 12 characters for your new password.");
      const { error: updateError } = await getSupabaseClient().auth.updateUser({ password, data: { must_change_password: false } });
      if (updateError) throw updateError;
      setAccount((current: any) => ({ ...current, mustChangePassword: false }));
      setPassword(""); setStatus("Your password has been changed.");
    } catch (cause) { setStatus(cause instanceof Error ? cause.message : "Password could not be updated."); }
    finally { setBusy(false); }
  }

  async function submitAccommodation(event: FormEvent) {
    event.preventDefault(); setBusy(true); setStatus("");
    try {
      const response = await fetch("/api/participant/accommodation", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(accommodation) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Request could not be sent.");
      setAccount((current: any) => ({ ...current, accommodations: [body.request, ...current.accommodations] }));
      setStatus("Accommodation request submitted for organiser review.");
      setAccommodation({ guestCount: 1, checkIn: "", checkOut: "", requirements: "" });
    } catch (cause) { setStatus(cause instanceof Error ? cause.message : "Request could not be sent."); }
    finally { setBusy(false); }
  }

  if (error) return <main className="admin-gate"><p className="registration-eyebrow">PARTICIPANT ACCESS</p><h1>Your team<br /><em>portal.</em></h1><p>{error}</p><Link className="button button-red" href="/login">Secure sign in ↗</Link><p><a href={PUBLIC_WEBSITE_URL} target="_blank" rel="noreferrer">Visit the main website ↗</a></p></main>;
  if (!account) return <main className="admin-gate"><p className="registration-eyebrow">AVISHKAR 2K26</p><h1>Loading<br /><em>your team.</em></h1><p>Verifying your participant account…</p><p><a href={PUBLIC_WEBSITE_URL} target="_blank" rel="noreferrer">Visit the main website ↗</a></p></main>;
  const registration = account.registration;
  return <><header className="admin-topbar"><a className="brand" href={PUBLIC_WEBSITE_URL} target="_blank" rel="noreferrer"><span className="brand-mark">A<span>.</span></span><span className="brand-copy"><b>AVISHKAR <i>2K26</i></b><small>PARTICIPANT PORTAL</small></span></a><a className="admin-home-link" href={PUBLIC_WEBSITE_URL} target="_blank" rel="noreferrer">Main website ↗</a><button className="admin-home-link" onClick={() => void getSupabaseClient().auth.signOut().then(() => { window.location.href = "/login"; })}>Sign out ↗</button></header><main className="participant-shell"><section className="admin-hero"><div><p className="registration-eyebrow"><span /> TEAM ACCESS</p><h1>WELCOME,<br /><em>{registration.team_leader_name.split(" ")[0]}.</em></h1><p>{registration.team_name} · {registration.domain_name} · {registration.registration_reference}</p></div><span className="status-pill status-confirmed">PAYMENT CONFIRMED</span></section>{status && <p className="admin-inline-success" role="status">{status}</p>}{account.mustChangePassword && <section className="admin-panel password-change"><div className="admin-section-heading"><div><small>SECURE YOUR ACCOUNT</small><h2>Set a new password</h2></div></div><p>Your account uses a temporary password. Change it before opening your participant QR codes.</p><form onSubmit={updatePassword}><label>New password<input type="password" minLength={12} required value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" /></label><button className="button button-red" disabled={busy}>Change password</button></form></section>}{!account.mustChangePassword && <><section className="admin-panel"><div className="admin-section-heading"><div><small>TEAM REGISTRATION</small><h2>{registration.team_name}</h2></div><span className="status-pill status-confirmed">CONFIRMED</span></div><p>{registration.domain_name} · {registration.challenge_id === "at-event" ? "Challenge selected at event" : registration.challenge_id} · {registration.team_size} participants</p><p>Team leader login: <b>{registration.team_leader_email}</b></p><div className="participant-qr-grid">{account.qrs.map((qr: any) => <article key={qr.email}><QRCodeSVG value={qr.value} size={150} level="M" /><b>{qr.name}</b><small>{qr.email}</small><span>Show this QR at meal collection</span></article>)}</div></section><section className="admin-panel"><div className="admin-section-heading"><div><small>LODGING REQUEST</small><h2>Accommodation</h2></div></div><p>Submit your accommodation requirements for organiser review.</p><form className="accommodation-form" onSubmit={submitAccommodation}><label>Number of guests<input type="number" min="1" max="10" required value={accommodation.guestCount} onChange={(event) => setAccommodation({ ...accommodation, guestCount: Number(event.target.value) })} /></label><label>Check in<input type="date" value={accommodation.checkIn} onChange={(event) => setAccommodation({ ...accommodation, checkIn: event.target.value })} /></label><label>Check out<input type="date" value={accommodation.checkOut} onChange={(event) => setAccommodation({ ...accommodation, checkOut: event.target.value })} /></label><label className="wide-field">Requirements<textarea maxLength={1000} rows={4} value={accommodation.requirements} onChange={(event) => setAccommodation({ ...accommodation, requirements: event.target.value })} placeholder="Accessibility, room arrangements, or other needs" /></label><button className="button button-red" disabled={busy}>Submit request</button></form><div className="participant-accommodation-list">{account.accommodations.map((request: any) => <p key={request.id}><span className={`status-pill status-${request.status}`}>{request.status}</span> {request.guest_count} guest(s) {request.check_in ? `· ${request.check_in} to ${request.check_out}` : ""}</p>)}</div></section></>}</main></>;
}

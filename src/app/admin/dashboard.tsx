"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { getSupabaseClient } from "@/lib/supabase";
import { registrationDomains } from "@/config/registration-domains";

type AdminData = { registrations: any[]; accommodations: any[]; mealCheckins: any[]; mealAttempts: any[]; metrics: Record<string, number>; domains: any[] };
type ScanReply = { outcome?: string; message?: string; participantName?: string; participantEmail?: string; teamName?: string; checkedInAt?: string };

const portalUrl = process.env.NEXT_PUBLIC_PARTICIPANT_PORTAL_URL || "https://portal.avishkarait.online/participant";

export default function AdminDashboard() {
  const [data, setData] = useState<AdminData | null>(null);
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState("overview");
  const [busy, setBusy] = useState("");
  const [outcomes, setOutcomes] = useState<Record<string, any>>({});
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [mealResult, setMealResult] = useState<ScanReply | null>(null);
  const [manualEmail, setManualEmail] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerMessage, setScannerMessage] = useState("");
  const scannerVideo = useRef<HTMLVideoElement>(null);
  const scanLock = useRef(false);

  const load = useCallback(async (bearer: string) => {
    const response = await fetch("/api/admin/overview", { headers: { Authorization: `Bearer ${bearer}` }, cache: "no-store" });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "Admin dashboard could not be loaded.");
    setData(body);
  }, []);

  useEffect(() => {
    let active = true;
    try {
      getSupabaseClient().auth.getSession().then(async ({ data: sessionData }) => {
        const access = sessionData.session?.access_token;
        if (!access) { if (active) setError("Sign in with an authorized administrator account to open this dashboard."); return; }
        if (active) setToken(access);
        try { await load(access); } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : "Admin access is unavailable."); }
      });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Portal Supabase configuration is missing."); }
    return () => { active = false; };
  }, [load]);

  async function reload() { if (!token) return; setError(""); try { await load(token); } catch (cause) { setError(cause instanceof Error ? cause.message : "Refresh failed."); } }
  async function api<T = any>(url: string, init: RequestInit = {}) {
    const response = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers } });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? body.message ?? "The request could not be completed.");
    return body as T;
  }

  function makeMessage(registration: any, temporaryPassword?: string | null, note?: string | null) {
    const domain = registrationDomains.find((entry) => entry.slug === registration.domain_slug);
    const challenge = domain?.challenges.find((item) => item.id === registration.challenge_id);
    const members = (registration.registration_members ?? []).map((member: any, index: number) => `${index + 2}. ${member.full_name} — ${member.email} — ${member.phone ?? ""}`).join("\n");
    return `AVISHKAR 2K26 — REGISTRATION CONFIRMED\n\nTeam: ${registration.team_name}\nDomain: ${registration.domain_name ?? domain?.name ?? ""}\nChallenge: ${challenge?.name ?? registration.challenge_id ?? ""}\nTeam size: ${registration.team_size}\nRegistration reference: ${registration.registration_reference}\n\nTeam leader\n${registration.team_leader_name}\n${registration.team_leader_email}\n${registration.team_leader_phone ?? ""}\n\nTeam members\n1. ${registration.team_leader_name} — ${registration.team_leader_email} — ${registration.team_leader_phone ?? ""}${members ? `\n${members}` : ""}\n\nDomain details\n${challenge?.description ?? domain?.description ?? ""}\n${(challenge?.rules ?? domain?.rules ?? []).map((rule: string) => `• ${rule}`).join("\n")}\n\nStudent coordinator\n${(domain?.studentCoordinators ?? []).map((person) => `${person.name}: ${person.phone}`).join("\n")}\n\nParticipant portal: ${portalUrl}\nLogin email: ${registration.team_leader_email}\n${temporaryPassword ? `Temporary password: ${temporaryPassword}\nChange this password immediately after your first sign-in.` : note ?? "Use the password or sign-in link already associated with this email."}\n\nAccommodation: Sign in to the participant portal and submit an accommodation request. Organisers will review it there.`;
  }

  async function paymentAction(registration: any, action: "confirm" | "reject") {
    setBusy(registration.id); setError("");
    try {
      const result = await api(`/api/admin/registrations/${registration.id}/payment`, { method: "POST", body: JSON.stringify({ action }) });
      if (action === "confirm") {
        const fresh = result.registration ? { ...registration, ...result.registration } : registration;
        setMessages((current) => ({ ...current, [registration.id]: makeMessage(fresh, result.temporaryPassword, result.credentialNote) }));
      }
      await reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Payment action failed."); }
    finally { setBusy(""); }
  }

  async function copyConfirmation(registration: any) {
    setBusy(registration.id); setError("");
    try {
      let message = messages[registration.id];
      if (!message) {
        const result = await api(`/api/admin/registrations/${registration.id}/payment`, { method: "POST", body: JSON.stringify({ action: "confirm" }) });
        if (result.registration) registration = { ...registration, ...result.registration };
        message = makeMessage(registration, result.temporaryPassword, result.credentialNote);
        setMessages((current) => ({ ...current, [registration.id]: message }));
      }
      await navigator.clipboard.writeText(message);
      setOutcomes((current) => ({ ...current, [registration.id]: "Confirmation message copied." }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not copy the confirmation message."); }
    finally { setBusy(""); }
  }

  async function scan(tokenValue?: string, email?: string) {
    try {
      const response = await fetch("/api/admin/meals", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(tokenValue ? { token: tokenValue } : { email }) });
      const result = await response.json() as ScanReply;
      setMealResult(result);
    } catch (cause) { setMealResult({ outcome: "invalid", message: cause instanceof Error ? cause.message : "Check-in failed." }); }
    await reload();
  }

  async function manualCheckin(event: React.FormEvent) { event.preventDefault(); await scan(undefined, manualEmail); }

  useEffect(() => {
    if (!scannerOpen) return;
    let cancelled = false;
    let stream: MediaStream | null = null;
    let frame = 0;
    let detector: any;
    const run = async () => {
      const BarcodeDetectorCtor = (window as any).BarcodeDetector;
      if (!BarcodeDetectorCtor) { setScannerMessage("This browser does not support camera QR scanning. Use participant email below."); return; }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (cancelled || !scannerVideo.current) { stream.getTracks().forEach((track) => track.stop()); return; }
        scannerVideo.current.srcObject = stream;
        await scannerVideo.current.play();
        detector = new BarcodeDetectorCtor({ formats: ["qr_code"] });
        setScannerMessage("Camera ready. Hold a participant QR code in frame.");
        const tick = async () => {
          if (cancelled || !scannerVideo.current || scanLock.current) return;
          try {
            const codes = await detector.detect(scannerVideo.current);
            if (codes?.[0]?.rawValue) { scanLock.current = true; setScannerMessage("QR code found. Checking registration…"); await scan(codes[0].rawValue); setTimeout(() => { scanLock.current = false; }, 1800); }
          } catch { /* continue scanning next frame */ }
          if (!cancelled) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      } catch (cause) { setScannerMessage(cause instanceof Error ? `${cause.message}. Use participant email below.` : "Camera unavailable. Use participant email below."); }
    };
    void run();
    return () => { cancelled = true; cancelAnimationFrame(frame); stream?.getTracks().forEach((track) => track.stop()); };
  }, [scannerOpen]);

  async function accommodationAction(item: any, status: string) {
    setBusy(item.id); setError("");
    try { await api(`/api/admin/accommodation/${item.id}`, { method: "PATCH", body: JSON.stringify({ status }) }); await reload(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update request."); }
    finally { setBusy(""); }
  }

  if (error && !data) return <main className="admin-gate"><p className="registration-eyebrow">ADMIN ACCESS</p><h1>Sign in to<br /><em>continue.</em></h1><p>{error}</p><Link className="button button-red" href="/login">Open secure sign in ↗</Link></main>;
  if (!data) return <main className="admin-gate"><p className="registration-eyebrow">AVISHKAR 2K26</p><h1>Loading<br /><em>dashboard.</em></h1><p>Checking your administrator session…</p></main>;

  const tabs = [["overview", "Overview"], ["registrations", `Registrations (${data.registrations.length})`], ["meals", "Meal check-in"], ["accommodation", `Accommodation (${data.accommodations.length})`]];
  return <main className="admin-shell">
    <section className="admin-hero"><div><p className="registration-eyebrow"><span /> AVISHKAR 2K26 · OPERATIONS</p><h1>ADMIN<br /><em>CONTROL.</em></h1><p>Registration, payment verification and on-site operations.</p></div><button className="button button-outline-dark" onClick={() => void reload()}>Refresh data ↻</button></section>
    <nav className="admin-tabs">{tabs.map(([id, label]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}</button>)}</nav>
    {error && <p className="registration-notice notice-error">{error}</p>}
    {tab === "overview" && <section className="admin-content"><div className="admin-metrics">{[["TEAMS", data.metrics.teams], ["PARTICIPANTS", data.metrics.participants], ["PAYMENT PENDING", data.metrics.paymentPending], ["PAYMENT CONFIRMED", data.metrics.paymentConfirmed], ["ACCOMMODATION", data.metrics.accommodationRequests], ["MEALS CHECKED IN", data.metrics.mealCheckins]].map(([label, value]) => <article key={label}><small>{label}</small><b>{value}</b></article>)}</div><section className="admin-panel"><div className="admin-section-heading"><div><small>CAPACITY BY DOMAIN</small><h2>Registration count</h2></div></div><div className="domain-capacity-list">{data.domains.map((domain) => <div key={domain.slug}><span>{domain.name}</span><strong>{domain.registered} <small>/ {domain.capacity}</small></strong><div className="capacity-bar"><i style={{ width: `${Math.min(100, domain.registered / domain.capacity * 100)}%` }} /></div><em>{domain.remaining} slots left</em></div>)}</div></section><section className="admin-panel"><div className="admin-section-heading"><div><small>RECENT ACTIVITY</small><h2>Meal history</h2></div><button onClick={() => setTab("meals")}>Open check-in ↗</button></div><History rows={data.mealCheckins} /></section></section>}
    {tab === "registrations" && <section className="admin-content"><div className="admin-section-heading"><div><small>PAYMENTS REQUIRE MANUAL REVIEW</small><h2>Submitted teams</h2></div><span className="admin-count">{data.registrations.length} TEAMS</span></div><div className="registration-cards">{data.registrations.map((registration) => <article className="admin-registration-card" key={registration.id}><div className="admin-card-top"><div><span className={`status-pill status-${registration.payment_status}`}>{registration.payment_status.replaceAll("_", " ")}</span><span className={`status-pill status-reg-${registration.status}`}>{registration.status.replaceAll("_", " ")}</span></div><small>{registration.registration_reference ?? registration.id.slice(0, 8)}</small></div><h3>{registration.team_name}</h3><p className="admin-team-subtitle">{registration.domain_name} · {registration.team_size} participant{registration.team_size === 1 ? "" : "s"} · {registration.challenge_id}</p><p className="admin-date">Submitted {registration.submitted_at ? new Date(registration.submitted_at).toLocaleString() : "—"}</p><div className="admin-detail-grid"><div><small>TEAM LEADER</small><b>{registration.team_leader_name}</b><a href={`mailto:${registration.team_leader_email}`}>{registration.team_leader_email}</a><a href={`tel:${registration.team_leader_phone}`}>{registration.team_leader_phone}</a></div><div><small>PAYMENT</small><b>UTR: {registration.utr_reference}</b><span>Payment {registration.payment_status}</span>{registration.paymentProofUrl && <a className="proof-link" href={registration.paymentProofUrl} target="_blank" rel="noreferrer">Preview payment screenshot ↗</a>}</div></div><details className="admin-members"><summary>Team members ({registration.registration_members?.length ?? 0})</summary>{(registration.registration_members ?? []).map((member: any) => <p key={member.id}><b>{member.full_name}</b> · {member.email} · {member.phone ?? "—"}</p>)}</details>{outcomes[registration.id] && <p className="admin-inline-success">{outcomes[registration.id]}</p>}{messages[registration.id] && <details className="confirmation-preview"><summary>Confirmation message</summary><pre>{messages[registration.id]}</pre></details>}<div className="admin-card-actions">{registration.payment_status === "pending" && <><button className="button button-red" disabled={busy === registration.id} onClick={() => void paymentAction(registration, "confirm")}>{busy === registration.id ? "Working…" : "Confirm payment"}</button><button className="button button-outline-dark" disabled={busy === registration.id} onClick={() => void paymentAction(registration, "reject")}>Reject payment</button></>}{registration.payment_status === "confirmed" && <button className="button button-outline-dark" disabled={busy === registration.id} onClick={() => void copyConfirmation(registration)}>{busy === registration.id ? "Working…" : "Generate & copy confirmation"}</button>}<details className="full-registration-details"><summary>View full registration</summary><div><b>Registration reference</b><span>{registration.registration_reference}</span><b>Domain / challenge</b><span>{registration.domain_name} / {registration.challenge_id}</span><b>Team size</b><span>{registration.team_size}</span><b>Team leader</b><span>{registration.team_leader_name} · {registration.team_leader_email} · {registration.team_leader_phone}</span><b>UTR / payment status</b><span>{registration.utr_reference} / {registration.payment_status}</span><b>Registration status</b><span>{registration.status}</span><b>Submitted</b><span>{registration.submitted_at ? new Date(registration.submitted_at).toLocaleString() : "—"}</span></div></details></div></article>)}</div></section>}
    {tab === "meals" && <section className="admin-content admin-meals"><div className="admin-section-heading"><div><small>PARTICIPANT QR VERIFICATION</small><h2>Meal check-in</h2></div><button className={`button ${scannerOpen ? "button-outline-dark" : "button-red"}`} onClick={() => { setScannerOpen((value) => !value); setScannerMessage(""); }}>{scannerOpen ? "Close camera" : "Open camera scanner"}</button></div>{scannerOpen && <div className="scanner-panel"><video ref={scannerVideo} playsInline muted /><p>{scannerMessage || "Allow camera access when the scanner starts."}</p></div>}<form className="manual-checkin" onSubmit={manualCheckin}><label>Manual lookup by participant email<input type="email" required value={manualEmail} onChange={(event) => setManualEmail(event.target.value)} placeholder="participant@example.com" /></label><button className="button button-red">Verify & check in</button></form>{mealResult && <div className={`scan-result scan-${mealResult.outcome}`} role="status"><b>{mealResult.message}</b>{mealResult.participantName && <span>{mealResult.participantName} · {mealResult.teamName}{mealResult.participantEmail ? ` · ${mealResult.participantEmail}` : ""}</span>}</div>}<section className="admin-panel"><div className="admin-section-heading"><div><small>CHECK-IN HISTORY</small><h2>Recent scans</h2></div></div><History rows={data.mealCheckins} /></section></section>}
    {tab === "accommodation" && <section className="admin-content"><div className="admin-section-heading"><div><small>PARTICIPANT PORTAL REQUESTS</small><h2>Accommodation</h2></div></div>{!data.accommodations.length ? <p className="admin-empty">No accommodation requests have been submitted.</p> : <div className="accommodation-list">{data.accommodations.map((item) => <article className="admin-panel accommodation-card" key={item.id}><div className="admin-card-top"><span className={`status-pill status-${item.status}`}>{item.status}</span><small>{new Date(item.created_at).toLocaleDateString()}</small></div><h3>{item.teamName}</h3><p><b>{item.participant_name}</b> · {item.guest_count} guest{item.guest_count === 1 ? "" : "s"}</p><p>Phone: {item.participant_phone ? <a href={`tel:${item.participant_phone}`}>{item.participant_phone}</a> : "Not provided"}</p><p>{item.check_in ?? "Date not set"} → {item.check_out ?? "Date not set"}</p><p>{item.requirements || "No additional requirements"}</p><div className="admin-card-actions">{item.status === "pending" && <><button className="button button-red" disabled={busy === item.id} onClick={() => void accommodationAction(item, "approved")}>Approve</button><button className="button button-outline-dark" disabled={busy === item.id} onClick={() => void accommodationAction(item, "rejected")}>Reject</button></>}{item.status === "approved" && <button className="button button-red" disabled={busy === item.id} onClick={() => void accommodationAction(item, "completed")}>Mark completed</button>}</div></article>)}</div>}</section>}
    <footer className="admin-footer">ADMIN ACTIONS ARE AUTHENTICATED AND AUDITED · PAYMENT IS NEVER AUTO-APPROVED</footer>
  </main>;
}

function History({ rows }: { rows: any[] }) {
  if (!rows.length) return <p className="admin-empty">No meal check-ins yet.</p>;
  return <div className="meal-history">{rows.map((row) => <div key={row.id}><span className="status-pill status-confirmed">collected</span><b>{row.participantName}</b><span>{row.teamName}</span><time>{new Date(row.checked_in_at).toLocaleString()}</time></div>)}</div>;
}

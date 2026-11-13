"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { paymentConfig, type RegistrationDomain } from "@/config/registration-domains";
import { MAX_PAYMENT_PROOF_BYTES, validatePaymentProof, validateRegistrationInput, type RegistrationInput, type RegistrationMemberInput } from "@/lib/registration-validation";

type DomainWithCapacity = RegistrationDomain & { registeredTeams: number; remainingSlots: number; full: boolean };
type Submission = { success: true; registrationReference: string; domain: string; teamName: string; status: string; paymentStatus: string; registeredTeams: number; remainingSlots: number; teamLeaderPhone?: string };
const emptyPerson = (): RegistrationMemberInput => ({ fullName: "", email: "", phone: "" });

export default function RegisterPage() {
  const [domains, setDomains] = useState<DomainWithCapacity[]>([]);
  const [selectedDomainSlug, setSelectedDomainSlug] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [teamName, setTeamName] = useState("");
  const [teamSize, setTeamSize] = useState(2);
  const [leader, setLeader] = useState<RegistrationMemberInput>(emptyPerson());
  const [members, setMembers] = useState<RegistrationMemberInput[]>([emptyPerson()]);
  const [utrReference, setUtrReference] = useState("");
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [acceptedRules, setAcceptedRules] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<Submission | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/registration/config", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Registration is unavailable.");
        if (active) {
          setDomains(body.domains as DomainWithCapacity[]);
          setSelectedDomainSlug(body.domains?.[0]?.slug ?? "");
          setChallengeId(body.domains?.[0]?.challenges?.[0]?.id ?? "");
          const firstMinimum = body.domains?.[0]?.challenges?.[0]?.minimumTeamSize ?? body.domains?.[0]?.minimumTeamSize ?? 1;
          setTeamSize(firstMinimum);
          setMembers(Array.from({ length: Math.max(0, firstMinimum - 1) }, emptyPerson));
        }
      })
      .catch((cause) => { if (active) setLoadError(cause instanceof Error ? cause.message : "Registration is unavailable."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const domain = domains.find((item) => item.slug === selectedDomainSlug);
  const challenge = domain?.challenges.find((item) => item.id === challengeId) ?? domain?.challenges[0];
  const effectiveMin = challenge?.minimumTeamSize ?? domain?.minimumTeamSize ?? 1;
  const effectiveMax = challenge?.maximumTeamSize ?? domain?.maximumTeamSize ?? 4;
  const slotOptions = useMemo(() => Array.from({ length: Math.max(0, effectiveMax - effectiveMin + 1) }, (_, index) => effectiveMin + index), [effectiveMin, effectiveMax]);

  function changeDomain(slug: string) {
    const next = domains.find((item) => item.slug === slug);
    const nextChallenge = next?.challenges[0];
    const minimum = nextChallenge?.minimumTeamSize ?? next?.minimumTeamSize ?? 1;
    const maximum = nextChallenge?.maximumTeamSize ?? next?.maximumTeamSize ?? 4;
    setSelectedDomainSlug(slug);
    setChallengeId(nextChallenge?.id ?? "");
    setTeamSize(minimum);
    setMembers(Array.from({ length: Math.max(0, minimum - 1) }, emptyPerson));
    if (maximum < minimum) setError("This challenge has no valid team size configured.");
  }

  function changeChallenge(id: string) {
    const next = domain?.challenges.find((item) => item.id === id);
    if (!next) return;
    const size = Math.min(next.maximumTeamSize, Math.max(next.minimumTeamSize, teamSize));
    setChallengeId(id);
    setTeamSize(size);
    setMembers((current) => Array.from({ length: size - 1 }, (_, index) => current[index] ?? emptyPerson()));
  }

  function changeTeamSize(size: number) {
    setTeamSize(size);
    setMembers((current) => Array.from({ length: size - 1 }, (_, index) => current[index] ?? emptyPerson()));
  }

  function updatePerson(person: "leader" | number, field: keyof RegistrationMemberInput, value: string) {
    if (person === "leader") setLeader((current) => ({ ...current, [field]: value }));
    else setMembers((current) => current.map((member, index) => index === person ? { ...member, [field]: value } : member));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!domain || !challenge) { setError("Select a domain and challenge."); return; }
    if (domain.full) { setError("This domain has reached its capacity. Choose another domain."); return; }
    if (!acceptedRules) { setError("Confirm that you have read the selected domain rules."); return; }
    if (!paymentProof) { setError("Upload your payment screenshot."); return; }

    const input: RegistrationInput = { domainSlug: domain.slug, challengeId: challenge.id, teamName, teamSize, acceptedRules, leader, members, utrReference };
    const validated = validateRegistrationInput(input);
    if (validated.error) { setError(validated.error); return; }
    const proofError = await validatePaymentProof(paymentProof);
    if (proofError) { setError(proofError); return; }

    setBusy(true);
    try {
      const formData = new FormData();
      formData.set("registration", JSON.stringify(input));
      formData.set("paymentProof", paymentProof);
      const response = await fetch("/api/registrations", { method: "POST", body: formData });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Registration could not be submitted.");
      setSuccess(body as Submission);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Registration could not be submitted. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const upiUrl = `upi://pay?pa=${encodeURIComponent(paymentConfig.upiId)}&am=${paymentConfig.amountInr}&cu=INR&tn=${encodeURIComponent("AVISHKAR 2K26 team registration")}`;

  return (
    <main className="registration-page">
      {!success && <header className="registration-topbar">
        <Link className="brand" href="/" aria-label="AVISHKAR Portal home">
          <span className="brand-mark">A<span>.</span></span>
          <span className="brand-copy"><b>AVISHKAR <i>2K26</i></b><small>INNOVATION HACKATHON</small></span>
        </Link>
        <Link className="topbar-back" href="/">Portal home <span aria-hidden="true">↗</span></Link>
      </header>}

      {!success && <section className="registration-hero">
        <div className="registration-eyebrow"><span /> AVISHKAR 2K26 · TEAM ENTRY</div>
        <div className="registration-hero-layout">
          <div><p className="registration-index">01 / REGISTRATION</p><h1>Build your<br /><em>team.</em></h1></div>
          <p className="registration-hero-copy">One clear form for your domain, team and payment proof. Your registration is confirmed after the organisers verify your payment.</p>
        </div>
        <div className="registration-progress"><span className="progress-active">01 <b>TEAM DETAILS</b></span><i /><span>02 <b>PAYMENT</b></span><i /><span>03 <b>SUBMITTED</b></span></div>
      </section>}

      <section className="registration-body">
        {loading && <div className="registration-notice">Loading registration availability…</div>}
        {loadError && !loading && <div className="registration-notice notice-error" role="alert">{loadError}</div>}
        {success ? (
          <section className="registration-success" role="status">
            <span className="success-icon">✓</span><p className="registration-eyebrow">SUBMISSION RECEIVED</p>
            <h2>Thank you for<br /><em>registering.</em></h2>
            <p>Your team details and payment proof have been received. The organisers will verify your payment and send confirmation through WhatsApp to the team leader’s number{success.teamLeaderPhone ? ` (${success.teamLeaderPhone})` : ""}. They will also add your team to the participant group.</p>
            <dl><div><dt>Registration reference</dt><dd>{success.registrationReference}</dd></div><div><dt>Domain</dt><dd>{success.domain}</dd></div><div><dt>Registration status</dt><dd>Payment pending</dd></div><div><dt>Payment status</dt><dd>Pending verification</dd></div><div><dt>Remaining slots</dt><dd>{success.remainingSlots} of {domain?.capacity ?? 20}</dd></div></dl>
            <p>Please keep your WhatsApp number available. Organisers will share portal access after payment verification.</p>
          </section>
        ) : (!loading && !loadError && <form className="registration-form" onSubmit={submit}>
          <section className="form-section" aria-labelledby="domain-heading">
            <div className="section-heading"><span>01</span><div><p>START HERE</p><h2 id="domain-heading">Choose your domain</h2></div><span className="section-heading-side">{domain?.code ?? "—"}</span></div>
            <label className="field-label" htmlFor="domain">Hackathon domain</label>
            <select id="domain" className="form-control" value={selectedDomainSlug} onChange={(event) => changeDomain(event.target.value)} required>
              {domains.map((item) => <option value={item.slug} key={item.slug}>{item.name}{item.full ? " — FULL" : ""}</option>)}
            </select>
            {domain && <div className="domain-info-card">
              <p>{domain.description}</p>
              {domain.challenges.length > 1 && <><label className="field-label" htmlFor="challenge">Challenge</label><select id="challenge" className="form-control" value={challengeId} onChange={(event) => changeChallenge(event.target.value)}>{domain.challenges.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><p className="challenge-description">{challenge?.description}</p></>}
              <div className="capacity-grid"><div><small>TOTAL CAPACITY</small><strong>{domain.capacity}</strong><span>teams</span></div><div><small>REGISTERED TEAMS</small><strong>{domain.registeredTeams}</strong><span>teams</span></div><div><small>SLOTS REMAINING</small><strong className={domain.remainingSlots <= 3 ? "slots-low" : ""}>{domain.remainingSlots}</strong><span>teams</span></div></div>
              <div className="rule-list"><h3>Domain rules</h3><ul>{domain.rules.map((rule) => <li key={rule}>{rule}</li>)}</ul>{domain.challenges.length > 1 && <><h3>{challenge?.name} rules</h3><ul>{challenge?.rules.map((rule) => <li key={rule}>{rule}</li>)}</ul></>}</div>
              <div className="coordinator-row"><span>STUDENT COORDINATORS</span><div>{domain.studentCoordinators.map((coordinator) => <a key={coordinator.phone} href={`tel:${coordinator.phone.replaceAll(" ", "")}`}>{coordinator.name} · {coordinator.phone}</a>)}</div></div>
              {domain.full && <p className="capacity-full" role="status">This domain is full. New registrations are closed.</p>}
            </div>}
          </section>

          <section className="form-section" aria-labelledby="team-heading">
            <div className="section-heading"><span>02</span><div><p>YOUR ENTRY</p><h2 id="team-heading">Team details</h2></div><span className="section-heading-side">{teamSize} MEMBERS</span></div>
            <label className="field-label" htmlFor="teamName">Team name</label>
            <input id="teamName" className="form-control" minLength={2} maxLength={80} required value={teamName} onChange={(event) => setTeamName(event.target.value)} placeholder="e.g. Byte Builders" />
            <label className="field-label" htmlFor="teamSize">Team member count <small>including the leader</small></label>
            <select id="teamSize" className="form-control" value={teamSize} onChange={(event) => changeTeamSize(Number(event.target.value))} required>
              {slotOptions.map((size) => <option key={size} value={size}>{size} {size === 1 ? "member" : "members"}</option>)}
            </select>
            <div className="roster-heading"><span>TEAM LEADER</span><small>MEMBER 1 OF {teamSize}</small></div>
            <PersonFields person={leader} onChange={(field, value) => updatePerson("leader", field, value)} index="L" />
            {members.map((member, index) => <div className="member-entry" key={index}><div className="roster-heading"><span>TEAM MEMBER {index + 2}</span><small>MEMBER {index + 2} OF {teamSize}</small></div><PersonFields person={member} onChange={(field, value) => updatePerson(index, field, value)} index={String(index + 2).padStart(2, "0")} /></div>)}
            <p className="field-hint">The leader is counted once. Add details only for the remaining {teamSize - 1} member{teamSize - 1 === 1 ? "" : "s"}.</p>
          </section>

          <section className="form-section payment-section" aria-labelledby="payment-heading">
            <div className="section-heading"><span>03</span><div><p>SECURE YOUR ENTRY</p><h2 id="payment-heading">Payment details</h2></div><span className="section-heading-side">₹{paymentConfig.amountInr.toLocaleString("en-IN")}</span></div>
            <p className="payment-instructions">{paymentConfig.instructions}</p>
            <div className="payment-grid">
              <div className="payment-qr-card"><QRCodeSVG value={upiUrl} size={184} level="H" includeMargin bgColor="#ffffff" fgColor="#101b31"/><small>SCAN WITH ANY UPI APP</small></div>
              <div className="upi-details"><small>PAYMENT ADDRESS</small><strong>{paymentConfig.upiId}</strong><a className="button button-outline-dark" href={upiUrl}>Open UPI app <span aria-hidden="true">↗</span></a><p>Pay ₹{paymentConfig.amountInr.toLocaleString("en-IN")} for this team. Keep the payment app confirmation screen ready for upload.</p></div>
            </div>
            <label className="field-label" htmlFor="proof">Payment screenshot <small>PNG, JPEG or WebP · up to 2 MiB</small></label>
            <input id="proof" className="form-control file-control" type="file" accept="image/png,image/jpeg,image/webp" required onChange={(event) => setPaymentProof(event.target.files?.[0] ?? null)} />
            {paymentProof && <p className="file-selected">Selected: {paymentProof.name} · {(paymentProof.size / 1024 / 1024).toFixed(2)} MB</p>}
            <label className="field-label" htmlFor="utr">UTR / transaction reference</label>
            <input id="utr" className="form-control" required minLength={6} maxLength={40} pattern="[A-Za-z0-9]{6,40}" value={utrReference} onChange={(event) => setUtrReference(event.target.value.replace(/\s/g, ""))} placeholder="Enter the reference from your UPI payment" />
          </section>

          <div className="registration-submit">
            <label className="rules-accept"><input type="checkbox" checked={acceptedRules} onChange={(event) => setAcceptedRules(event.target.checked)} /><span>I have read the rules for <b>{domain?.name}</b>{challenge && domain && domain.challenges.length > 1 ? <> / <b>{challenge.name}</b></> : ""} and confirm my team details are correct.</span></label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="button button-red submit-button" type="submit" disabled={busy || !domain || domain.full}>{busy ? "Submitting securely…" : "Submit registration"}<span aria-hidden="true">↗</span></button>
            <p className="submit-note">Payment status starts as pending. No participant account or login credentials are created.</p>
          </div>
        </form>)}
      </section>
      {!success && <footer className="registration-footer"><span>AVISHKAR 2K26 · AIT CHIKKAMAGALURU</span><span>Need help? Contact a student coordinator above.</span></footer>}
    </main>
  );
}

function PersonFields({ person, onChange, index }: { person: RegistrationMemberInput; onChange: (field: keyof RegistrationMemberInput, value: string) => void; index: string }) {
  return <div className="person-fields">
    <label><span>Full name</span><input autoComplete="name" required minLength={2} maxLength={120} value={person.fullName} onChange={(event) => onChange("fullName", event.target.value)} placeholder="Full name" /></label>
    <label><span>Email address</span><input type="email" autoComplete="email" required maxLength={254} value={person.email} onChange={(event) => onChange("email", event.target.value)} placeholder="name@college.edu" /></label>
    <label><span>Phone number</span><input type="tel" autoComplete="tel" required minLength={7} maxLength={20} pattern="\+?[0-9().\s-]{7,20}" value={person.phone} onChange={(event) => onChange("phone", event.target.value)} placeholder="+91 …" aria-label={`Phone number for member ${index}`} /></label>
  </div>;
}

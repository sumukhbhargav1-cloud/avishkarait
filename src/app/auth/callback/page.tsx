import Link from "next/link";

export default function AuthCallbackPage() {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">PORTAL ACCESS</p>
        <h1>Email links<br /><span>aren’t used.</span></h1>
        <p className="auth-intro">Use the email address and password provided by an AVISHKAR organiser to sign in.</p>
        <Link className="button button-primary" href="/login">Go to sign in <span aria-hidden="true">↗</span></Link>
      </section>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "../../../lib/supabase";

export default function AuthCallbackPage() {
  const [message, setMessage] = useState("Verifying your secure sign-in link…");

  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase.auth.getSession().then(({ data, error }) => {
      setMessage(error ? "This sign-in link could not be verified. Request a fresh link and try again." : data.session ? "You’re signed in. Registration steps will be available here when an event is open." : "This sign-in link has expired. Request a fresh link and try again.");
    });
  }, []);

  return (
    <main className="auth-shell">
      <Link className="brand auth-brand" href="/"><span className="brand-mark" aria-hidden="true">A</span><span>AVISHKAR<span className="brand-light"> / PORTAL</span></span></Link>
      <section className="auth-card">
        <p className="eyebrow"><span className="live-dot" /> SECURE SIGN-IN</p>
        <h1>Welcome<br /><span>to the portal.</span></h1>
        <p className="auth-intro" role="status">{message}</p>
        <Link className="button button-primary" href="/">Return to portal <span aria-hidden="true">↗</span></Link>
      </section>
      <footer className="auth-footer">Independent AVISHKAR participant portal</footer>
    </main>
  );
}

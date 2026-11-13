"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "../../lib/supabase";

export function AuthForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
      if (profileError || !profile?.role || !["admin", "participant"].includes(profile.role)) {
        await supabase.auth.signOut();
        throw new Error("This account has no portal access. Contact the organisers if you were given login details.");
      }
      router.replace(profile.role === "admin" ? "/admin" : "/participant");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to sign in. Check your portal configuration.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <Link className="brand auth-brand" href="/">
        <span className="brand-mark" aria-hidden="true">A</span>
        <span>AVISHKAR<span className="brand-light"> / PORTAL</span></span>
      </Link>
      <section className="auth-card">
        <p className="eyebrow"><span className="live-dot" /> SECURE PORTAL ACCESS</p>
        <h1>Welcome<br /><span>back.</span></h1>
        <p className="auth-intro">Sign in with the email and password provided by an organiser. Portal accounts are created by the organisers after payment verification.</p>
        <form onSubmit={submit} className="auth-form">
          <label>Email address<input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          <button className="button button-primary" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in securely"}<span aria-hidden="true">↗</span></button>
        </form>
        {message && <p className="auth-message" role="alert">{message}</p>}
        <p className="auth-switch">Need access? Contact the AVISHKAR organisers.</p>
      </section>
      <footer className="auth-footer">Independent AVISHKAR participant and admin portal</footer>
    </main>
  );
}

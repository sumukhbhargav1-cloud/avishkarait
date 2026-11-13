"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "../../lib/supabase";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordMode, setPasswordMode] = useState(mode === "login");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const supabase = getSupabaseClient();
      if (mode === "login" && passwordMode) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/participant");
        return;
      }
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: mode === "register",
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          ...(mode === "register" ? { data: { full_name: name.trim() } } : {}),
        },
      });
      if (error) throw error;
      setMessage("Check your inbox for a secure sign-in link. You can close this page after opening it.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to send the sign-in link. Check your portal configuration.");
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
        <p className="eyebrow"><span className="live-dot" /> PARTICIPANT ACCESS</p>
        <h1>{mode === "register" ? <>Create your<br /><span>portal account.</span></> : <>Welcome<br /><span>back.</span></>}</h1>
        <p className="auth-intro">{mode === "register" ? "Start with your email. We’ll send you a secure link to finish setting up your account." : "Enter the email address connected to your participant account."}</p>
        <form onSubmit={submit} className="auth-form">
          {mode === "register" && <label>Full name<input autoComplete="name" required value={name} onChange={(event) => setName(event.target.value)} /></label>}
          <label>Email address<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          {mode === "login" && passwordMode && <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>}
          <button className="button button-primary" type="submit" disabled={busy}>{busy ? "Signing in…" : mode === "login" && passwordMode ? "Sign in securely" : "Email me a sign-in link"}<span aria-hidden="true">↗</span></button>
        </form>
        {message && <p className="auth-message" role="status">{message}</p>}
        {mode === "login" && <button className="auth-mode-toggle" type="button" onClick={() => { setPasswordMode((value) => !value); setMessage(""); }}>{passwordMode ? "Use an email sign-in link instead" : "Sign in with a password"}</button>}
        <p className="auth-switch">{mode === "register" ? "Already registered?" : "New to AVISHKAR?"} <Link href={mode === "register" ? "/login" : "/register"}>{mode === "register" ? "Sign in" : "Create an account"}</Link></p>
      </section>
      <footer className="auth-footer">Independent AVISHKAR participant portal</footer>
    </main>
  );
}

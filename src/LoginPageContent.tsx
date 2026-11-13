'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { useRouter } from 'next/navigation';

export default function LoginPageContent() {
  const [email, setEmail] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  async function handlePassphraseLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(''); setSending(true);

    if (!supabase) {
      setError('Supabase is not configured.');
      setSending(false);
      return;
    }

    try {
      const res = await fetch('/api/participant/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, passphrase }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Login failed. Please check your email and passphrase.');
        setSending(false);
        return;
      }

      // Establish Supabase session from the returned session data
      if (data.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }

      // Redirect to participant dashboard
      router.replace('/portal');
      setSending(false);
    } catch {
      setError('Could not connect to the login service.');
      setSending(false);
    }
  }

  return <section className="section login-section">
    <div className="section-label">
      <span>AVISHKAR 2K26 / AUTHENTICATION</span>
    </div>
    <div className="login-content">
      <span className="eyebrow"><span className="eyebrow-line"/> SECURE SIGN IN</span>
      <h1>WELCOME BACK</h1>
      <p>Enter your email and passphrase to sign in.</p>

      {/* Passphrase login form */}
      <div className="login-form-section">
        <h2>Passphrase Sign In</h2>
        <p>Use the passphrase your team leader provided during registration.</p>
        <form className="form login-form" onSubmit={handlePassphraseLogin}>
          <label>Email address
            <input
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              value={email}
              onChange={event=>setEmail(event.target.value)}
              placeholder="name@college.edu"/>
          </label>
          <label>Passphrase
            <input
              type="password"
              required
              maxLength={256}
              autoComplete="current-password"
              value={passphrase}
              onChange={event=>setPassphrase(event.target.value)}
              placeholder="Enter your passphrase"/>
          </label>
          <button className="button button-red" type="submit" disabled={sending}>
            {sending?'Signing in…':'Sign in'} <ArrowUpRight size={15}/></button>
        </form>
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}

      <p className="login-back">
        <Link href="/admin/login">Admin sign-in</Link>
      </p>
    </div>
  </section>;
}

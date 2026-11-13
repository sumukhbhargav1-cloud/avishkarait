'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowUpRight, KeyRound } from 'lucide-react';

export default function AdminLogin() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), passphrase }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Sign-in failed. Check your username and passphrase.');
      setPassphrase('');
      router.replace('/admin');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sign-in failed. Check your username and passphrase.');
    } finally {
      setBusy(false);
    }
  }

  return <main className="section admin-passkey-page"><div className="section-label"><span>AVISHKAR 2K26 / ADMIN ACCESS</span><Link href="/">Public website</Link></div><section className="admin-passkey-card"><span className="eyebrow"><span className="eyebrow-line"/> ADMINISTRATOR SIGN-IN</span><h1>ADMIN<br/><span>PORTAL.</span></h1><p>Sign in with the administrator username and passphrase. This sign-in does not send or receive email.</p><form className="form" onSubmit={signIn}><label>Admin username<input name="username" autoComplete="username" required maxLength={80} value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Administrator username"/></label><label>Passphrase<input name="passphrase" type="password" autoComplete="current-password" required maxLength={256} value={passphrase} onChange={(event) => setPassphrase(event.target.value)} placeholder="Enter your passphrase"/></label><button className="button button-red" type="submit" disabled={busy}><KeyRound size={17}/>{busy ? 'Signing in...' : 'Sign in'} <ArrowUpRight size={15}/></button></form>{error && <p className="form-error" role="alert">{error}</p>}<Link className="admin-team-login" href="/login">Team leader sign-in</Link></section></main>;
}


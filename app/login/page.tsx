'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [signup, setSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setBusy(true);
    const supabase = createClient();
    if (!supabase) { setError('Add your Supabase environment variables to enable authentication.'); setBusy(false); return; }
    const result = signup
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (result.error) { setError(result.error.message); return; }
    if (signup && !result.data.session) { setError('Check your email to confirm your account.'); return; }
    router.push('/'); router.refresh();
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <h1>Personal Book Journey</h1>
        <form onSubmit={submit}>
          <div className="field"><label>Email</label><input required type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
          <div className="field"><label>Password</label><input required minLength={6} type="password" value={password} onChange={e => setPassword(e.target.value)} /></div>
          {error && <div className="error">{error}</div>}
          <button className="primary" disabled={busy}>{busy ? 'Please wait…' : signup ? 'Create account' : 'Login'}</button>
        </form>
        <div className="login-switch">
          {signup ? 'Already have an account? ' : "Don't have an account? "}
          <button className="link-btn" onClick={() => { setSignup(!signup); setError(''); }}>{signup ? 'Login' : 'Sign up'}</button>
        </div>
      </section>
    </main>
  );
}

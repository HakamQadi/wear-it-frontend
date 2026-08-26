'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { ArrowRight, Shirt } from 'lucide-react';
import { ErrorNote } from '@/components/StateViews';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const { login, user, ready } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace(user.role === 'admin' ? '/admin' : '/closet');
  }, [ready, user, router]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const profile = await login(form.email.trim(), form.password);
      router.replace(profile.role === 'admin' ? '/admin' : '/closet');
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : 'Could not sign in.');
      setBusy(false);
    }
  }

  return (
    <main className="authPage">
      <section className="authVisual">
        <Link href="/" className="brand light">
          <span className="brandDot light">
            <Shirt size={17} />
          </span>
          Wear It
        </Link>
        <div className="authQuote">
          <h1>Everything you own, ready to try on.</h1>
          <p>Sign in to open your virtual wardrobe, build an outfit and see it rendered on you.</p>
        </div>
        <small>Your closet stays private to your account.</small>
      </section>

      <section className="authFormWrap">
        <form className="authCard" onSubmit={submit}>
          <span className="eyebrow">Welcome back</span>
          <h2>Sign in.</h2>
          <p>Use the email you signed up with.</p>

          <label className="formField">
            <span>Email</span>
            <input
              className="input"
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
          </label>
          <label className="formField">
            <span>Password</span>
            <input
              className="input"
              type="password"
              required
              autoComplete="current-password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
            />
          </label>

          <ErrorNote message={error} />
          <button className="button" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
            <ArrowRight size={17} />
          </button>
          <p className="authSwitch">
            New to Wear It? <Link href="/register">Create an account</Link>
          </p>
        </form>
      </section>
    </main>
  );
}

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { ArrowRight, Shirt } from 'lucide-react';
import { ErrorNote } from '@/components/StateViews';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/api';

const MIN_PASSWORD = 8;

export default function RegisterPage() {
  const router = useRouter();
  const { register, user, ready } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
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
      await register(form.name.trim(), form.email.trim(), form.password);
      router.replace('/closet');
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : 'Could not create your account.');
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
          <h1>Turn your closet into a wardrobe you can browse.</h1>
          <p>Photograph each piece once, then combine outfits and preview them on yourself whenever you want.</p>
        </div>
        <small>Free while Wear It is in preview.</small>
      </section>

      <section className="authFormWrap">
        <form className="authCard" onSubmit={submit}>
          <span className="eyebrow">Create your closet</span>
          <h2>Get started.</h2>
          <p>It takes a minute, and your first item can go in right after.</p>

          <label className="formField">
            <span>Name</span>
            <input
              className="input"
              required
              minLength={2}
              maxLength={80}
              autoComplete="name"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </label>
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
              minLength={MIN_PASSWORD}
              maxLength={72}
              autoComplete="new-password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
            />
            <small className="fieldHint">At least {MIN_PASSWORD} characters.</small>
          </label>

          <ErrorNote message={error} />
          <button className="button" type="submit" disabled={busy}>
            {busy ? 'Creating your closet…' : 'Create account'}
            <ArrowRight size={17} />
          </button>
          <p className="authSwitch">
            Already have an account? <Link href="/login">Sign in</Link>
          </p>
        </form>
      </section>
    </main>
  );
}

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Shirt } from 'lucide-react';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { ErrorNote } from '@/components/StateViews';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/context/I18nContext';
import { useErrorMessage } from '@/lib/useErrorMessage';

const MIN_PASSWORD = 8;

export default function RegisterPage() {
  const router = useRouter();
  const { register, user, ready } = useAuth();
  const { t, dir } = useI18n();
  const describeError = useErrorMessage();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const Forward = dir === 'rtl' ? ArrowLeft : ArrowRight;

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
      setError(describeError(caught, 'register.failed'));
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
          <h1>{t('register.visualTitle')}</h1>
          <p>{t('register.visualText')}</p>
        </div>
        <small>{t('register.visualNote')}</small>
      </section>

      <section className="authFormWrap">
        <form className="authCard" onSubmit={submit}>
          <div className="authTop">
            <span className="eyebrow">{t('register.eyebrow')}</span>
            <LanguageSwitch compact />
          </div>
          <h2>{t('register.title')}</h2>
          <p>{t('register.subtitle')}</p>

          <label className="formField">
            <span>{t('common.name')}</span>
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
            <span>{t('common.email')}</span>
            <input
              className="input"
              type="email"
              dir="ltr"
              required
              autoComplete="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
          </label>
          <label className="formField">
            <span>{t('common.password')}</span>
            <input
              className="input"
              type="password"
              dir="ltr"
              required
              minLength={MIN_PASSWORD}
              maxLength={72}
              autoComplete="new-password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
            />
            <small className="fieldHint">{t('register.passwordHint')}</small>
          </label>

          <ErrorNote message={error} />
          <button className="button" type="submit" disabled={busy}>
            {busy ? t('register.submitting') : t('register.submit')}
            <Forward size={17} />
          </button>
          <p className="authSwitch">
            {t('register.haveAccount')} <Link href="/login">{t('common.signIn')}</Link>
          </p>
        </form>
      </section>
    </main>
  );
}

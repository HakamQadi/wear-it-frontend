'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Camera, Layers, Shirt, Sparkles, WandSparkles } from 'lucide-react';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { useAuth } from '@/context/AuthContext';
import { useI18n, type TranslationKey } from '@/context/I18nContext';
import { api } from '@/lib/api';
import { text } from '@/lib/localise';
import type { SiteContent } from '@/lib/types';

const STEPS: ReadonlyArray<readonly [typeof Camera, TranslationKey, TranslationKey]> = [
  [Camera, 'home.step1Title', 'home.step1Text'],
  [Layers, 'home.step2Title', 'home.step2Text'],
  [WandSparkles, 'home.step3Title', 'home.step3Text'],
];

export default function Home() {
  const { user, ready } = useAuth();
  const { t, locale, dir, tag } = useI18n();
  const [content, setContent] = useState<SiteContent | null>(null);

  useEffect(() => {
    api<SiteContent>('/content')
      .then(setContent)
      .catch(() => {});
  }, []);

  // Arrow glyphs do not mirror with the page direction, so point them by hand.
  const Forward = dir === 'rtl' ? ArrowLeft : ArrowRight;
  // Padding through the formatter, not padStart, so the leading zero is in the same
  // numbering system as the digit it pads.
  const number = (value: number) => new Intl.NumberFormat(tag, { minimumIntegerDigits: 2 }).format(value);

  const primaryHref = ready && user ? '/closet' : '/register';
  const primaryLabel =
    ready && user ? t('home.openCloset') : text(content?.heroCta, locale, t('home.heroCta'));

  return (
    <>
      <Header />
      <main>
        <section className="hero">
          <div className="heroCopy">
            <span className="eyebrow">{t('home.eyebrow')}</span>
            <h1>{text(content?.heroTitle, locale, t('home.heroTitle'))}</h1>
            <p>{text(content?.heroSubtitle, locale, t('home.heroSubtitle'))}</p>
            <div className="heroButtons">
              <Link href={primaryHref} className="button">
                {primaryLabel}
                <Forward size={18} />
              </Link>
              <Link href="#how-it-works" className="button secondary">
                <Sparkles size={17} />
                {t('nav.howItWorks')}
              </Link>
            </div>
          </div>
          <div className="heroVisual" aria-hidden="true">
            <div className="heroRail">
              {['#d8cdbb', '#2f3a44', '#1d2b22', '#b08968'].map((shade) => (
                <span key={shade} className="heroHanger" style={{ background: shade }}>
                  <Shirt size={22} />
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="featureBand" id="how-it-works">
          <div className="container">
            <span className="eyebrow light">{t('home.stepsEyebrow')}</span>
            <h2>{t('home.stepsTitle')}</h2>
            <div className="steps">
              {STEPS.map(([Icon, titleKey, textKey], index) => (
                <div className="stepCard" key={titleKey}>
                  <div className="stepIcon">
                    <Icon />
                  </div>
                  <span className="stepNo">{t('home.step', { number: number(index + 1) })}</span>
                  <h3>{t(titleKey)}</h3>
                  <p>{t(textKey)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container closingBand">
            <div>
              <span className="eyebrow">{t('home.closingEyebrow')}</span>
              <h2>{t('home.closingTitle')}</h2>
              <p className="muted">{t('home.closingText')}</p>
            </div>
            <Link href={primaryHref} className="button">
              {primaryLabel}
              <Forward size={18} />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

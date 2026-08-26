'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Camera, Layers, Shirt, Sparkles, WandSparkles } from 'lucide-react';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import type { SiteContent } from '@/lib/types';

const FALLBACK: SiteContent = {
  brandName: 'Wear It',
  heroTitle: 'Your closet, digitised.',
  heroSubtitle:
    'Photograph what you already own, save it to your virtual wardrobe, then let AI show you wearing any combination of it.',
  heroCta: 'Build my closet',
  announcement: '',
  footerText: '',
};

const STEPS = [
  {
    icon: Camera,
    title: 'Photograph your clothes',
    text: 'Snap each piece from your real closet and give it a clothing type — T-shirt, pants, jacket, dress, shoes and more.',
  },
  {
    icon: Layers,
    title: 'Combine an outfit',
    text: 'Pick one item per type and stack them into a single look. Two T-shirts at once is never allowed.',
  },
  {
    icon: WandSparkles,
    title: 'See it on you',
    text: 'Choose a saved photo of yourself, and AI renders the whole outfit on you in one realistic image.',
  },
];

export default function Home() {
  const { user, ready } = useAuth();
  const [content, setContent] = useState(FALLBACK);

  useEffect(() => {
    api<SiteContent>('/content')
      .then(setContent)
      .catch(() => {});
  }, []);

  const primaryHref = ready && user ? '/closet' : '/register';
  const primaryLabel = ready && user ? 'Open my closet' : content.heroCta;

  return (
    <>
      <Header />
      <main>
        <section className="hero">
          <div className="heroCopy">
            <span className="eyebrow">A personal virtual closet</span>
            <h1>{content.heroTitle}</h1>
            <p>{content.heroSubtitle}</p>
            <div className="heroButtons">
              <Link href={primaryHref} className="button">
                {primaryLabel}
                <ArrowRight size={18} />
              </Link>
              <Link href="#how-it-works" className="button secondary">
                <Sparkles size={17} />
                How it works
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
            <div className="heroCard">
              <span>
                <WandSparkles size={18} />
              </span>
              <div>
                <strong>T-shirt + Pants + Jacket</strong>
                <br />
                <small>One outfit, one generated photo</small>
              </div>
            </div>
          </div>
        </section>

        <section className="featureBand" id="how-it-works">
          <div className="container">
            <span className="eyebrow light">From real closet to virtual wardrobe</span>
            <h2>Three steps to see the outfit before you wear it.</h2>
            <div className="steps">
              {STEPS.map((step, index) => (
                <div className="stepCard" key={step.title}>
                  <div className="stepIcon">
                    <step.icon />
                  </div>
                  <span className="stepNo">Step {String(index + 1).padStart(2, '0')}</span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container closingBand">
            <div>
              <span className="eyebrow">Ready when you are</span>
              <h2>Everything you own, in one place.</h2>
              <p className="muted">
                Your wardrobe, your photos and every generated look stay inside your own account. Nothing is shared with other
                members.
              </p>
            </div>
            <Link href={primaryHref} className="button">
              {primaryLabel}
              <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

'use client';

import { LoaderCircle, PackageSearch, TriangleAlert } from 'lucide-react';
import { useI18n } from '@/context/I18nContext';

export function LoadingState({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <div className="stateView" role="status" aria-live="polite">
      <LoaderCircle className="spin" />
      <p>{label ?? t('common.loading')}…</p>
    </div>
  );
}

export function EmptyState({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="stateView">
      <PackageSearch />
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p className="errorNote" role="alert">
      <TriangleAlert size={14} />
      {message}
    </p>
  );
}

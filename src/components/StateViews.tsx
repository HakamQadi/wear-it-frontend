import { LoaderCircle, PackageSearch, TriangleAlert } from 'lucide-react';

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="stateView" role="status" aria-live="polite">
      <LoaderCircle className="spin" />
      <p>{label}…</p>
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

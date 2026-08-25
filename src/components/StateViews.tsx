import { LoaderCircle, PackageSearch } from 'lucide-react';
export function LoadingState({ label = 'Loading' }: { label?: string }) { return <div className="stateView"><LoaderCircle className="spin"/><p>{label}…</p></div>; }
export function EmptyState({ title, text }: { title: string; text: string }) { return <div className="stateView"><PackageSearch/><h3>{title}</h3><p>{text}</p></div>; }

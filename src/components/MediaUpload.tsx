'use client';
import { ChangeEvent, useState } from 'react';
import { ImagePlus, LoaderCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { authStore } from '@/lib/auth';
export function MediaUpload({ label, value, onChange, hint }: { label: string; value: string; onChange: (url: string) => void; hint?: string }) {
  const [uploading, setUploading] = useState(false); const [error, setError] = useState('');
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    setUploading(true); setError('');
    try { const form = new FormData(); form.append('file', file); const result = await api<{url:string}>('/uploads/image', { method: 'POST', body: form }, authStore.get() || ''); onChange(result.url); }
    catch (e) { setError(e instanceof Error ? e.message : 'Upload failed'); } finally { setUploading(false); event.target.value = ''; }
  }
  return <label className="mediaUpload"><span>{label}</span><div className="uploadRow"><input className="input" value={value} onChange={(e) => onChange(e.target.value)} placeholder="/uploads/... or https://..."/><span className="uploadButton">{uploading ? <LoaderCircle className="spin" size={17}/> : <ImagePlus size={17}/>} Upload<input type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} hidden /></span></div>{hint && <small>{hint}</small>}{error && <small className="fieldError">{error}</small>}</label>;
}

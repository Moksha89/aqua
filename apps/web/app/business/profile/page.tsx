'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiRequest } from '../../../src/lib/api';
import { ActionButton, Card, Field, PageHeader } from '../../../src/components/design-system';

type Profile = { name: string; district?: string | null; village?: string | null; language: string; currency: string; fyStartMonth: number };

export default function BusinessProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [message, setMessage] = useState('');
  useEffect(() => { apiRequest<Profile>('/auth/business/profile').then(setProfile).catch((error) => setMessage(error instanceof Error ? error.message : 'Unable to load business profile')); }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!profile) return;
    try {
      setProfile(await apiRequest<Profile>('/auth/business/profile', { method: 'PATCH', body: JSON.stringify(profile) }));
      setMessage('Business profile saved.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save business profile'); }
  }
  return <div className="rise"><PageHeader eyebrow="Business" title="Business profile" subtitle="Keep your farm identity and financial year details up to date." /><Card className="card-pad">{!profile ? <p className="muted">{message || 'Loading…'}</p> : <form onSubmit={submit} className="grid gap-4"><Field label="Farm name" value={profile.name} onChange={(name) => setProfile({ ...profile, name })} required /><Field label="District" value={profile.district ?? ''} onChange={(district) => setProfile({ ...profile, district })} /><Field label="Village" value={profile.village ?? ''} onChange={(village) => setProfile({ ...profile, village })} /><label className="field-label">Language<select className="field-input" value={profile.language} onChange={(event) => setProfile({ ...profile, language: event.target.value })}><option value="en">English</option><option value="te">తెలుగు</option></select></label><label className="field-label">Currency<select className="field-input" value={profile.currency} onChange={(event) => setProfile({ ...profile, currency: event.target.value })}><option value="INR">INR (₹)</option></select></label><Field label="Financial year starts in month" type="number" value={String(profile.fyStartMonth)} onChange={(fyStartMonth) => setProfile({ ...profile, fyStartMonth: Number(fyStartMonth) })} required /><ActionButton type="submit">Save profile</ActionButton>{message && <p className="text-sm text-primary">{message}</p>}</form>}</Card></div>;
}

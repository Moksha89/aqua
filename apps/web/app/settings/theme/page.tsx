'use client';

import { useState } from 'react';

const tokenNames = ['primary', 'onPrimary', 'secondary', 'onSecondary', 'surface', 'background', 'textPrimary', 'textSecondary', 'border', 'success', 'warning', 'danger', 'info'];
const defaults: Record<string, string> = {};

export default function ThemeSettingsPage() {
  const [tokens, setTokens] = useState(defaults);
  const [message, setMessage] = useState('');
  async function save() {
    const response = await fetch('/api/v1/theme', { method: 'PUT', headers: { 'content-type': 'application/json' }, credentials: 'include', body: JSON.stringify(tokens) });
    setMessage(response.ok ? 'Theme saved' : await response.text());
  }
  async function reset() {
    const response = await fetch('/api/v1/theme/reset', { method: 'POST', credentials: 'include' });
    setMessage(response.ok ? 'Defaults restored' : await response.text());
  }
  return <main className="min-h-screen bg-background p-6"><section className="mx-auto max-w-5xl"><h1 className="text-3xl font-semibold">Theme settings</h1><p className="mt-2 text-textSecondary">Semantic colours apply across every surface.</p><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{tokenNames.map((name) => <label className="flex items-center justify-between rounded-lg border border-border bg-surface p-3" key={name}><span>{name}</span><input aria-label={name} type="color" value={tokens[name]} onChange={(event) => setTokens({ ...tokens, [name]: event.target.value })} /></label>)}</div><div className="mt-6 flex gap-3"><button className="rounded-lg bg-primary px-4 py-2 text-onPrimary" onClick={save}>Save</button><button className="rounded-lg border border-border px-4 py-2" onClick={reset}>Reset</button></div>{message && <p className="mt-3 text-textSecondary">{message}</p>}<div className="mt-8 grid gap-3 md:grid-cols-3"><article className="rounded-xl border border-border bg-surface p-4">Dashboard card</article><span className="rounded-full bg-success px-3 py-1 text-onPrimary">Healthy pond</span><div className="rounded-lg border border-danger p-4 text-danger">Alert preview</div></div></section></main>;
}

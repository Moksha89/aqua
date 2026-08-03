'use client';

import { useEffect, useState } from 'react';

const tokenNames = ['primary', 'onPrimary', 'secondary', 'onSecondary', 'surface', 'background', 'textPrimary', 'textSecondary', 'border', 'success', 'warning', 'danger', 'info', 'pondStatusAttentionGreen', 'pondStatusAttentionAmber', 'pondStatusAttentionRed'];
const defaults: Record<string, string | string[]> = {};
const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export default function ThemeSettingsPage() {
  const [tokens, setTokens] = useState<Record<string, string | string[]>>(defaults);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const token = window.localStorage.getItem('aqua_access_token');
    fetch(`${apiBase}/theme`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }).then((response) => response.ok ? response.json() : null).then((theme) => theme?.tokens && setTokens(theme.tokens));
  }, []);
  useEffect(() => {
    for (const [key, value] of Object.entries(tokens)) {
      if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) continue;
      const hex = value.slice(1);
      document.documentElement.style.setProperty(`--color-${key}`, [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16)).join(' '));
    }
  }, [tokens]);
  const headers = () => ({ 'content-type': 'application/json', ...(window.localStorage.getItem('aqua_access_token') ? { Authorization: `Bearer ${window.localStorage.getItem('aqua_access_token')}` } : {}) });
  async function reason(response: Response) {
    const body = await response.text();
    try {
      const parsed = JSON.parse(body) as { message?: string | string[] };
      return Array.isArray(parsed.message) ? parsed.message.join('\n') : parsed.message ?? body;
    } catch {
      return body;
    }
  }
  async function save() {
    const response = await fetch(`${apiBase}/theme`, { method: 'PUT', headers: headers(), body: JSON.stringify({ tokens }) });
    setMessage(response.ok ? 'Theme saved' : await reason(response));
  }
  async function reset() {
    const response = await fetch(`${apiBase}/theme/reset`, { method: 'POST', headers: headers() });
    setMessage(response.ok ? 'Defaults restored' : await reason(response));
  }
  return <main className="min-h-screen bg-background p-6"><section className="mx-auto max-w-5xl"><h1 className="text-3xl font-semibold">Theme settings</h1><p className="mt-2 text-textSecondary">Semantic colours apply across every surface.</p><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{tokenNames.map((name) => <label className="flex items-center justify-between rounded-lg border border-border bg-surface p-3" key={name}><span>{name}</span><input aria-label={name} type="color" value={tokens[name] ?? ''} onChange={(event) => setTokens({ ...tokens, [name]: event.target.value })} /></label>)}<label className="rounded-lg border border-border bg-surface p-3 sm:col-span-2 lg:col-span-3"><span>chartSeries (comma-separated)</span><input className="mt-2 w-full rounded border border-border p-2" value={Array.isArray(tokens.chartSeries) ? tokens.chartSeries.join(',') : ''} onChange={(event) => setTokens({ ...tokens, chartSeries: event.target.value.split(',').map((value) => value.trim()) })} /></label></div><div className="mt-6 flex gap-3"><button className="rounded-lg bg-primary px-4 py-2 text-onPrimary" onClick={save}>Save</button><button className="rounded-lg border border-border px-4 py-2" onClick={reset}>Reset</button></div>{message && <p className="mt-3 whitespace-pre-wrap text-danger">{message}</p>}<div className="mt-8 grid gap-3 md:grid-cols-3"><article className="rounded-xl border border-border bg-surface p-4">Dashboard card</article><span className="rounded-full bg-success px-3 py-1 text-onPrimary">Healthy pond</span><div className="rounded-lg border border-danger p-4 text-danger">Alert preview</div></div></section></main>;
}

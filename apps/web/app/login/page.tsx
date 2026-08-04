'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest, saveSession } from '../../src/lib/api';
import { useI18n } from '../../src/lib/i18n';

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [mobile, setMobile] = useState('');
  const [code, setCode] = useState('');
  const [deviceId] = useState(() => crypto.randomUUID());
  const [requested, setRequested] = useState(false);
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      if (!requested) {
        await apiRequest('/auth/otp/request', { method: 'POST', body: JSON.stringify({ mobile }) });
        setRequested(true);
        setMessage(t.otpSent);
      } else {
        const result = await apiRequest<{ accessToken: string; refreshToken: string; userId: string }>('/auth/otp/verify', { method: 'POST', body: JSON.stringify({ mobile, code, deviceId }) });
        saveSession({ ...result });
        router.replace('/business');
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : t.unableSignIn); }
  }
  return <main className="flex min-h-screen items-center justify-center bg-background px-4"><form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-sm"><h1 className="text-2xl font-semibold text-textPrimary">{t.login}</h1><p className="mt-2 text-textSecondary">{t.brand}</p><label className="mt-6 block text-sm text-textSecondary">{t.mobile}<input required value={mobile} onChange={(event) => setMobile(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background p-3 text-textPrimary" inputMode="tel" /></label>{requested && <label className="mt-4 block text-sm text-textSecondary">{t.code}<input required value={code} onChange={(event) => setCode(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background p-3 text-textPrimary" inputMode="numeric" maxLength={6} /></label>}<button className="mt-6 w-full rounded-lg bg-primary p-3 font-semibold text-onPrimary" type="submit">{requested ? t.verify : t.requestOtp}</button>{message && <p className="mt-4 rounded-lg bg-info/10 p-3 text-sm text-info">{message}</p>}</form></main>;
}

'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest, saveSession } from '../../src/lib/api';
import { ActionButton, Card, FarmMark, Field } from '../../src/components/design-system';
import { useI18n } from '../../src/lib/i18n';

export default function LoginPage() {
  const { t, language, setLanguage } = useI18n();
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
  return <main className="app-frame flex min-h-screen items-center"><div className="app-content w-full"><div className="mb-10 text-center"><FarmMark /><h1 className="mt-5 text-3xl font-extrabold tracking-tight">{t.brand}</h1><p className="muted mt-2">{language === 'en' ? 'Sign in to manage your farm, ponds and daily work.' : 'మీ ఫార్మ్, చెరువులు మరియు రోజువారీ పనిని నిర్వహించడానికి సైన్ ఇన్ చేయండి.'}</p></div><Card className="card-pad"><div className="mb-5 flex justify-end"><button className="muted text-xs font-bold" onClick={() => setLanguage(language === 'en' ? 'te' : 'en')}>{language === 'en' ? 'తెలుగు' : 'English'}</button></div><form onSubmit={submit} className="grid gap-4"><Field label={t.mobile} value={mobile} onChange={setMobile} type="tel" required />{requested && <Field label={t.code} value={code} onChange={setCode} required />}{message && <p className="rounded-xl bg-primary/10 p-3 text-sm text-primary">{message}</p>}<ActionButton type="submit">{requested ? t.verify : t.requestOtp}</ActionButton></form></Card></div></main>;
}

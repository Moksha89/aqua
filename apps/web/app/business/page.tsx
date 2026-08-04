'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest, getSession, saveSession } from '../../src/lib/api';
import { useI18n } from '../../src/lib/i18n';

export default function BusinessPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [businessId, setBusinessId] = useState(getSession()?.businessId ?? '');
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const result = await apiRequest<{ businessId: string; accessToken: string; role?: string; financialAccess?: boolean; pondScope?: string[] }>('/auth/business/switch', { method: 'POST', body: JSON.stringify({ businessId }) });
      const session = getSession();
      if (session) saveSession({ ...session, ...result });
      router.replace('/');
    } catch (error) { setMessage(error instanceof Error ? error.message : t.businessFailed); }
  }
  return <main className="mx-auto max-w-md rounded-2xl border border-border bg-surface p-6"><h1 className="text-2xl font-semibold">{t.chooseBusiness}</h1><p className="mt-2 text-textSecondary">{t.businessHint}</p><form onSubmit={submit}><input required value={businessId} onChange={(event) => setBusinessId(event.target.value)} className="mt-5 w-full rounded-lg border border-border bg-background p-3" placeholder={t.businessId} /><button className="mt-4 w-full rounded-lg bg-primary p-3 text-onPrimary" type="submit">{t.continue}</button></form>{message && <p className="mt-3 text-danger">{message}</p>}</main>;
}

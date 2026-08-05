'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest, getSession, saveSession } from '../../src/lib/api';
import { ActionButton, Card, Field, PageHeader } from '../../src/components/design-system';
import { useI18n } from '../../src/lib/i18n';

export default function BusinessPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [businessId, setBusinessId] = useState(getSession()?.businessId ?? '');
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const result = await apiRequest<{ businessId: string; accessToken: string; role: string; financialAccess: boolean; pondScope: string[] }>('/auth/business/switch', { method: 'POST', body: JSON.stringify({ businessId }) });
      const session = getSession();
      if (session) saveSession({ ...session, ...result });
      router.replace('/');
    } catch (error) { setMessage(error instanceof Error ? error.message : t.businessFailed); }
  }
  return <div className="rise"><PageHeader eyebrow={t.brand} title={t.chooseBusiness} subtitle={t.businessHint} /><Card className="card-pad"><form onSubmit={submit} className="grid gap-4"><Field label={t.businessId} value={businessId} onChange={setBusinessId} required /><ActionButton type="submit">{t.continue}</ActionButton>{message && <p className="text-sm text-danger">{message}</p>}</form></Card></div>;
}

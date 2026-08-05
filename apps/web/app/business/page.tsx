'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest, getSession, saveSession } from '../../src/lib/api';
import { ActionButton, Card, Field, PageHeader } from '../../src/components/design-system';
import { useI18n } from '../../src/lib/i18n';

type Membership = { businessId: string; name: string; role: string; financialAccess: boolean; pondScope: string[] };

export default function BusinessPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [businesses, setBusinesses] = useState<Membership[]>([]);
  const [name, setName] = useState('');
  const [district, setDistrict] = useState('');
  const [village, setVillage] = useState('');
  const [language, setLanguage] = useState('en');
  const [currency, setCurrency] = useState('INR');
  const [fyStartMonth, setFyStartMonth] = useState('4');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState('');

  const selectBusiness = useCallback(async (id: string) => {
    const result = await apiRequest<{ businessId: string; businessName?: string; accessToken: string; role: string; financialAccess: boolean; pondScope: string[] }>('/auth/business/switch', { method: 'POST', body: JSON.stringify({ businessId: id }) });
    const session = getSession();
    if (session) saveSession({ ...session, ...result });
    router.replace('/');
  }, [router]);

  useEffect(() => {
    apiRequest<Membership[]>('/auth/businesses')
      .then(async (items) => {
        setBusinesses(items);
        if (items.length === 1) await selectBusiness(items[0]!.businessId);
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : t.businessFailed))
      .finally(() => setLoading(false));
  }, [selectBusiness, t.businessFailed]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setCreating(true);
    try {
      const result = await apiRequest<{ businessId: string; businessName: string; accessToken: string; role: string; financialAccess: boolean; pondScope: string[] }>('/auth/businesses', {
        method: 'POST',
        body: JSON.stringify({ name, district: district || undefined, village: village || undefined, language, currency, fyStartMonth: Number(fyStartMonth) }),
      });
      const session = getSession();
      if (session) saveSession({ ...session, ...result });
      router.replace('/');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t.businessFailed);
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <div className="rise"><PageHeader eyebrow={t.brand} title={t.chooseBusiness} subtitle={t.businessHint} /><Card className="card-pad"><p className="muted">{t.loading}</p></Card></div>;
  if (businesses.length > 0) return <div className="rise"><PageHeader eyebrow={t.brand} title={t.chooseBusiness} subtitle="Select the farm you want to manage." /><div className="grid gap-3">{businesses.map((business) => <button key={business.businessId} type="button" className="pond-tile text-left tap" onClick={() => selectBusiness(business.businessId)}><div className="flex items-center justify-between"><div><p className="eyebrow">{business.role}</p><h2 className="mt-1 text-lg font-extrabold">{business.name}</h2></div><i className="ph-duotone ph-arrow-right text-xl text-primary" /></div><p className="muted mt-2 text-sm">{business.financialAccess ? t.money : t.financialUnavailable}</p></button>)}</div>{message && <p className="mt-4 text-sm text-danger">{message}</p>}</div>;
  return <div className="rise"><PageHeader eyebrow={t.brand} title="Set up your farm" subtitle="Add your farm details to start recording ponds and daily work." /><Card className="card-pad"><form onSubmit={submit} className="grid gap-4"><Field label="Farm name" value={name} onChange={setName} required /><Field label="District" value={district} onChange={setDistrict} /><Field label="Village" value={village} onChange={setVillage} /><label className="field-label">Language<select className="field-input" value={language} onChange={(event) => setLanguage(event.target.value)}><option value="en">English</option><option value="te">తెలుగు</option></select></label><label className="field-label">Currency<select className="field-input" value={currency} onChange={(event) => setCurrency(event.target.value)}><option value="INR">INR (₹)</option></select></label><Field label="Financial year starts in month" value={fyStartMonth} onChange={setFyStartMonth} type="number" required /><ActionButton type="submit">{creating ? t.loading : 'Create farm'}</ActionButton>{message && <p className="text-sm text-danger">{message}</p>}</form></Card></div>;
}

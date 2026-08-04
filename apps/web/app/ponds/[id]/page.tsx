'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../../src/lib/api';
import { Figure } from '../../../src/components/figure';
import type { components } from '../../../src/lib/api.generated';
import { useI18n } from '../../../src/lib/i18n';

type Pond = components['schemas']['PondListItemDto'];
export default function PondDetailPage() {
  const { t } = useI18n();
  const { id } = useParams<{ id: string }>();
  const pond = useQuery({ queryKey: ['pond', id], queryFn: () => apiGet<Pond>(`/masters/ponds/${id}`) });
  return <section><Link href="/ponds" className="text-sm text-primary">← {t.backPonds}</Link>{pond.isLoading && <p className="mt-5 text-textSecondary">{t.loading}</p>}{pond.error && <p className="mt-5 text-danger">{pond.error.message}</p>}{pond.data && <><h1 className="mt-3 text-3xl font-semibold">{pond.data.name}</h1><p className="mt-2 text-textSecondary">{pond.data.attention.reason}</p><div className="mt-6 rounded-xl border border-border bg-surface p-5"><h2 className="text-xl font-semibold">{t.activeCrop}</h2>{!pond.data.activeCrop ? <p className="mt-3 text-textSecondary">{t.noActiveCrop}</p> : <><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><Figure label={t.doc} figure={pond.data.activeCrop.doc} /><Figure label="ABW" figure={pond.data.activeCrop.abw} /><Figure label="Biomass" figure={pond.data.activeCrop.biomass} /><Figure label="FCR" figure={pond.data.activeCrop.fcr} /><Figure label="Density" figure={pond.data.activeCrop.density} /></div><Link href={`/daily-entry?pondId=${pond.data.id}&cropId=${pond.data.activeCrop.id}`} className="mt-5 inline-block rounded-lg bg-primary px-4 py-2 text-onPrimary">{t.daily}</Link></>}</div></>}</section>;
}

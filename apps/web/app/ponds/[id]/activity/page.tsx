'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../../../src/lib/api';
import { Card, PageHeader } from '../../../../src/components/design-system';
import type { components } from '../../../../src/lib/api.generated';
import { useI18n } from '../../../../src/lib/i18n';

export default function ActivityPage() {
  const { language } = useI18n();
  const { id } = useParams<{ id: string }>();
  const pond = useQuery({ queryKey: ['pond', id], queryFn: () => apiGet<components['schemas']['PondListItemDto']>(`/masters/ponds/${id}`) });
  const te = language === 'te';
  return <div className="rise"><PageHeader eyebrow={te ? 'పంట కార్యకలాపం' : 'Crop activity'} title={te ? 'ఇటీవలి కార్యకలాపాలు' : 'Recent activity'} subtitle={te ? 'ఈ చెరువు మరియు పంటకు తాజా నమోదులు.' : 'Newest records for this pond and crop.'} /><Card className="card-pad"><p className="muted">{te ? 'కార్యకలాప చరిత్ర ఇంకా అందుబాటులో లేదు.' : 'Activity history is not available yet.'}</p><p className="mt-2 text-sm">{te ? `మీ చెరువు డేటా సిద్ధంగా ఉంది, కానీ చరిత్ర సేవ ఇంకా జోడించబడుతోంది. చెరువు: ${pond.data?.name ?? '—'}.` : `Your pond data is ready, but the activity history service is still being added. Pond: ${pond.data?.name ?? '—'}.`}</p></Card></div>;
}

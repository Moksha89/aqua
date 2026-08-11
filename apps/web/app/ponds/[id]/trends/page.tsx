'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../../../src/lib/api';
import { Card, PageHeader } from '../../../../src/components/design-system';
import type { components } from '../../../../src/lib/api.generated';
import { useI18n } from '../../../../src/lib/i18n';

export default function TrendsPage() {
  const { language } = useI18n();
  const { id } = useParams<{ id: string }>();
  const pond = useQuery({ queryKey: ['pond', id], queryFn: () => apiGet<components['schemas']['PondListItemDto']>(`/masters/ponds/${id}`) });
  const te = language === 'te';
  return <div className="rise"><PageHeader eyebrow={te ? 'పంట ధోరణులు' : 'Crop trends'} title={te ? 'ధోరణులు' : 'Trends'} subtitle={te ? 'కాలక్రమంలో FCR, వృద్ధి మరియు నీటి పరిమితులు.' : 'FCR, growth and water bands over time.'} /><Card className="card-pad"><p className="muted">{te ? 'ధోరణి చరిత్ర ఇంకా అందుబాటులో లేదు.' : 'Trend history is not available yet.'}</p><p className="mt-2 text-sm">{te ? `${pond.data?.name ?? 'ఈ చెరువు'}కు చారిత్రక ధోరణి రీడింగ్‌లు ఇంకా అందుబాటులో లేవు.` : `Historical trend readings are not available for ${pond.data?.name ?? 'this pond'} yet.`}</p></Card></div>;
}

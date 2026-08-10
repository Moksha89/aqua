'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../src/lib/api';
import { Card, EmptyState, PageHeader } from '../../src/components/design-system';
import { useI18n } from '../../src/lib/i18n';

export default function ClosedCropsPage() {
  const { language } = useI18n();
  const query = useQuery({ queryKey: ['closed-crops'], queryFn: () => apiGet<Array<{ id: string; code: string; speciesCategory: string; finalHarvestDate?: string; closedAt?: string }>>('/crops?status=CLOSED') });
  return <section className="rise"><PageHeader eyebrow={language === 'te' ? 'ఆర్కైవ్' : 'Archive'} title={language === 'te' ? 'మూసిన పంటలు' : 'Closed-crop archive'} subtitle={language === 'te' ? 'మూసిన పంటల చరిత్రను మాత్రమే చూడండి.' : 'Read-only frozen P&L and closed crop history.'} /><Card className="card-pad">{query.isLoading ? <p className="muted">{language === 'te' ? 'లోడ్ అవుతోంది…' : 'Loading closed crops…'}</p> : null}{query.data?.length === 0 ? <EmptyState title={language === 'te' ? 'మూసిన పంటలు లేవు' : 'No closed crops yet'} body={language === 'te' ? 'పంట ముగిసిన తర్వాత అది ఇక్కడ కనిపిస్తుంది.' : 'A crop appears here after it is closed.'} /> : <div className="grid gap-3">{(query.data ?? []).map((crop) => <Link href={`/closed-crops/${crop.id}`} key={crop.id}><Card className="card-pad tap"><div className="flex items-center justify-between gap-3"><div><p className="font-extrabold">{crop.code}</p><p className="muted mt-1">{friendly(crop.speciesCategory)} · {shortDate(crop.closedAt ?? crop.finalHarvestDate)}</p></div><span className="chip">{language === 'te' ? 'మూసింది' : 'Closed'}</span></div></Card></Link>)}</div>}</Card></section>;
}
function shortDate(value?: string) { if (!value) return '—'; const date = new Date(value); return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
function friendly(value: string) {
  const text = value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
  const plain: Record<string, string> = { Classification: 'Type', Allocation: 'Shared costs', Target: 'Used for', Basis: 'Price by', Void: 'Removed' };
  return plain[text] ?? text;
}

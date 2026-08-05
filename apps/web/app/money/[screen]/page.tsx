'use client';

import { FormEvent, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiGet, apiRequest, getSession } from '../../../src/lib/api';
import { ActionButton, Card, Field, PageHeader, StatCard } from '../../../src/components/design-system';
import { useI18n } from '../../../src/lib/i18n';

type Screen = 'expense' | 'parties' | 'new-party' | 'ledger' | 'credit' | 'payment' | 'payables' | 'receivables' | 'cash' | 'allocation' | 'idle-cost' | 'lease' | 'assets' | 'scrap';
const paise = (value: unknown) => `₹${(Number(value ?? 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const labels = {
  en: { expense: 'Expense entry', parties: 'Parties', 'new-party': 'New party', ledger: 'Party ledger', credit: 'Supplier credit', payment: 'Payment', payables: 'Payables', receivables: 'Receivables', cash: 'Cash requirement', allocation: 'Allocation working', 'idle-cost': 'Idle pond cost', lease: 'Lease register', assets: 'Assets and disposal', scrap: 'Scrap sales' },
  te: { expense: 'ఖర్చు నమోదు', parties: 'పార్టీలు', 'new-party': 'కొత్త పార్టీ', ledger: 'పార్టీ లెడ్జర్', credit: 'సరఫరాదారు క్రెడిట్', payment: 'చెల్లింపు', payables: 'చెల్లించాల్సినవి', receivables: 'రావాల్సినవి', cash: 'నగదు అవసరం', allocation: 'కేటాయింపు లెక్కలు', 'idle-cost': 'ఖాళీ చెరువు ఖర్చు', lease: 'లీజ్ రిజిస్టర్', assets: 'ఆస్తులు మరియు విక్రయం', scrap: 'స్క్రాప్ అమ్మకాలు' },
} as const;

export default function MoneyScreenPage({ params }: { params: { screen: string } }) {
  const { t, language } = useI18n();
  const screen = params.screen as Screen;
  const title = String(labels[language][screen as keyof typeof labels.en] ?? t.money);
  const session = getSession();
  const financial = session?.financialAccess === true;
  const parties = useQuery({ queryKey: ['money-screen-parties'], queryFn: () => apiGet<Array<{ id: string; name: string; mobile?: string }>>('/masters/parties'), enabled: financial && ['parties', 'new-party', 'ledger', 'credit', 'payment'].includes(screen) });
  const queryPath = screen === 'payables' ? '/finance/payables' : screen === 'receivables' ? '/finance/receivables' : screen === 'cash' ? '/finance/reports/cash' : screen === 'lease' ? '/masters/lease-agreements' : screen === 'assets' ? '/masters/assets' : '';
  const query = useQuery({ queryKey: ['money-screen', screen], queryFn: () => apiGet<unknown>(queryPath), enabled: financial && Boolean(queryPath) });
  const [message, setMessage] = useState('');
  if (!financial) return <section className="rise"><PageHeader eyebrow={t.money} title={title} subtitle={t.financialUnavailable} /><Card className="card-pad"><p className="muted">{t.financialUnavailable}</p></Card></section>;
  return <section className="rise"><PageHeader eyebrow={t.money} title={title} subtitle={language === 'te' ? 'మీ ఫార్మ్ ఆర్థిక వివరాలను చూడండి.' : 'Review the financial details for your farm.'} /><Card className="card-pad">{query.isLoading ? <p className="muted">{t.loading}</p> : null}{query.error ? <p className="text-danger">{String(query.error)}</p> : null}{query.data !== undefined ? <Readable value={query.data} /> : null}{!queryPath ? <ScreenAction screen={screen} parties={parties.data ?? []} message={message} setMessage={setMessage} language={language} /> : null}{query.data === undefined && queryPath && !query.isLoading ? <p className="muted">{t.noData}</p> : null}</Card></section>;
}

function ScreenAction({ screen, parties, message, setMessage, language }: { screen: Screen; parties: Array<{ id: string; name: string }>; message: string; setMessage: (value: string) => void; language: 'en' | 'te' }) {
  const params = useSearchParams();
  const [partyId, setPartyId] = useState(params.get('partyId') ?? '');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [amount, setAmount] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      if (screen === 'new-party') await apiRequest('/masters/parties', { method: 'POST', body: JSON.stringify({ name, mobile, type: ['SUPPLIER'] }) });
      if (screen === 'payment') await apiRequest('/finance/payments', { method: 'POST', body: JSON.stringify({ partyId, paidOn: new Date().toISOString().slice(0, 10), direction: 'PAYABLE', amountPaise: amount, mode: 'CASH' }) });
      setMessage(language === 'te' ? 'సేవ్ చేయబడింది.' : 'Saved.');
    } catch (error) { setMessage(error instanceof Error ? error.message : language === 'te' ? 'సేవ్ చేయడం సాధ్యం కాలేదు.' : 'Unable to save.'); }
  }
  if (screen === 'new-party' || screen === 'payment') return <form onSubmit={submit} className="grid gap-4"><h2 className="section-title">{screen === 'new-party' ? 'Party details' : 'Payment details'}</h2>{screen === 'new-party' ? <><Field label="Name" value={name} onChange={setName} required /><Field label="Mobile" value={mobile} onChange={setMobile} /></> : <><label className="field-label">Party<select className="field-input" value={partyId} onChange={(event) => setPartyId(event.target.value)} required><option value="">Select party</option>{parties.map((party) => <option key={party.id} value={party.id}>{party.name}</option>)}</select></label><Field label="Amount (paise)" value={amount} onChange={setAmount} required /></>}<ActionButton type="submit">Save</ActionButton>{message && <p className="text-primary">{message}</p>}</form>;
  if (screen === 'expense') return <div className="grid gap-3"><p className="muted">{language === 'te' ? 'ఖర్చు నమోదు స్క్రీన్‌లో ఖర్చు తల, కేటాయింపు, పార్టీ, చెల్లింపు, తేదీ మరియు బిల్లు ఫోటో ఉన్నాయి.' : 'Expense entry keeps cost head, allocation, party, payment, date, and bill photo fields together.'}</p><ActionButton href="/money">{language === 'te' ? 'ఖర్చు నమోదు తెరవండి' : 'Open expense entry'}</ActionButton></div>;
  if (screen === 'ledger' || screen === 'credit') return <div className="grid gap-3"><label className="field-label">{language === 'te' ? 'పార్టీ' : 'Party'}<select className="field-input" value={partyId} onChange={(event) => setPartyId(event.target.value)}><option value="">{language === 'te' ? 'పార్టీని ఎంచుకోండి' : 'Select party'}</option>{parties.map((party) => <option key={party.id} value={party.id}>{party.name}</option>)}</select></label>{partyId && <ActionButton href={`/money/${screen}?partyId=${partyId}`}>{language === 'te' ? 'చూడండి' : 'View'}</ActionButton>}<p className="muted text-sm">{language === 'te' ? 'సర్వర్ వివరాలను లోడ్ చేయడానికి పార్టీని ఎంచుకోండి.' : 'Choose a party to load its server-backed details.'}</p></div>;
  return <div className="grid gap-3"><p className="muted">{language === 'te' ? 'ఈ పని సర్వర్ చర్యను కోరుతుంది; బ్రౌజర్‌లో లెక్కించబడదు.' : screen === 'allocation' || screen === 'idle-cost' || screen === 'scrap' ? 'This workflow needs a server action and is not calculated in the browser.' : 'The API does not currently expose a list endpoint for this register.'}</p><span className="chip">NOT DETERMINABLE</span></div>;
}

function Readable({ value, field = '' }: { value: unknown; field?: string }) {
  if (Array.isArray(value)) return <div className="grid gap-3">{value.map((item, index) => <Card className="card-pad" key={index}><Readable value={item} /></Card>)}</div>;
  if (value && typeof value === 'object') return <div className="grid gap-3 sm:grid-cols-2">{Object.entries(value as Record<string, unknown>).map(([key, item]) => <StatCard key={key} label={key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ')} value={typeof item === 'object' ? 'Details' : displayValue(item, key)} />)}</div>;
  return <p className="stat-value">{displayValue(value, field)}</p>;
}

function displayValue(value: unknown, field: string): string {
  if (value === null || value === undefined || value === '') return '—';
  if (/paise|amount|cost|revenue|profit|limit|used|headroom/i.test(field)) return paise(value);
  if (typeof value === 'string' && /^[A-Z][A-Z0-9_]+$/.test(value)) return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
  return String(value);
}

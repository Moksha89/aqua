'use client';

import { FormEvent, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiGet, apiRequest, getSession } from '../../../src/lib/api';
import { ActionButton, Card, EmptyState, Field, PageHeader, StatCard } from '../../../src/components/design-system';
import { useI18n } from '../../../src/lib/i18n';
import { rupeesToPaise } from '../../../src/lib/money';

type Screen = 'expense' | 'parties' | 'new-party' | 'ledger' | 'credit' | 'payment' | 'payables' | 'receivables' | 'cash' | 'cash-requirement' | 'allocation' | 'idle-cost' | 'lease' | 'assets' | 'scrap';
const paise = (value: unknown) => `₹${(Number(value ?? 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const labels = {
  en: { expense: 'Expense entry', parties: 'Parties', 'new-party': 'New party', ledger: 'Party ledger', credit: 'Supplier credit', payment: 'Payment', payables: 'Payables', receivables: 'Receivables', cash: 'Cash', 'cash-requirement': 'Cash requirement', allocation: 'Allocation working', 'idle-cost': 'Idle pond cost', lease: 'Lease register', assets: 'Assets and disposal', scrap: 'Scrap sales' },
  te: { expense: 'ఖర్చు నమోదు', parties: 'పార్టీలు', 'new-party': 'కొత్త పార్టీ', ledger: 'పార్టీ లెడ్జర్', credit: 'సరఫరాదారు క్రెడిట్', payment: 'చెల్లింపు', payables: 'చెల్లించాల్సినవి', receivables: 'రావాల్సినవి', cash: 'నగదు', 'cash-requirement': 'నగదు అవసరం', allocation: 'కేటాయింపు లెక్కలు', 'idle-cost': 'ఖాళీ చెరువు ఖర్చు', lease: 'లీజ్ రిజిస్టర్', assets: 'ఆస్తులు మరియు విక్రయం', scrap: 'స్క్రాప్ అమ్మకాలు' },
} as const;

export default function MoneyScreenPage({ params }: { params: { screen: string } }) {
  const { t, language } = useI18n();
  const screen = params.screen as Screen;
  const title = String(labels[language][screen as keyof typeof labels.en] ?? t.money);
  const session = getSession();
  const financial = session?.financialAccess === true;
  const selectedParty = useSearchParams().get('partyId');
  const parties = useQuery({ queryKey: ['money-screen-parties'], queryFn: () => apiGet<Array<{ id: string; name: string; type?: string[]; mobile?: string; openingBalancePaise?: string }>>('/masters/parties'), enabled: financial && ['parties', 'new-party', 'ledger', 'credit', 'payment', 'payables', 'receivables', 'cash', 'cash-requirement'].includes(screen) });
  const ponds = useQuery({ queryKey: ['money-screen-ponds'], queryFn: () => apiGet<Array<{ id: string; name: string }>>('/masters/ponds'), enabled: financial && screen === 'idle-cost' });
  const queryPath = screen === 'parties' ? '/masters/parties' : screen === 'payables' ? '/finance/payables' : screen === 'receivables' ? '/finance/receivables' : (screen === 'cash' || screen === 'cash-requirement') ? '/finance/reports/cash' : screen === 'lease' ? '/masters/lease-agreements' : screen === 'assets' ? '/masters/assets' : screen === 'credit' && selectedParty ? `/finance/suppliers/${selectedParty}/headroom` : screen === 'credit' ? '/masters/supplier-credit-limits' : screen === 'ledger' && selectedParty ? `/finance/parties/${selectedParty}/ledger` : '';
  const query = useQuery({ queryKey: ['money-screen', screen, selectedParty], queryFn: () => apiGet<unknown>(queryPath), enabled: financial && Boolean(queryPath) });
  const [message, setMessage] = useState('');
  if (!financial) return <section className="rise"><PageHeader eyebrow={t.money} title={title} subtitle={t.financialUnavailable} /><Card className="card-pad"><p className="muted">{t.financialUnavailable}</p></Card></section>;
  const subtitle = {
    expense: ['Record a farm expense with its pond, crop and bill.', 'చెరువు, పంట మరియు బిల్లు వివరాలతో ఖర్చు నమోదు చేయండి.'],
    parties: ['Keep your suppliers, buyers and other farm contacts together.', 'మీ సరఫరాదారులు, కొనుగోలుదారులు మరియు ఇతర పరిచయాలను ఇక్కడ ఉంచండి.'],
    'new-party': ['Add a supplier, buyer or other farm contact.', 'సరఫరాదారు, కొనుగోలుదారు లేదా ఇతర ఫార్మ్ పరిచయాన్ని జోడించండి.'],
    ledger: ['See every expense and payment with this party.', 'ఈ పార్టీకి సంబంధించిన ప్రతి ఖర్చు మరియు చెల్లింపును చూడండి.'],
    credit: ['Check supplier limits and remaining headroom.', 'సరఫరాదారు పరిమితి మరియు మిగిలిన క్రెడిట్ చూడండి.'],
    payment: ['Record money paid or received from a farm contact.', 'ఫార్మ్ పరిచయానికి చెల్లించిన లేదా అందుకున్న మొత్తాన్ని నమోదు చేయండి.'],
    payables: ['See bills that still need to be paid.', 'ఇంకా చెల్లించాల్సిన బిల్లులను చూడండి.'],
    receivables: ['See money expected from your harvests.', 'మీ కోతల నుంచి రావాల్సిన మొత్తాన్ని చూడండి.'],
    cash: ['Follow money moving in and out of the farm.', 'ఫార్మ్‌లోకి వచ్చిన మరియు బయటకు వెళ్లిన డబ్బును చూడండి.'],
    'cash-requirement': ['Plan upcoming farm payments from your cash records.', 'మీ నగదు రికార్డులతో రాబోయే ఫార్మ్ చెల్లింపులను ప్లాన్ చేయండి.'],
    allocation: ['Review how shared farm costs are distributed.', 'సాధారణ ఫార్మ్ ఖర్చులు ఎలా పంచబడ్డాయో చూడండి.'],
    'idle-cost': ['Record the cost of a pond while it is idle.', 'చెరువు ఖాళీగా ఉన్నప్పుడు దాని ఖర్చును నమోదు చేయండి.'],
    lease: ['Review land leases and their payment terms.', 'భూమి లీజులు మరియు చెల్లింపు నిబంధనలను చూడండి.'],
    assets: ['Keep track of farm equipment and disposal.', 'ఫార్మ్ పరికరాలు మరియు విక్రయాలను ట్రాక్ చేయండి.'],
    scrap: ['Record income from scrap sold on the farm.', 'ఫార్మ్‌లో అమ్మిన స్క్రాప్ ఆదాయాన్ని నమోదు చేయండి.'],
  }[screen] ?? ['Manage your farm money and payments.', 'మీ ఫార్మ్ డబ్బు లావాదేవీలను నిర్వహించండి.'];
  return <section className="rise"><PageHeader eyebrow={t.money} title={title} subtitle={language === 'te' ? subtitle[1] : subtitle[0]} /><Card className="card-pad">{query.isLoading ? <p className="muted">{t.loading}</p> : null}{query.error ? <p className="text-danger">{String(query.error)}</p> : null}{query.data !== undefined ? <ScreenRows screen={screen} value={query.data} parties={parties.data ?? []} language={language} /> : null}{(!queryPath || screen === 'allocation' || screen === 'idle-cost' || (screen === 'ledger' && !selectedParty) || (screen === 'credit' && !selectedParty)) ? <ScreenAction screen={screen} parties={parties.data ?? []} ponds={ponds.data ?? []} message={message} setMessage={setMessage} language={language} /> : null}{query.data === undefined && queryPath && !query.isLoading ? <p className="muted">{t.noData}</p> : null}</Card></section>;
}

function ScreenAction({ screen, parties, ponds, message, setMessage, language }: { screen: Screen; parties: Array<{ id: string; name: string }>; ponds: Array<{ id: string; name: string }>; message: string; setMessage: (value: string) => void; language: 'en' | 'te' }) {
  const params = useSearchParams();
  const [partyId, setPartyId] = useState(params.get('partyId') ?? '');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [partyType, setPartyType] = useState('SUPPLIER');
  const [amount, setAmount] = useState('');
  const [paymentDirection, setPaymentDirection] = useState('PAYABLE');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      if (screen === 'new-party') await apiRequest('/masters/parties', { method: 'POST', body: JSON.stringify({ name, mobile, type: [partyType] }) });
      if (screen === 'payment') await apiRequest('/finance/payments', { method: 'POST', body: JSON.stringify({ partyId, paidOn: new Date().toISOString().slice(0, 10), direction: paymentDirection, amountPaise: rupeesToPaise(amount), mode: paymentMode }) });
      if (screen === 'allocation') await apiRequest('/allocations/runs', { method: 'POST', body: JSON.stringify({ periodStart: fromDate, periodEnd: toDate, trigger: 'MONTH_END' }) });
      if (screen === 'idle-cost') await apiRequest('/allocations/idle-pond-costs', { method: 'POST', body: JSON.stringify({ pondId: partyId, fromDate, toDate }) });
      setMessage(language === 'te' ? 'సేవ్ చేయబడింది.' : 'Saved.');
    } catch (error) { setMessage(error instanceof Error ? error.message : language === 'te' ? 'సేవ్ చేయడం సాధ్యం కాలేదు.' : 'Unable to save.'); }
  }
  if (screen === 'new-party' || screen === 'payment') return <form onSubmit={submit} className="grid gap-4"><h2 className="section-title">{screen === 'new-party' ? 'Party details' : 'Payment details'}</h2>{screen === 'new-party' ? <><Field label="Name" value={name} onChange={setName} required /><Field label="Mobile" value={mobile} onChange={setMobile} /><label className="field-label">Party type<select className="field-input" value={partyType} onChange={(event) => setPartyType(event.target.value)}><option value="SUPPLIER">Supplier</option><option value="BUYER">Buyer</option><option value="LANDLORD">Landlord</option></select></label></> : <><label className="field-label">Party<select className="field-input" value={partyId} onChange={(event) => setPartyId(event.target.value)} required><option value="">Select party</option>{parties.map((party) => <option key={party.id} value={party.id}>{party.name}</option>)}</select></label><Field label="Amount (₹)" value={amount} onChange={setAmount} required /><label className="field-label">Direction<select className="field-input" value={paymentDirection} onChange={(event) => setPaymentDirection(event.target.value)}><option value="PAYABLE">Payable</option><option value="RECEIVABLE">Receivable</option></select></label><label className="field-label">Payment mode<select className="field-input" value={paymentMode} onChange={(event) => setPaymentMode(event.target.value)}><option value="CASH">Cash</option><option value="BANK">Bank</option><option value="UPI">UPI</option><option value="CHEQUE">Cheque</option></select></label></>}<ActionButton type="submit">Save</ActionButton>{message && <p className="text-primary">{message}</p>}</form>;
  if (screen === 'expense') return <ExpenseAction parties={parties} language={language} message={message} setMessage={setMessage} />;
  if (screen === 'allocation' || screen === 'idle-cost') return <form onSubmit={submit} className="grid gap-4"><h2 className="section-title">{language === 'te' ? 'సర్వర్ కేటాయింపు పని' : 'Server allocation working'}</h2>{screen === 'idle-cost' && <label className="field-label">{language === 'te' ? 'చెరువు' : 'Pond'}<select className="field-input" value={partyId} onChange={(event) => setPartyId(event.target.value)} required><option value="">{language === 'te' ? 'చెరువును ఎంచుకోండి' : 'Select pond'}</option>{ponds.map((pond) => <option key={pond.id} value={pond.id}>{pond.name}</option>)}</select></label>}<Field label={language === 'te' ? 'ప్రారంభ తేదీ' : 'From date'} type="date" value={fromDate} onChange={setFromDate} required /><Field label={language === 'te' ? 'ముగింపు తేదీ' : 'To date'} type="date" value={toDate} onChange={setToDate} required /><ActionButton type="submit">{language === 'te' ? 'సర్వర్‌లో అమలు చేయండి' : 'Run on server'}</ActionButton>{message && <p className="text-primary">{message}</p>}</form>;
  if (screen === 'ledger' || screen === 'credit') return <div className="grid gap-3"><label className="field-label">{language === 'te' ? 'పార్టీ' : 'Party'}<select className="field-input" value={partyId} onChange={(event) => setPartyId(event.target.value)}><option value="">{language === 'te' ? 'పార్టీని ఎంచుకోండి' : 'Select party'}</option>{parties.map((party) => <option key={party.id} value={party.id}>{party.name}</option>)}</select></label>{partyId && <ActionButton href={`/money/${screen}?partyId=${partyId}`}>{language === 'te' ? 'చూడండి' : 'View'}</ActionButton>}<p className="muted text-sm">{language === 'te' ? 'సర్వర్ వివరాలను లోడ్ చేయడానికి పార్టీని ఎంచుకోండి.' : 'Choose a party to load its server-backed details.'}</p></div>;
  return <div className="grid gap-3"><p className="muted">{language === 'te' ? 'ఈ పని సర్వర్ చర్యను కోరుతుంది; బ్రౌజర్‌లో లెక్కించబడదు.' : screen === 'scrap' ? 'This workflow needs a server action and is not calculated in the browser.' : 'The API does not currently expose a list endpoint for this register.'}</p><span className="chip">NOT DETERMINABLE</span></div>;
}

function ExpenseAction({ parties, language, message, setMessage }: { parties: Array<{ id: string; name: string }>; language: 'en' | 'te'; message: string; setMessage: (value: string) => void }) {
  const ponds = useQuery({ queryKey: ['money-expense-ponds'], queryFn: () => apiGet<Array<{ id: string; name: string; activeCrop?: { id: string; code: string } | null }>>('/masters/ponds') });
  const heads = useQuery({ queryKey: ['money-expense-cost-heads'], queryFn: () => apiGet<Array<{ id: string; code: string; name: string }>>('/masters/cost-heads') });
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [costHeadId, setCostHeadId] = useState('');
  const [allocationTarget, setAllocationTarget] = useState('POND_CROP');
  const [pondId, setPondId] = useState('');
  const [cropId, setCropId] = useState('');
  const [partyId, setPartyId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('UNPAID');
  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await apiRequest('/finance/expenses', { method: 'POST', body: JSON.stringify({
        expenseDate: date, costHeadId, allocationTarget, pondId: allocationTarget === 'POND_CROP' ? pondId : undefined,
        cropId: allocationTarget === 'POND_CROP' ? cropId : undefined, partyId: partyId || undefined,
        amountPaise: rupeesToPaise(amount), paymentStatus,
      }) });
      setMessage(language === 'te' ? 'ఖర్చు సేవ్ అయింది.' : 'Expense saved.');
    } catch (error) { setMessage(error instanceof Error ? error.message : language === 'te' ? 'ఖర్చు సేవ్ కాలేదు.' : 'Unable to save expense.'); }
  }
  return <form onSubmit={submit} className="grid gap-4"><h2 className="section-title">{language === 'te' ? 'ఖర్చు వివరాలు' : 'Expense details'}</h2>
    <Field label={language === 'te' ? 'ఖర్చు తేదీ' : 'Expense date'} type="date" value={date} onChange={setDate} required />
    <label className="field-label">{language === 'te' ? 'ఖర్చు తల' : 'Cost head'}<select className="field-input" value={costHeadId} onChange={(event) => setCostHeadId(event.target.value)} required><option value="">Select cost head</option>{(heads.data ?? []).map((head) => <option key={head.id} value={head.id}>{head.code} · {head.name}</option>)}</select></label>
    <label className="field-label">{language === 'te' ? 'కేటాయింపు' : 'Allocation'}<select className="field-input" value={allocationTarget} onChange={(event) => setAllocationTarget(event.target.value)}><option value="POND_CROP">Pond / crop</option><option value="COMMON">Common farm cost</option></select></label>
    {allocationTarget === 'POND_CROP' && <><label className="field-label">{language === 'te' ? 'చెరువు' : 'Pond'}<select className="field-input" value={pondId} onChange={(event) => { setPondId(event.target.value); setCropId(ponds.data?.find((pond) => pond.id === event.target.value)?.activeCrop?.id ?? ''); }} required><option value="">Select pond</option>{(ponds.data ?? []).map((pond) => <option key={pond.id} value={pond.id}>{pond.name}</option>)}</select></label><label className="field-label">{language === 'te' ? 'పంట' : 'Crop'}<select className="field-input" value={cropId} onChange={(event) => setCropId(event.target.value)} required><option value="">Select crop</option>{ponds.data?.find((pond) => pond.id === pondId)?.activeCrop && <option value={ponds.data.find((pond) => pond.id === pondId)!.activeCrop!.id}>{ponds.data.find((pond) => pond.id === pondId)!.activeCrop!.code}</option>}</select></label></>}
    <label className="field-label">{language === 'te' ? 'పార్టీ' : 'Party'}<select className="field-input" value={partyId} onChange={(event) => setPartyId(event.target.value)}><option value="">No party</option>{parties.map((party) => <option key={party.id} value={party.id}>{party.name}</option>)}</select></label>
    <Field label={language === 'te' ? 'మొత్తం (రూపాయలు)' : 'Amount (₹)'} value={amount} onChange={setAmount} required />
    <label className="field-label">{language === 'te' ? 'చెల్లింపు స్థితి' : 'Payment status'}<select className="field-input" value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)}><option value="UNPAID">Unpaid</option><option value="PAID">Paid</option><option value="PART_PAID">Part paid</option></select></label>
    <label className="field-label">{language === 'te' ? 'బిల్లు ఫోటో' : 'Bill photo'}<input className="field-input" type="file" accept="image/*" capture="environment" /></label>
    <ActionButton type="submit">{language === 'te' ? 'ఖర్చు సేవ్ చేయండి' : 'Save expense'}</ActionButton>{message && <p className="text-primary">{message}</p>}
  </form>;
}

function ScreenRows({ screen, value, parties, language }: { screen: Screen; value: unknown; parties: Array<{ id: string; name: string; type?: string[]; mobile?: string; openingBalancePaise?: string }>; language: 'en' | 'te' }) {
  if (screen === 'parties' && Array.isArray(value)) return <div className="grid gap-3">{value.map((item) => {
    const row = item as Record<string, unknown>;
    return <Card className="card-pad" key={String(row.id)}><p className="text-lg font-extrabold">{String(row.name ?? '—')}</p><p className="muted mt-1">{String((row.type as string[] | undefined)?.join(', ') ?? 'Farm contact')}</p><div className="mt-3 flex flex-wrap gap-3 text-sm"><span>{String(row.mobile ?? 'No mobile')}</span><span>{paise(row.openingBalancePaise)}</span></div></Card>;
  })}</div>;
  if (screen === 'payables' && Array.isArray(value)) return <div className="grid gap-3">{value.map((item) => {
    const row = item as Record<string, unknown>;
    const party = parties.find((candidate) => candidate.id === row.partyId);
    return <Card className="card-pad" key={String(row.id)}><div className="flex items-start justify-between gap-3"><div><p className="font-extrabold">{party?.name ?? 'Supplier'}</p><p className="muted mt-1">{formatDate(row.expenseDate)} · {friendlyStatus(row.paymentStatus, language)}</p></div><p className="text-lg font-extrabold">{paise(row.amountPaise)}</p></div></Card>;
  })}</div>;
  if ((screen === 'cash' || screen === 'cash-requirement') && value && typeof value === 'object') {
    const data = value as { payments?: unknown[]; expenses?: unknown[] };
    const groups: Array<[string, unknown[], string]> = [['payments', data.payments ?? [], 'Payments'], ['expenses', data.expenses ?? [], 'Expenses']];
    return <div className="grid gap-5">{groups.map(([kind, rows, heading]) => <section key={kind}><h2 className="section-title">{language === 'te' ? (kind === 'payments' ? 'చెల్లింపులు' : 'ఖర్చులు') : heading}</h2><div className="mt-3 grid gap-3">{rows.map((item) => {
      const row = item as Record<string, unknown>;
      const party = parties.find((candidate) => candidate.id === (row.partyId as string));
      const date = row.paidOn ?? row.expenseDate;
      return <Card className="card-pad" key={String(row.id)}><div className="flex items-start justify-between gap-3"><div><p className="font-extrabold">{party?.name ?? (kind === 'payments' ? 'Farm payment' : 'Farm expense')}</p><p className="muted mt-1">{formatDate(date)}{row.mode ? ` · ${friendlyStatus(row.mode, language)}` : ''}</p></div><p className="text-lg font-extrabold">{paise(row.amountPaise)}</p></div></Card>;
    })}</div></section>)}</div>;
  }
  return <Readable value={value} language={language} />;
}

function Readable({ value, field = '', language = 'en' }: { value: unknown; field?: string; language?: 'en' | 'te' }) {
  if (Array.isArray(value)) return value.length === 0 ? <EmptyState title={language === 'te' ? 'రికార్డులు లేవు' : 'No records yet'} body={language === 'te' ? 'సర్వర్‌లో ఈ జాబితాకు ఇంకా రికార్డులు లేవు.' : 'There are no records in this server-backed list yet.'} /> : <div className="grid gap-3">{value.map((item, index) => <Card className="card-pad" key={String((item as Record<string, unknown>)?.id ?? index)}><Readable value={item} language={language} /></Card>)}</div>;
  if (value && typeof value === 'object') return <div className="grid gap-4 sm:grid-cols-2">{Object.entries(value as Record<string, unknown>).filter(([key]) => !isInternalKey(key)).map(([key, item]) => <section key={key} className="min-w-0">{typeof item === 'object' ? <><h2 className="section-title">{farmerLabel(key)}</h2><Readable value={item} field={key} language={language} /></> : <StatCard label={farmerLabel(key)} value={displayValue(item, key)} />}</section>)}</div>;
  return <p className="stat-value">{displayValue(value, field)}</p>;
}

function farmerLabel(key: string): string {
  const clean = key.replace(/Paise$/i, '');
  const known: Record<string, string> = { view: 'Summary', expenses: 'Expenses', payments: 'Payments' };
  return known[clean] ?? clean.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function displayValue(value: unknown, field: string): string {
  if (value === null || value === undefined || value === '') return '—';
  if (/paise|amount|cost|revenue|profit|limit|used|headroom/i.test(field)) return paise(value);
  if (typeof value === 'string' && /^[A-Z][A-Z0-9_]+$/.test(value)) return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
  if (/date|on$/i.test(field) && typeof value === 'string') return formatDate(value);
  return String(value);
}

function isInternalKey(key: string): boolean { return /^(id|.*Id|businessId|createdAt|updatedAt|voidedAt|rev|deviceId|view)$/i.test(key); }
function formatDate(value: unknown): string { if (typeof value !== 'string') return '—'; const date = new Date(value); return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
function friendlyStatus(value: unknown, language: 'en' | 'te'): string {
  const text = String(value ?? '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
  if (language === 'te') return text === 'Paid' ? 'చెల్లించారు' : text === 'Unpaid' ? 'చెల్లించలేదు' : text;
  return text;
}

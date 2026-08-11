'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiGet, apiRequest, getSession } from '../../../src/lib/api';
import { ActionButton, Card, Disclosure, EmptyState, Field, PageHeader, StatCard } from '../../../src/components/design-system';
import { useI18n } from '../../../src/lib/i18n';
import { formatPaise, formatQuantity, rupeesToPaise } from '../../../src/lib/money';

type Screen = 'expense' | 'parties' | 'new-party' | 'ledger' | 'credit' | 'payment' | 'payables' | 'receivables' | 'cash' | 'cash-requirement' | 'allocation' | 'idle-cost' | 'lease' | 'assets' | 'scrap';
const paise = formatPaise;
const labels = {
  en: { expense: 'Expense entry', parties: 'Parties', 'new-party': 'New party', ledger: 'Party ledger', credit: 'Supplier credit', payment: 'Payment', payables: 'Payables', receivables: 'Receivables', cash: 'Cash', 'cash-requirement': 'Cash requirement', allocation: 'Shared costs', 'idle-cost': 'Pond costs', lease: 'Lease register', assets: 'Assets and disposal', scrap: 'Scrap sales' },
  te: { expense: 'ఖర్చు నమోదు', parties: 'పార్టీలు', 'new-party': 'కొత్త పార్టీ', ledger: 'పార్టీ లెడ్జర్', credit: 'సరఫరాదారు క్రెడిట్', payment: 'చెల్లింపు', payables: 'చెల్లించాల్సినవి', receivables: 'రావాల్సినవి', cash: 'నగదు', 'cash-requirement': 'నగదు అవసరం', allocation: 'పంచిన ఖర్చులు', 'idle-cost': 'చెరువు ఖర్చులు', lease: 'లీజ్ రిజిస్టర్', assets: 'ఆస్తులు మరియు విక్రయం', scrap: 'స్క్రాప్ అమ్మకాలు' },
} as const;

export default function MoneyScreenPage({ params }: { params: { screen: string } }) {
  const { t, language } = useI18n();
  const screen = params.screen as Screen;
  const title = String(labels[language][screen as keyof typeof labels.en] ?? t.money);
  const session = getSession();
  const financial = session?.financialAccess === true;
  const selectedParty = useSearchParams().get('partyId');
  const runId = useSearchParams().get('runId');
  const parties = useQuery({ queryKey: ['money-screen-parties'], queryFn: () => apiGet<Array<{ id: string; name: string; type?: string[]; mobile?: string; openingBalancePaise?: string }>>('/masters/parties'), enabled: financial && ['parties', 'new-party', 'ledger', 'credit', 'payment', 'payables', 'receivables', 'cash', 'cash-requirement', 'scrap'].includes(screen) });
  const ponds = useQuery({ queryKey: ['money-screen-ponds'], queryFn: () => apiGet<Array<{ id: string; name: string; activeCrop?: { id: string; code: string } | null }>>('/masters/ponds'), enabled: financial && (screen === 'idle-cost' || screen === 'allocation') });
  const queryPath = screen === 'parties' ? '/masters/parties' : screen === 'payables' ? '/finance/payables' : screen === 'receivables' ? '/finance/receivables' : (screen === 'cash' || screen === 'cash-requirement') ? '/finance/reports/cash' : screen === 'lease' ? '/masters/lease-agreements' : screen === 'assets' ? '/masters/assets' : screen === 'scrap' ? '/finance/scrap-sales' : screen === 'allocation' && runId ? `/allocations/runs/${runId}/derivation` : screen === 'allocation' ? '/allocations/runs' : screen === 'credit' && selectedParty ? `/finance/suppliers/${selectedParty}/headroom` : screen === 'credit' ? '/masters/supplier-credit-limits' : screen === 'ledger' && selectedParty ? `/finance/parties/${selectedParty}/ledger` : '';
  const query = useQuery({ queryKey: ['money-screen', screen, selectedParty, runId], queryFn: () => apiGet<unknown>(queryPath), enabled: financial && Boolean(queryPath) });
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
  return <section className="rise"><PageHeader eyebrow={t.money} title={title} subtitle={language === 'te' ? subtitle[1] : subtitle[0]} /><Card className="card-pad">{query.isLoading ? <p className="muted">{t.loading}</p> : null}{query.error ? <p className="text-danger">{String(query.error)}</p> : null}{query.data !== undefined ? <ScreenRows screen={screen} value={query.data} parties={parties.data ?? []} ponds={ponds.data ?? []} language={language} runId={runId} /> : null}{(!queryPath || (screen === 'allocation' && !runId) || screen === 'idle-cost' || ((screen as string) === 'scrap') || (screen === 'ledger' && !selectedParty) || (screen === 'credit' && !selectedParty)) ? <ScreenAction screen={screen} parties={parties.data ?? []} ponds={ponds.data ?? []} message={message} setMessage={setMessage} language={language} /> : null}{query.data === undefined && queryPath && !query.isLoading ? <p className="muted">{t.noData}</p> : null}</Card></section>;
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
  if (screen === 'new-party' || screen === 'payment') return <form onSubmit={submit} className="grid gap-4"><h2 className="section-title">{screen === 'new-party' ? (language === 'te' ? 'పార్టీ వివరాలు' : 'Party details') : (language === 'te' ? 'చెల్లింపు వివరాలు' : 'Payment details')}</h2>{screen === 'new-party' ? <><Field label={language === 'te' ? 'పేరు' : 'Name'} value={name} onChange={setName} required /><Field label={language === 'te' ? 'మొబైల్' : 'Mobile'} value={mobile} onChange={setMobile} /><label className="field-label">{language === 'te' ? 'పార్టీ రకం' : 'Party type'}<select className="field-input" value={partyType} onChange={(event) => setPartyType(event.target.value)}><option value="SUPPLIER">{language === 'te' ? 'సరఫరాదారు' : 'Supplier'}</option><option value="BUYER">{language === 'te' ? 'కొనుగోలుదారు' : 'Buyer'}</option><option value="LANDLORD">{language === 'te' ? 'భూస్వామి' : 'Landlord'}</option></select></label></> : <><label className="field-label">{language === 'te' ? 'పార్టీ' : 'Party'}<select className="field-input" value={partyId} onChange={(event) => setPartyId(event.target.value)} required><option value="">{language === 'te' ? 'పార్టీని ఎంచుకోండి' : 'Select party'}</option>{parties.map((party) => <option key={party.id} value={party.id}>{party.name}</option>)}</select></label><Field label={language === 'te' ? 'మొత్తం (₹)' : 'Amount (₹)'} value={amount} onChange={setAmount} required /><label className="field-label">{language === 'te' ? 'దిశ' : 'Direction'}<select className="field-input" value={paymentDirection} onChange={(event) => setPaymentDirection(event.target.value)}><option value="PAYABLE">{language === 'te' ? 'చెల్లింపు' : 'Payable'}</option><option value="RECEIVABLE">{language === 'te' ? 'రాబడి' : 'Receivable'}</option></select></label><label className="field-label">{language === 'te' ? 'చెల్లింపు విధానం' : 'Payment mode'}<select className="field-input" value={paymentMode} onChange={(event) => setPaymentMode(event.target.value)}><option value="CASH">{language === 'te' ? 'నగదు' : 'Cash'}</option><option value="BANK">{language === 'te' ? 'బ్యాంక్' : 'Bank'}</option><option value="UPI">UPI</option><option value="CHEQUE">{language === 'te' ? 'చెక్కు' : 'Cheque'}</option></select></label></>}<ActionButton type="submit">{language === 'te' ? 'సేవ్ చేయండి' : 'Save'}</ActionButton>{message && <p className="text-primary">{message}</p>}</form>;
  if (screen === 'expense') return <ExpenseAction parties={parties} language={language} message={message} setMessage={setMessage} />;
  if (screen === 'scrap') return <ScrapAction parties={parties} language={language} message={message} setMessage={setMessage} />;
  if (screen === 'allocation' || screen === 'idle-cost') return <form onSubmit={submit} className="grid gap-4"><h2 className="section-title">{language === 'te' ? 'సర్వర్ కేటాయింపు పని' : 'Server allocation working'}</h2>{screen === 'idle-cost' && <label className="field-label">{language === 'te' ? 'చెరువు' : 'Pond'}<select className="field-input" value={partyId} onChange={(event) => setPartyId(event.target.value)} required><option value="">{language === 'te' ? 'చెరువును ఎంచుకోండి' : 'Select pond'}</option>{ponds.map((pond) => <option key={pond.id} value={pond.id}>{pond.name}</option>)}</select></label>}<Field label={language === 'te' ? 'ప్రారంభ తేదీ' : 'From date'} type="date" value={fromDate} onChange={setFromDate} required /><Field label={language === 'te' ? 'ముగింపు తేదీ' : 'To date'} type="date" value={toDate} onChange={setToDate} required /><ActionButton type="submit">{language === 'te' ? 'సర్వర్‌లో అమలు చేయండి' : 'Run on server'}</ActionButton>{message && <p className="text-primary">{message}</p>}</form>;
  if (screen === 'ledger' || screen === 'credit') return <div className="grid gap-3"><label className="field-label">{language === 'te' ? 'పార్టీ' : 'Party'}<select className="field-input" value={partyId} onChange={(event) => setPartyId(event.target.value)}><option value="">{language === 'te' ? 'పార్టీని ఎంచుకోండి' : 'Select party'}</option>{parties.map((party) => <option key={party.id} value={party.id}>{party.name}</option>)}</select></label>{partyId && <ActionButton href={`/money/${screen}?partyId=${partyId}`}>{language === 'te' ? 'చూడండి' : 'View'}</ActionButton>}<p className="muted text-sm">{language === 'te' ? 'సర్వర్ వివరాలను లోడ్ చేయడానికి పార్టీని ఎంచుకోండి.' : 'Choose a party to load its server-backed details.'}</p></div>;
  return <div className="grid gap-3"><p className="muted">{language === 'te' ? 'ఈ పని సర్వర్ చర్యను కోరుతుంది; బ్రౌజర్‌లో లెక్కించబడదు.' : 'This register is not available yet.'}</p></div>;
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
  const [billPhoto, setBillPhoto] = useState<File | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const created = await apiRequest<{ id: string }>('/finance/expenses', { method: 'POST', body: JSON.stringify({
        expenseDate: date, costHeadId, allocationTarget, pondId: allocationTarget === 'POND_CROP' ? pondId : undefined,
        cropId: allocationTarget === 'POND_CROP' ? cropId : undefined, partyId: partyId || undefined,
        amountPaise: rupeesToPaise(amount), paymentStatus,
      }) });
      if (billPhoto) {
        const presign = await apiRequest<{ attachmentId: string; uploadUrl: string }>('/attachments/presign', { method: 'POST', body: JSON.stringify({ ownerType: 'EXPENSE', ownerId: created.id, fileName: billPhoto.name, contentType: billPhoto.type, sizeBytes: billPhoto.size }) });
        const upload = await fetch(presign.uploadUrl, { method: 'PUT', headers: { 'content-type': billPhoto.type }, body: billPhoto });
        if (!upload.ok) throw new Error(language === 'te' ? 'బిల్లు ఫోటో అప్‌లోడ్ కాలేదు.' : 'Bill photo upload failed.');
        await apiRequest('/attachments/confirm', { method: 'POST', body: JSON.stringify({ attachmentId: presign.attachmentId }) });
      }
      setMessage(language === 'te' ? 'ఖర్చు సేవ్ అయింది.' : 'Expense saved.');
    } catch (error) { setMessage(error instanceof Error ? error.message : language === 'te' ? 'ఖర్చు సేవ్ కాలేదు.' : 'Unable to save expense.'); }
  }
  return <form onSubmit={submit} className="grid gap-4"><h2 className="section-title">{language === 'te' ? 'ఖర్చు వివరాలు' : 'Expense details'}</h2>
    <Field label={language === 'te' ? 'ఖర్చు తేదీ' : 'Expense date'} type="date" value={date} onChange={setDate} required />
    <label className="field-label">{language === 'te' ? 'ఖర్చు తల' : 'Cost head'}<select className="field-input" value={costHeadId} onChange={(event) => setCostHeadId(event.target.value)} required><option value="">Select cost head</option>{(heads.data ?? []).map((head) => <option key={head.id} value={head.id}>{head.name}</option>)}</select></label>
    <label className="field-label">{language === 'te' ? 'ఈ ఖర్చు ఎక్కడికి' : 'Where this goes'}<select className="field-input" value={allocationTarget} onChange={(event) => setAllocationTarget(event.target.value)}><option value="POND_CROP">Pond / crop</option><option value="COMMON">Common farm cost</option></select></label>
    {allocationTarget === 'POND_CROP' && <><label className="field-label">{language === 'te' ? 'చెరువు' : 'Pond'}<select className="field-input" value={pondId} onChange={(event) => { setPondId(event.target.value); setCropId(ponds.data?.find((pond) => pond.id === event.target.value)?.activeCrop?.id ?? ''); }} required><option value="">Select pond</option>{(ponds.data ?? []).map((pond) => <option key={pond.id} value={pond.id}>{pond.name}</option>)}</select></label><label className="field-label">{language === 'te' ? 'పంట' : 'Crop'}<select className="field-input" value={cropId} onChange={(event) => setCropId(event.target.value)} required><option value="">Select crop</option>{ponds.data?.find((pond) => pond.id === pondId)?.activeCrop && <option value={ponds.data.find((pond) => pond.id === pondId)!.activeCrop!.id}>{ponds.data.find((pond) => pond.id === pondId)!.activeCrop!.code}</option>}</select></label></>}
    <label className="field-label">{language === 'te' ? 'పార్టీ' : 'Party'}<select className="field-input" value={partyId} onChange={(event) => setPartyId(event.target.value)}><option value="">No party</option>{parties.map((party) => <option key={party.id} value={party.id}>{party.name}</option>)}</select></label>
    <Field label={language === 'te' ? 'మొత్తం (రూపాయలు)' : 'Amount (₹)'} value={amount} onChange={setAmount} required />
    <label className="field-label">{language === 'te' ? 'చెల్లింపు స్థితి' : 'Payment status'}<select className="field-input" value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)}><option value="UNPAID">Unpaid</option><option value="PAID">Paid</option><option value="PART_PAID">Part paid</option></select></label>
    <label className="field-label">{language === 'te' ? 'బిల్లు ఫోటో' : 'Bill photo'}<input className="field-input" type="file" accept="image/*" capture="environment" onChange={(event) => setBillPhoto(event.target.files?.[0] ?? null)} /></label>
    <ActionButton type="submit">{language === 'te' ? 'ఖర్చు సేవ్ చేయండి' : 'Save expense'}</ActionButton>{message && <p className="text-primary">{message}</p>}
  </form>;
}

function ScrapAction({ parties, language, message, setMessage }: { parties: Array<{ id: string; name: string }>; language: 'en' | 'te'; message: string; setMessage: (value: string) => void }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [item, setItem] = useState('');
  const [quantity, setQuantity] = useState('');
  const [rate, setRate] = useState('');
  const [buyerPartyId, setBuyerPartyId] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await apiRequest('/finance/scrap-sales', { method: 'POST', body: JSON.stringify({ saleDate: date, item, quantity: Number(quantity), ratePaise: rupeesToPaise(rate), buyerPartyId: buyerPartyId || undefined }) });
      setMessage(language === 'te' ? 'స్క్రాప్ అమ్మకం సేవ్ అయింది.' : 'Scrap sale saved.');
    } catch { setMessage(language === 'te' ? 'స్క్రాప్ అమ్మకం సేవ్ కాలేదు.' : 'Unable to save scrap sale.'); }
  }
  return <form onSubmit={submit} className="mt-5 grid gap-3"><h2 className="section-title">{language === 'te' ? 'కొత్త స్క్రాప్ అమ్మకం' : 'New scrap sale'}</h2><Field label={language === 'te' ? 'అమ్మిన తేదీ' : 'Sale date'} type="date" value={date} onChange={setDate} required /><Field label={language === 'te' ? 'వస్తువు' : 'Item'} value={item} onChange={setItem} required /><Field label={language === 'te' ? 'పరిమాణం' : 'Quantity'} value={quantity} onChange={setQuantity} required /><Field label={language === 'te' ? 'రేటు (₹)' : 'Rate (₹)'} value={rate} onChange={setRate} required /><label className="field-label">{language === 'te' ? 'కొనుగోలుదారు' : 'Buyer'}<select className="field-input" value={buyerPartyId} onChange={(event) => setBuyerPartyId(event.target.value)}><option value="">No buyer selected</option>{parties.map((party) => <option key={party.id} value={party.id}>{party.name}</option>)}</select></label><ActionButton type="submit">{language === 'te' ? 'అమ్మకం సేవ్ చేయండి' : 'Save sale'}</ActionButton>{message && <p className="text-primary">{message}</p>}</form>;
}

function ScreenRows({ screen, value, parties, ponds, language, runId }: { screen: Screen; value: unknown; parties: Array<{ id: string; name: string; type?: string[]; mobile?: string; openingBalancePaise?: string }>; ponds: Array<{ id: string; name: string; activeCrop?: { id: string; code: string } | null }>; language: 'en' | 'te'; runId: string | null }) {
  if (screen === 'scrap' && Array.isArray(value)) return <div className="grid gap-3">{value.length ? value.map((item) => { const row = item as Record<string, unknown>; const buyer = parties.find((party) => party.id === row.buyerPartyId); return <Card className="card-pad" key={String(row.id)}><div className="flex items-start justify-between gap-3"><div><p className="font-extrabold">{String(row.item ?? 'Scrap sale')}</p><p className="muted mt-1">{formatDate(row.saleDate)} · {buyer?.name ?? (language === 'te' ? 'కొనుగోలుదారు లేదు' : 'No buyer')}</p></div><div className="text-right"><p className="font-extrabold">{paise(row.amountPaise)}</p><p className="muted text-sm">{formatQuantity(row.quantity)} × {paise(row.ratePaise)}</p></div></div></Card>; }) : <EmptyState title={language === 'te' ? 'స్క్రాప్ అమ్మకాలు లేవు' : 'No scrap sales yet'} body={language === 'te' ? 'మొదటి స్క్రాప్ అమ్మకాన్ని నమోదు చేయండి.' : 'Record the first scrap sale from this form.'} />}</div>;
  if (screen === 'allocation' && Array.isArray(value) && !runId) return <div className="grid gap-3">{value.length ? value.map((item) => { const row = item as Record<string, unknown>; return <Link href={`/money/allocation?runId=${String(row.id)}`} key={String(row.id)}><Card className="card-pad tap"><div className="flex items-center justify-between gap-3"><div><p className="font-extrabold">{friendlyStatus(row.trigger, language)} · {friendlyStatus(row.status, language)}</p><p className="muted mt-1">{formatDate(row.periodStart)} – {formatDate(row.periodEnd)}</p></div><span className="chip">{paise(row.allocatedTotalPaise)}</span></div></Card></Link>; }) : <EmptyState title={language === 'te' ? 'కేటాయింపు రన్‌లు లేవు' : 'No allocation runs yet'} body={language === 'te' ? 'కేటాయింపు పని అమలు చేసిన తర్వాత ఇది ఇక్కడ కనిపిస్తుంది.' : 'Run allocation working to see its history here.'} />}</div>;
  if (screen === 'allocation' && Array.isArray(value) && runId) return <div className="grid gap-3">{value.length ? <><Card className="card-pad"><p className="section-title">{language === 'te' ? 'కేటాయింపు మొత్తం' : 'Allocated total'}</p><p className="stat-value">{paise(value.reduce((sum, item) => sum + Number((item as Record<string, unknown>).amountPaise ?? 0), 0))}</p></Card>{value.map((item) => { const row = item as Record<string, unknown>; const zeroDays = Number(row.days ?? 0) === 0; return <Card className="card-pad" key={String(row.id)}><div className="flex items-start justify-between gap-3"><div><p className="font-extrabold">{friendlyStatus(row.kind, language)} · {String(row.pondName ?? 'Pond')} · {String(row.cropCode ?? 'Crop')}</p><p className="muted mt-1">{zeroDays ? (language === 'te' ? 'ఈ కాలంలో ఆక్యుపెన్సీ లేదు' : 'No occupancy in this period') : `${formatDate(row.fromDate)} – ${formatDate(row.toDate)} · ${String(row.days ?? 0)} ${language === 'te' ? 'రోజులు' : 'days'}`}</p></div><p className="text-lg font-extrabold">{paise(row.amountPaise)}</p></div><Disclosure label={language === 'te' ? 'లెక్క చూపండి' : 'Show the working'}><p className="muted mt-3 text-sm">{working(row, language)}</p></Disclosure></Card>; })}</> : <EmptyState title={language === 'te' ? 'కేటాయింపు వివరాలు లేవు' : 'No allocation details'} body={language === 'te' ? 'ఈ రన్‌కు పని వివరాలు లేవు.' : 'This run has no derivation details.'} />}</div>;
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

function working(row: Record<string, unknown>, language: 'en' | 'te'): string {
  const derivation = row.derivation && typeof row.derivation === 'object' ? row.derivation as Record<string, unknown> : {};
  const detail = derivation.derivation && typeof derivation.derivation === 'object' ? derivation.derivation as Record<string, unknown> : {};
  const formula = typeof derivation.formula === 'string' ? derivation.formula : '';
  const inputs = detail.inputs && typeof detail.inputs === 'object' ? detail.inputs as Record<string, unknown> : {};
  const annual = inputs.annual;
  const acres = inputs.acres;
  const occupancy = inputs.occupancy ?? inputs.activeDays ?? row.days;
  if (row.kind === 'LEASE' && annual !== undefined && acres !== undefined && occupancy !== undefined) {
    const text = `${formatPaise(annual)} × ${Number(acres) / 10000} acres ÷ 365 × ${occupancy} days`;
    return language === 'te' ? `పని: ${text}` : `Working: ${text}`;
  }
  if (row.kind === 'COMMON' && inputs.commonCostPaise !== undefined && inputs.basisValue !== undefined && inputs.totalBasisValue !== undefined) {
    const basis = Number(inputs.basisValue) / 10000;
    const total = Number(inputs.totalBasisValue) / 10000;
    const activeDays = Number(inputs.activeDays ?? row.days ?? 0);
    const periodDays = Number(inputs.daysInPeriod ?? 0);
    const text = `${formatPaise(inputs.commonCostPaise)} × ${basis} acres ÷ ${total} acres${activeDays === periodDays ? '' : ` × ${activeDays} ÷ ${periodDays}`}`;
    return language === 'te' ? `పని: ${text}` : `Working: ${text}`;
  }
  if (row.kind === 'DEPRECIATION' && inputs.asset && typeof inputs.asset === 'object') {
    const asset = inputs.asset as Record<string, unknown>;
    const text = `${formatPaise(asset.costPaise)} − salvage ÷ ${asset.usefulLifeYears} years ÷ 365 × ${occupancy} days`;
    return language === 'te' ? `పని: ${text}` : `Working: ${text}`;
  }
  return language === 'te' ? `పని: ${formula || 'సర్వర్ లెక్కింపు'}` : `Working: ${formula || 'Server calculation'}`;
}

function Readable({ value, field = '', language = 'en' }: { value: unknown; field?: string; language?: 'en' | 'te' }) {
  if (Array.isArray(value)) return value.length === 0 ? <EmptyState title={language === 'te' ? 'రికార్డులు లేవు' : 'No records yet'} body={language === 'te' ? 'సర్వర్‌లో ఈ జాబితాకు ఇంకా రికార్డులు లేవు.' : 'There are no records in this server-backed list yet.'} /> : <div className="grid gap-3">{value.map((item, index) => <Card className="card-pad" key={String((item as Record<string, unknown>)?.id ?? index)}><Readable value={item} language={language} /></Card>)}</div>;
  if (value && typeof value === 'object') return <div className="grid gap-4 sm:grid-cols-2">{Object.entries(value as Record<string, unknown>).filter(([key]) => !isInternalKey(key)).map(([key, item]) => <section key={key} className="min-w-0">{typeof item === 'object' ? <Disclosure label={farmerLabel(key)}><Readable value={item} field={key} language={language} /></Disclosure> : <StatCard label={farmerLabel(key)} value={displayValue(item, key)} />}</section>)}</div>;
  return <p className="stat-value">{displayValue(value, field)}</p>;
}

function farmerLabel(key: string): string {
  const clean = key.replace(/Paise$/i, '');
  const known: Record<string, string> = {
    view: 'Summary',
    expenses: 'Expenses',
    payments: 'Payments',
    basis: 'Price by',
    target: 'Used for',
    allocation: 'Shared costs',
    apportioned: 'Shared cost',
    classification: 'Type',
    void: 'Removed',
  };
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
  if (text === 'Void') return language === 'te' ? 'తొలగించారు' : 'Removed';
  if (language === 'te') return text === 'Paid' ? 'చెల్లించారు' : text === 'Unpaid' ? 'చెల్లించలేదు' : text;
  return text;
}

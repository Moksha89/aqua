'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet, apiRequest, getSession } from '../../src/lib/api';
import type { components } from '../../src/lib/api.generated';
import { useI18n } from '../../src/lib/i18n';
import { ActionButton, Card, ChoiceToggle, Disclosure, FormSection, PageHeader, SelectField, StatCard } from '../../src/components/design-system';
import { formatPaise } from '../../src/lib/money';
import { saveExpenseEntry, savePaymentEntry } from '../../src/lib/entry-actions';

type Pond = components['schemas']['PondListItemDto'];
type CostHead = components['schemas']['CostHeadListDto'];
type Party = components['schemas']['PartyListDto'];
type Expense = components['schemas']['ExpenseDto'];
type Payment = components['schemas']['PaymentDto'];
type Pnl = components['schemas']['BusinessPnlReportDto'];
type Payable = components['schemas']['PayableDto'];
type Receivable = components['schemas']['ReceivableDto'];
type Ledger = components['schemas']['PartyLedgerResponseDto'];
type Headroom = components['schemas']['SupplierHeadroomDto'];
const moneyScreens: Array<[string, [string, string], string]> = [
  ['expense', ['Expense entry', 'ఖర్చు నమోదు'], 'ph-receipt'],
  ['parties', ['Parties', 'పార్టీలు'], 'ph-users-three'],
  ['new-party', ['New party', 'కొత్త పార్టీ'], 'ph-user-plus'],
  ['ledger', ['Party ledger', 'పార్టీ లెడ్జర్'], 'ph-notebook'],
  ['credit', ['Supplier credit', 'సరఫరాదారు క్రెడిట్'], 'ph-credit-card'],
  ['payment', ['Payment', 'చెల్లింపు'], 'ph-money'],
  ['payables', ['Payables', 'చెల్లించాల్సినవి'], 'ph-arrow-up'],
  ['receivables', ['Receivables', 'రావాల్సినవి'], 'ph-arrow-down'],
  ['cash', ['Cash requirement', 'నగదు అవసరం'], 'ph-wallet'],
  ['allocation', ['Shared costs', 'పంచిన ఖర్చులు'], 'ph-git-branch'],
  ['idle-cost', ['Idle pond cost', 'ఖాళీ చెరువు ఖర్చు'], 'ph-pause-circle'],
  ['lease', ['Lease register', 'లీజ్ రిజిస్టర్'], 'ph-file-text'],
  ['assets', ['Assets and disposal', 'ఆస్తులు మరియు విక్రయం'], 'ph-buildings'],
  ['scrap', ['Scrap sales', 'స్క్రాప్ అమ్మకాలు'], 'ph-recycle'],
];

export default function MoneyPage() {
  const { t, language } = useI18n();
  const session = getSession();
  const financial = session?.financialAccess === true;
  const [message, setMessage] = useState('');
  const [billPhoto, setBillPhoto] = useState<File | null>(null);
  const [selectedParty, setSelectedParty] = useState('');
  const [expenseDetailsOpen, setExpenseDetailsOpen] = useState(false);
  const [paymentDetailsOpen, setPaymentDetailsOpen] = useState(false);
  const [expense, setExpense] = useState<Expense>({ expenseDate: new Date().toISOString().slice(0, 10), costHeadId: '', allocationTarget: 'POND_CROP', amountPaise: '', paymentStatus: 'PAID' });
  const [payment, setPayment] = useState<Payment>({ partyId: '', paidOn: new Date().toISOString().slice(0, 10), direction: 'PAYABLE', amountPaise: '', mode: 'CASH' });
  const ponds = useQuery({ queryKey: ['ponds'], queryFn: () => apiGet<Pond[]>('/masters/ponds'), enabled: financial });
  const costHeads = useQuery({ queryKey: ['cost-heads'], queryFn: () => apiGet<CostHead[]>('/masters/cost-heads'), enabled: financial });
  const parties = useQuery({ queryKey: ['parties'], queryFn: () => apiGet<Party[]>('/masters/parties'), enabled: financial });
  const pnl = useQuery({ queryKey: ['business-pnl'], queryFn: () => apiGet<Pnl>('/finance/reports/business-pnl'), enabled: financial });
  const payables = useQuery({ queryKey: ['payables'], queryFn: () => apiGet<Payable[]>('/finance/payables'), enabled: financial });
  const receivables = useQuery({ queryKey: ['receivables'], queryFn: () => apiGet<Receivable[]>('/finance/receivables'), enabled: financial });
  const ledger = useQuery({ queryKey: ['ledger', selectedParty], queryFn: () => apiGet<Ledger>(`/finance/parties/${selectedParty}/ledger`), enabled: financial && Boolean(selectedParty) });
  const headroom = useQuery({ queryKey: ['headroom', selectedParty], queryFn: () => apiGet<Headroom>(`/finance/suppliers/${selectedParty}/headroom`), enabled: financial && Boolean(selectedParty) });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const lastCostHead = window.localStorage.getItem('aqua_last_cost_head');
    const lastPaymentMode = window.localStorage.getItem('aqua_last_payment_mode');
    if (lastCostHead) setExpense((value) => value.costHeadId ? value : { ...value, costHeadId: lastCostHead });
    if (lastPaymentMode) setPayment((value) => ({ ...value, mode: lastPaymentMode }));
  }, []);
  useEffect(() => {
    const live = (ponds.data ?? []).filter((pond) => pond.activeCrop);
    if (live.length === 1 && !expense.pondId) {
      setExpense((value) => ({ ...value, pondId: live[0].id, cropId: live[0].activeCrop?.id }));
    }
  }, [ponds.data, expense.pondId]);
  useEffect(() => {
    if (!expense.costHeadId && costHeads.data?.length === 1) setExpense((value) => ({ ...value, costHeadId: costHeads.data![0].id }));
  }, [costHeads.data, expense.costHeadId]);

  async function saveExpense(event: FormEvent) {
    event.preventDefault();
    if (!expense.costHeadId || (expense.allocationTarget === 'POND_CROP' && (!expense.pondId || !expense.cropId))) {
      setExpenseDetailsOpen(true);
      setMessage(t.completeDetails);
      window.setTimeout(() => document.getElementById(!expense.costHeadId ? 'expense-cost-head' : 'expense-pond')?.focus(), 0);
      return;
    }
    try {
      const created = await saveExpenseEntry<{ id: string }>(expense);
      if (billPhoto) {
        const presign = await apiRequest<{ attachmentId: string; uploadUrl: string }>('/attachments/presign', { method: 'POST', body: JSON.stringify({ ownerType: 'EXPENSE', ownerId: created.id, fileName: billPhoto.name, contentType: billPhoto.type, sizeBytes: billPhoto.size }) });
        const upload = await fetch(presign.uploadUrl, { method: 'PUT', headers: { 'content-type': billPhoto.type }, body: billPhoto });
        if (!upload.ok) throw new Error(t.attachmentUploadFailed);
        await apiRequest('/attachments/confirm', { method: 'POST', body: JSON.stringify({ attachmentId: presign.attachmentId }) });
      }
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('aqua_last_cost_head', expense.costHeadId);
      }
      setMessage(t.savedExpense);
    }
    catch (error) { setMessage(error instanceof Error ? error.message : t.saveExpense); }
  }
  async function savePayment(event: FormEvent) {
    event.preventDefault();
    if (!payment.partyId) {
      setPaymentDetailsOpen(true);
      setMessage(t.chooseParty);
      window.setTimeout(() => document.getElementById('payment-party')?.focus(), 0);
      return;
    }
    try { await savePaymentEntry(payment); if (typeof window !== 'undefined') window.localStorage.setItem('aqua_last_payment_mode', payment.mode); setMessage(t.savedPayment); }
    catch (error) { setMessage(error instanceof Error ? error.message : t.savePayment); }
  }

  if (!financial) return <section className="rise"><PageHeader eyebrow={t.money} title={t.money} subtitle={t.financialUnavailable} /><Card className="card-pad"><p className="muted">{t.financialUnavailable}</p></Card></section>;
  return <section className="rise">
    <PageHeader eyebrow={t.money} title={t.moneyAtGlance} subtitle={t.moneyHint} />
    {pnl.data && <div className="grid grid-cols-3 gap-2"><StatCard label={t.revenue} value={formatPaise(pnl.data.revenuePaise)} /><StatCard label={t.cost} value={formatPaise(pnl.data.costPaise)} tone="warning" /><StatCard label={t.netProfit} value={formatPaise(pnl.data.netProfitPaise)} tone="success" /></div>}
    <div className="mt-5 grid grid-cols-2 gap-3"><Link href="#expense" className="pond-tile tap flex min-h-24 items-center gap-3"><i className="ph-duotone ph-receipt text-2xl text-primary" /><span className="text-sm font-extrabold">{t.recordSpending}</span></Link><Link href="#payment" className="pond-tile tap flex min-h-24 items-center gap-3"><i className="ph-duotone ph-money text-2xl text-primary" /><span className="text-sm font-extrabold">{t.recordPayment}</span></Link><Link href="/money/payables" className="pond-tile tap flex min-h-24 items-center gap-3"><i className="ph-duotone ph-arrow-up text-2xl text-primary" /><span className="text-sm font-extrabold">{t.payables}</span></Link><Link href="/money/receivables" className="pond-tile tap flex min-h-24 items-center gap-3"><i className="ph-duotone ph-arrow-down text-2xl text-primary" /><span className="text-sm font-extrabold">{t.receivables}</span></Link></div>
    <Disclosure label={t.moreMoneyTools}><div className="grid grid-cols-2 gap-3">{moneyScreens.filter(([slug]) => !['expense', 'payment', 'payables', 'receivables'].includes(slug)).map(([slug, label, icon]) => <Link key={slug} href={`/money/${slug}`} className="pond-tile tap flex items-center gap-3"><i className={`ph-duotone ${icon} shrink-0 text-2xl text-primary`} /><span className="min-w-0 flex-1 text-sm font-extrabold">{language === 'te' ? label[1] : label[0]}</span><i className="ph-duotone ph-caret-right shrink-0 text-textSecondary" /></Link>)}</div></Disclosure>
    <Disclosure label={t.moreDetails} summary={t.moneyHint}><div className="mt-5 grid grid-cols-2 gap-3"><Link href="/harvest/events" className="pond-tile tap"><i className="ph-duotone ph-fish text-2xl text-primary" /><span className="mt-2 block text-sm font-extrabold">{t.harvestEvents}</span></Link><Link href="/harvest/market-rates" className="pond-tile tap"><i className="ph-duotone ph-chart-line-up text-2xl text-primary" /><span className="mt-2 block text-sm font-extrabold">{t.marketRates}</span></Link><Link href="/closure" className="pond-tile tap"><i className="ph-duotone ph-check-circle text-2xl text-primary" /><span className="mt-2 block text-sm font-extrabold">{t.closeCrop}</span></Link><Link href="/closed-crops" className="pond-tile tap"><i className="ph-duotone ph-archive text-2xl text-primary" /><span className="mt-2 block text-sm font-extrabold">{t.closedCrops}</span></Link></div></Disclosure>
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      <form id="expense" onSubmit={saveExpense} className="rounded-xl border border-border bg-surface p-5"><h2 className="text-xl font-semibold">{t.recordSpending}</h2><FormSection title={t.whatYouSpent}><Field label={t.amountRupees} value={expense.amountPaise} onChange={(value) => setExpense({ ...expense, amountPaise: value })} required /></FormSection><Disclosure label={t.moreDetails} open={expenseDetailsOpen} onOpenChange={setExpenseDetailsOpen} summary={expenseSummary(expense, ponds.data ?? [], costHeads.data ?? [], t)}><div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label={t.expenseDate} type="date" value={expense.expenseDate} onChange={(value) => setExpense({ ...expense, expenseDate: value })} />
        <label className="text-sm text-textSecondary">{t.costHead}<select id="expense-cost-head" required value={expense.costHeadId} onChange={(event) => setExpense({ ...expense, costHeadId: event.target.value })} className="mt-1 w-full rounded-lg border border-border bg-background p-3 text-textPrimary"><option value="">—</option>{(costHeads.data ?? []).map((head) => <option key={head.id} value={head.id}>{head.name}</option>)}</select></label>
        <label className="text-sm text-textSecondary">{t.allocation}<select value={expense.allocationTarget} onChange={(event) => setExpense({ ...expense, allocationTarget: event.target.value as Expense['allocationTarget'] })} className="mt-1 w-full rounded-lg border border-border bg-background p-3 text-textPrimary"><option value="POND_CROP">{t.pond}</option><option value="COMMON">{t.common}</option></select></label>
        {expense.allocationTarget === 'POND_CROP' && <><label className="text-sm text-textSecondary">{t.pond}<select id="expense-pond" required value={expense.pondId ?? ''} onChange={(event) => { const pond = (ponds.data ?? []).find((item) => item.id === event.target.value); setExpense({ ...expense, pondId: event.target.value, cropId: pond?.activeCrop?.id }); }} className="mt-1 w-full rounded-lg border border-border bg-background p-3 text-textPrimary"><option value="">—</option>{(ponds.data ?? []).map((pond) => <option key={pond.id} value={pond.id}>{pond.name}</option>)}</select></label><label className="text-sm text-textSecondary">{t.crop}<select required value={expense.cropId ?? ''} onChange={(event) => setExpense({ ...expense, cropId: event.target.value })} className="mt-1 w-full rounded-lg border border-border bg-background p-3 text-textPrimary"><option value="">—</option>{(ponds.data ?? []).filter((pond) => pond.id === expense.pondId && pond.activeCrop).map((pond) => <option key={pond.activeCrop!.id} value={pond.activeCrop!.id}>{pond.activeCrop!.code}</option>)}</select></label></>}
        <ChoiceToggle label={t.paymentStatus} value={expense.paymentStatus ?? 'PAID'} onChange={(value) => setExpense({ ...expense, paymentStatus: value })} options={[{ value: 'PAID', label: t.paid }, { value: 'UNPAID', label: t.unpaid }, { value: 'PART_PAID', label: t.partPaid }]} />
        <label className="text-sm text-textSecondary">{t.party}<select value={expense.partyId ?? ''} onChange={(event) => setExpense({ ...expense, partyId: event.target.value || undefined })} className="mt-1 w-full rounded-lg border border-border bg-background p-3 text-textPrimary"><option value="">—</option>{(parties.data ?? []).map((party) => <option key={party.id} value={party.id}>{party.name}</option>)}</select></label><label className="text-sm text-textSecondary">{t.billPhoto}<input accept="image/*" type="file" capture="environment" onChange={(event) => setBillPhoto(event.target.files?.[0] ?? null)} className="mt-1 block w-full text-textPrimary" /></label>
      </div></Disclosure><button className="mt-5 rounded-lg bg-primary px-4 py-2 text-onPrimary" type="submit">{t.saveExpense}</button></form>
      <form id="payment" onSubmit={savePayment} className="rounded-xl border border-border bg-surface p-5"><h2 className="text-xl font-semibold">{t.recordPayment}</h2><FormSection title={t.whatYouPaid}><Field label={t.amountRupees} value={payment.amountPaise} onChange={(value) => setPayment({ ...payment, amountPaise: value })} required /></FormSection><Disclosure label={t.paymentDetails} open={paymentDetailsOpen} onOpenChange={setPaymentDetailsOpen} summary={paymentSummary(payment, parties.data ?? [], t)}><div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-textSecondary">{t.party}<select id="payment-party" required value={payment.partyId} onChange={(event) => setPayment({ ...payment, partyId: event.target.value })} className="mt-1 w-full rounded-lg border border-border bg-background p-3 text-textPrimary"><option value="">—</option>{(parties.data ?? []).map((party) => <option key={party.id} value={party.id}>{party.name}</option>)}</select></label>
        <Field label={t.paidOn} type="date" value={payment.paidOn} onChange={(value) => setPayment({ ...payment, paidOn: value })} /><ChoiceToggle label={t.direction} value={payment.direction} onChange={(value) => setPayment({ ...payment, direction: value })} options={[{ value: 'PAYABLE', label: t.payable }, { value: 'RECEIVABLE', label: t.receivable }]} /><ChoiceToggle label={t.mode} value={payment.mode} onChange={(value) => setPayment({ ...payment, mode: value })} options={[{ value: 'CASH', label: t.cash }, { value: 'BANK', label: t.bank }, { value: 'OTHER', label: t.other }]} />
      </div></Disclosure><button className="mt-5 rounded-lg bg-primary px-4 py-2 text-onPrimary" type="submit">{t.savePayment}</button></form>
    </div>
    {message && <p className="mt-4 rounded-lg bg-info/10 p-3 text-info">{message}</p>}
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      <article className="rounded-xl border border-border bg-surface p-5"><h2 className="text-xl font-semibold">{t.payables}</h2>{payables.isLoading && <p className="mt-3 text-textSecondary">{t.loading}</p>}{payables.isError && <p className="mt-3 text-warning">{t.reportLoad}</p>}{(payables.data ?? []).map((row) => <div key={row.id} className="mt-3 flex justify-between border-b border-border pb-2 text-sm"><span>{row.expenseDate.slice(0, 10)}</span><span>{formatPaise(row.amountPaise)}</span></div>)}{payables.data?.length === 0 && <p className="mt-3 text-textSecondary">{t.noData}</p>}</article>
      <article className="rounded-xl border border-border bg-surface p-5"><h2 className="text-xl font-semibold">{t.receivables}</h2>{receivables.isLoading && <p className="mt-3 text-textSecondary">{t.loading}</p>}{receivables.isError && <p className="mt-3 text-warning">{t.reportLoad}</p>}{(receivables.data ?? []).map((row) => <div key={row.id} className="mt-3 flex justify-between border-b border-border pb-2 text-sm"><span>{row.dueDate?.slice(0, 10) ?? row.harvestDate.slice(0, 10)}</span><span>{formatPaise(row.receivablePaise)}</span></div>)}{receivables.data?.length === 0 && <p className="mt-3 text-textSecondary">{t.noData}</p>}</article>
    </div>
    <article className="mt-8 rounded-xl border border-border bg-surface p-5"><h2 className="text-xl font-semibold">{t.partyLedger}</h2><label className="mt-3 block max-w-md text-sm text-textSecondary">{t.party}<select value={selectedParty} onChange={(event) => setSelectedParty(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background p-3 text-textPrimary"><option value="">—</option>{(parties.data ?? []).map((party) => <option key={party.id} value={party.id}>{party.name}</option>)}</select></label>{ledger.isLoading && <p className="mt-3 text-textSecondary">{t.loading}</p>}{ledger.isError && <p className="mt-3 text-warning">{t.reportLoad}</p>}{ledger.data?.entries.map((entry) => <div key={entry.id} className="mt-3 flex justify-between border-b border-border pb-2 text-sm"><span>{entry.kind} · {entry.date.slice(0, 10)}</span><span>{formatPaise(entry.amountPaise)}</span></div>)}{ledger.data && ledger.data.entries.length === 0 && <p className="mt-3 text-textSecondary">{t.noData}</p>}</article>
    <article className="mt-8 rounded-xl border border-border bg-surface p-5"><h2 className="text-xl font-semibold">{t.creditHeadroom}</h2>{!selectedParty && <p className="mt-3 text-textSecondary">{t.party}</p>}{selectedParty && headroom.isLoading && <p className="mt-3 text-textSecondary">{t.loading}</p>}{selectedParty && headroom.isError && <p className="mt-3 text-warning">{t.reportLoad}</p>}{headroom.data && <div className="mt-4 grid gap-3 sm:grid-cols-3"><Metric label={t.creditLimit} value={headroom.data.limitPaise} /><Metric label={t.creditUsed} value={headroom.data.usedPaise} /><Metric label={t.creditHeadroom} value={headroom.data.headroomPaise} /></div>}</article>
    <div className="mt-8 flex flex-wrap gap-3"><Link href="/reports" className="rounded-lg border border-border px-4 py-2">{t.reports}</Link>{(ponds.data ?? []).filter((pond) => pond.activeCrop).map((pond) => <Link key={pond.id} href={`/harvest?cropId=${pond.activeCrop!.id}`} className="rounded-lg border border-border px-4 py-2">{t.harvestClosure}: {pond.name}</Link>)}</div>
  </section>;
}

function Metric({ label, value }: { label: string; value: string }) { return <article className="rounded-xl border border-border bg-surface p-5"><p className="text-sm text-textSecondary">{label}</p><p className="mt-2 text-2xl font-semibold">{formatPaise(value)}</p></article>; }

function expenseSummary(expense: Expense, ponds: Pond[], costHeads: CostHead[], t: Record<string, string>) {
  const head = costHeads.find((item) => item.id === expense.costHeadId)?.name ?? t.chooseDetails;
  const pond = ponds.find((item) => item.id === expense.pondId);
  return `${head} · ${pond?.name ?? t.choosePond} · ${expense.paymentStatus === 'PAID' ? t.paid : t.unpaid}`;
}

function paymentSummary(payment: Payment, parties: Party[], t: Record<string, string>) {
  const party = parties.find((item) => item.id === payment.partyId)?.name ?? t.chooseParty;
  return `${party} · ${payment.mode === 'CASH' ? t.cash : payment.mode === 'BANK' ? t.bank : t.other}`;
}
function Field({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) { return <label className="text-sm text-textSecondary">{label}<input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background p-3 text-textPrimary" /></label>; }

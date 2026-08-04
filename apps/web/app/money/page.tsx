'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet, apiRequest, getSession } from '../../src/lib/api';
import type { components } from '../../src/lib/api.generated';
import { useI18n } from '../../src/lib/i18n';

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

function formatPaise(value: string): string {
  const negative = value.startsWith('-');
  const digits = negative ? value.slice(1) : value;
  const rupees = digits.length > 2 ? digits.slice(0, -2) : '0';
  const paise = digits.slice(-2).padStart(2, '0');
  const grouped = rupees.length > 3 ? `${rupees.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${rupees.slice(-3)}` : rupees;
  return `${negative ? '-' : ''}₹${grouped}.${paise}`;
}

export default function MoneyPage() {
  const { t } = useI18n();
  const session = getSession();
  const financial = session?.financialAccess === true;
  const [message, setMessage] = useState('');
  const [billPhoto, setBillPhoto] = useState<File | null>(null);
  const [selectedParty, setSelectedParty] = useState('');
  const [expense, setExpense] = useState<Expense>({ expenseDate: new Date().toISOString().slice(0, 10), costHeadId: '', allocationTarget: 'POND_CROP', amountPaise: '', paymentStatus: 'UNPAID' });
  const [payment, setPayment] = useState<Payment>({ partyId: '', paidOn: new Date().toISOString().slice(0, 10), direction: 'PAYABLE', amountPaise: '', mode: 'CASH' });
  const ponds = useQuery({ queryKey: ['ponds'], queryFn: () => apiGet<Pond[]>('/masters/ponds'), enabled: financial });
  const costHeads = useQuery({ queryKey: ['cost-heads'], queryFn: () => apiGet<CostHead[]>('/masters/cost-heads'), enabled: financial });
  const parties = useQuery({ queryKey: ['parties'], queryFn: () => apiGet<Party[]>('/masters/parties'), enabled: financial });
  const pnl = useQuery({ queryKey: ['business-pnl'], queryFn: () => apiGet<Pnl>('/finance/reports/business-pnl'), enabled: financial });
  const payables = useQuery({ queryKey: ['payables'], queryFn: () => apiGet<Payable[]>('/finance/payables'), enabled: financial });
  const receivables = useQuery({ queryKey: ['receivables'], queryFn: () => apiGet<Receivable[]>('/finance/receivables'), enabled: financial });
  const ledger = useQuery({ queryKey: ['ledger', selectedParty], queryFn: () => apiGet<Ledger>(`/finance/parties/${selectedParty}/ledger`), enabled: financial && Boolean(selectedParty) });
  const headroom = useQuery({ queryKey: ['headroom', selectedParty], queryFn: () => apiGet<Headroom>(`/finance/suppliers/${selectedParty}/headroom`), enabled: financial && Boolean(selectedParty) });

  async function saveExpense(event: FormEvent) {
    event.preventDefault();
    try {
      const created = await apiRequest<{ id: string }>('/finance/expenses', { method: 'POST', body: JSON.stringify(expense) });
      if (billPhoto) {
        const presign = await apiRequest<{ attachmentId: string; uploadUrl: string }>('/attachments/presign', { method: 'POST', body: JSON.stringify({ ownerType: 'EXPENSE', ownerId: created.id, fileName: billPhoto.name, contentType: billPhoto.type, sizeBytes: billPhoto.size }) });
        const upload = await fetch(presign.uploadUrl, { method: 'PUT', headers: { 'content-type': billPhoto.type }, body: billPhoto });
        if (!upload.ok) throw new Error(t.attachmentUploadFailed);
        await apiRequest('/attachments/confirm', { method: 'POST', body: JSON.stringify({ attachmentId: presign.attachmentId }) });
      }
      setMessage(t.savedExpense);
    }
    catch (error) { setMessage(error instanceof Error ? error.message : t.saveExpense); }
  }
  async function savePayment(event: FormEvent) {
    event.preventDefault();
    try { await apiRequest('/finance/payments', { method: 'POST', body: JSON.stringify(payment) }); setMessage(t.savedPayment); }
    catch (error) { setMessage(error instanceof Error ? error.message : t.savePayment); }
  }

  if (!financial) return <section><h1 className="text-3xl font-semibold">{t.money}</h1><p className="mt-4 text-textSecondary">{t.financialUnavailable}</p></section>;
  return <section>
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-semibold">{t.money}</h1><p className="mt-2 text-textSecondary">{t.valuesServer}</p></div><Link href="/reports" className="rounded-lg border border-border px-4 py-2 text-textPrimary">{t.reports}</Link></div>
    {pnl.data && <div className="mt-6 grid gap-4 md:grid-cols-3"><Metric label={t.revenue} value={pnl.data.revenuePaise} /><Metric label={t.cost} value={pnl.data.costPaise} /><Metric label={t.netProfit} value={pnl.data.netProfitPaise} /></div>}
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      <form onSubmit={saveExpense} className="rounded-xl border border-border bg-surface p-5"><h2 className="text-xl font-semibold">{t.expense}</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label={t.expenseDate} type="date" value={expense.expenseDate} onChange={(value) => setExpense({ ...expense, expenseDate: value })} />
        <label className="text-sm text-textSecondary">{t.costHead}<select required value={expense.costHeadId} onChange={(event) => setExpense({ ...expense, costHeadId: event.target.value })} className="mt-1 w-full rounded-lg border border-border bg-background p-3 text-textPrimary"><option value="">—</option>{(costHeads.data ?? []).map((head) => <option key={head.id} value={head.id}>{head.code} · {head.name}</option>)}</select></label>
        <label className="text-sm text-textSecondary">{t.allocation}<select value={expense.allocationTarget} onChange={(event) => setExpense({ ...expense, allocationTarget: event.target.value as Expense['allocationTarget'] })} className="mt-1 w-full rounded-lg border border-border bg-background p-3 text-textPrimary"><option value="POND_CROP">{t.pond}</option><option value="COMMON">{t.common}</option></select></label>
        {expense.allocationTarget === 'POND_CROP' && <><label className="text-sm text-textSecondary">{t.pond}<select required value={expense.pondId ?? ''} onChange={(event) => { const pond = (ponds.data ?? []).find((item) => item.id === event.target.value); setExpense({ ...expense, pondId: event.target.value, cropId: pond?.activeCrop?.id }); }} className="mt-1 w-full rounded-lg border border-border bg-background p-3 text-textPrimary"><option value="">—</option>{(ponds.data ?? []).map((pond) => <option key={pond.id} value={pond.id}>{pond.name}</option>)}</select></label><label className="text-sm text-textSecondary">{t.crop}<select required value={expense.cropId ?? ''} onChange={(event) => setExpense({ ...expense, cropId: event.target.value })} className="mt-1 w-full rounded-lg border border-border bg-background p-3 text-textPrimary"><option value="">—</option>{(ponds.data ?? []).filter((pond) => pond.id === expense.pondId && pond.activeCrop).map((pond) => <option key={pond.activeCrop!.id} value={pond.activeCrop!.id}>{pond.activeCrop!.code}</option>)}</select></label></>}
        <Field label={t.amountPaise} value={expense.amountPaise} onChange={(value) => setExpense({ ...expense, amountPaise: value })} required />
        <label className="text-sm text-textSecondary">{t.paymentStatus}<select value={expense.paymentStatus ?? 'UNPAID'} onChange={(event) => setExpense({ ...expense, paymentStatus: event.target.value })} className="mt-1 w-full rounded-lg border border-border bg-background p-3 text-textPrimary"><option value="UNPAID">{t.unpaid}</option><option value="PAID">{t.paid}</option><option value="PART_PAID">{t.partPaid}</option></select></label>
        <label className="text-sm text-textSecondary">{t.party}<select value={expense.partyId ?? ''} onChange={(event) => setExpense({ ...expense, partyId: event.target.value || undefined })} className="mt-1 w-full rounded-lg border border-border bg-background p-3 text-textPrimary"><option value="">—</option>{(parties.data ?? []).map((party) => <option key={party.id} value={party.id}>{party.name}</option>)}</select></label><label className="text-sm text-textSecondary">{t.billPhoto}<input accept="image/*" type="file" capture="environment" onChange={(event) => setBillPhoto(event.target.files?.[0] ?? null)} className="mt-1 block w-full text-textPrimary" /></label>
      </div><button className="mt-5 rounded-lg bg-primary px-4 py-2 text-onPrimary" type="submit">{t.saveExpense}</button></form>
      <form onSubmit={savePayment} className="rounded-xl border border-border bg-surface p-5"><h2 className="text-xl font-semibold">{t.payments}</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-textSecondary">{t.party}<select required value={payment.partyId} onChange={(event) => setPayment({ ...payment, partyId: event.target.value })} className="mt-1 w-full rounded-lg border border-border bg-background p-3 text-textPrimary"><option value="">—</option>{(parties.data ?? []).map((party) => <option key={party.id} value={party.id}>{party.name}</option>)}</select></label>
        <Field label={t.paidOn} type="date" value={payment.paidOn} onChange={(value) => setPayment({ ...payment, paidOn: value })} /><Field label={t.amountPaise} value={payment.amountPaise} onChange={(value) => setPayment({ ...payment, amountPaise: value })} required /><Field label={t.direction} value={payment.direction} onChange={(value) => setPayment({ ...payment, direction: value })} /><Field label={t.mode} value={payment.mode} onChange={(value) => setPayment({ ...payment, mode: value })} />
      </div><button className="mt-5 rounded-lg bg-primary px-4 py-2 text-onPrimary" type="submit">{t.savePayment}</button></form>
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
function Field({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) { return <label className="text-sm text-textSecondary">{label}<input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background p-3 text-textPrimary" /></label>; }

'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../src/lib/api';
import { getSession } from '../../src/lib/api';
function formatPaise(value: string) {
  const negative = value.startsWith('-');
  const digits = negative ? value.slice(1) : value;
  const rupees = digits.length > 2 ? digits.slice(0, -2) : '0';
  const paise = digits.slice(-2).padStart(2, '0');
  const grouped = rupees.length > 3 ? `${rupees.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${rupees.slice(-3)}` : rupees;
  return `${negative ? '-' : ''}₹${grouped}.${paise}`;
}
export default function MoneyPage() {
  const session = getSession();
  const query = useQuery({ queryKey: ['business-pnl'], queryFn: () => apiGet<{ revenuePaise: string; costPaise: string; netProfitPaise: string }>('/finance/reports/business-pnl'), enabled: session?.financialAccess !== false && session?.role !== 'AE_OPERATOR' });
  if (session?.financialAccess === false || (session?.role === 'AE_OPERATOR' && session.financialAccess !== true)) return <section><h1 className="text-3xl font-semibold">Money</h1><p className="mt-4 text-textSecondary">Financial access is not enabled for this role.</p></section>;
  return <section><h1 className="text-3xl font-semibold">Money</h1>{query.isLoading && <p className="mt-4 text-textSecondary">Loading…</p>}{query.error && <p className="mt-4 text-danger">{query.error.message}</p>}{query.data && <div className="mt-6 grid gap-4 md:grid-cols-3">{Object.entries(query.data).map(([key, value]) => <article key={key} className="rounded-xl border border-border bg-surface p-5"><p className="text-sm text-textSecondary">{key}</p><p className="mt-2 text-2xl font-semibold">{formatPaise(String(value))}</p></article>)}</div>}</section>;
}

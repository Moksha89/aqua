import { apiRequest } from './api';
import { rupeesToPaise } from './money';

export function saveFeedEntry<T = unknown>(cropId: string, input: Record<string, unknown>) {
  return apiRequest<T>(`/crops/${cropId}/feed-logs`, { method: 'POST', body: JSON.stringify(input) });
}

export function saveGrowthSample<T = unknown>(cropId: string, input: Record<string, unknown>) {
  return apiRequest<T>(`/crops/${cropId}/growth-samples`, { method: 'POST', body: JSON.stringify(input) });
}

export function saveExpenseEntry<T = unknown>(input: Record<string, unknown> & { amountPaise: string }) {
  return apiRequest<T>('/finance/expenses', { method: 'POST', body: JSON.stringify({ ...input, amountPaise: rupeesToPaise(input.amountPaise) }) });
}

export function savePaymentEntry<T = unknown>(input: Record<string, unknown> & { amountPaise: string }) {
  return apiRequest<T>('/finance/payments', { method: 'POST', body: JSON.stringify({ ...input, amountPaise: rupeesToPaise(input.amountPaise) }) });
}

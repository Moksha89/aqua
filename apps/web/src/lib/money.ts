export function rupeesToPaise(value: string): string {
  const normalized = value.trim().replace(/,/g, '');
  if (!/^-?\d+(?:\.\d{0,2})?$/.test(normalized)) throw new Error('Enter a valid rupee amount with up to two decimal places.');
  const negative = normalized.startsWith('-');
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [whole, fraction = ''] = unsigned.split('.');
  const paise = `${whole}${fraction.padEnd(2, '0')}`.replace(/^0+(?=\d)/, '') || '0';
  return `${negative ? '-' : ''}${paise}`;
}

function unwrapNumeric(value: unknown): number | null {
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if ('value' in record) return unwrapNumeric(record.value);
  if (Array.isArray(record.d) && typeof record.e === 'number' && typeof record.s === 'number') {
    const digits = record.d.join('');
    const decimal = Number(`${record.s < 0 ? '-' : ''}${digits}`);
    if (!Number.isFinite(decimal)) return null;
    return decimal * 10 ** (record.e - digits.length + 1);
  }
  return null;
}

export function formatPaise(value: unknown): string {
  const paise = unwrapNumeric(value);
  if (paise === null) return '—';
  const negative = paise < 0;
  const rupees = Math.abs(paise) / 100;
  return `${negative ? '-' : ''}₹${rupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatQuantity(value: unknown, maximumFractionDigits = 3): string {
  const quantity = unwrapNumeric(value);
  if (quantity === null) return '—';
  return quantity.toLocaleString('en-IN', { maximumFractionDigits });
}

export function rupeesToPaise(value: string): string {
  const normalized = value.trim().replace(/,/g, '');
  if (!/^-?\d+(?:\.\d{0,2})?$/.test(normalized)) throw new Error('Enter a valid rupee amount with up to two decimal places.');
  const negative = normalized.startsWith('-');
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [whole, fraction = ''] = unsigned.split('.');
  const paise = `${whole}${fraction.padEnd(2, '0')}`.replace(/^0+(?=\d)/, '') || '0';
  return `${negative ? '-' : ''}${paise}`;
}

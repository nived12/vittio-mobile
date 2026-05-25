/**
 * Shared formatting helpers for monetary values, dates, and ISO conversions.
 * Default currency is MXN per project rule (CLAUDE.md); locale selects between
 * es-MX and en-US presentation.
 */

export function formatCurrency(
  amount: number,
  locale: string,
  opts?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(locale === 'es' ? 'es-MX' : 'en-US', {
    style: 'currency',
    currency: 'MXN',
    ...opts,
  }).format(amount);
}

export function formatDisplayDate(d: Date | string, locale: string): string {
  const date = typeof d === 'string' ? new Date(`${d}T00:00:00`) : d;
  return new Intl.DateTimeFormat(locale === 'es' ? 'es-MX' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

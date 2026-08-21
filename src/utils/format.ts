/**
 * Shared formatting helpers for monetary values, dates, and ISO conversions.
 * Default currency is MXN per project rule (CLAUDE.md); locale selects between
 * es-MX and en-US presentation.
 */

// Module-scope formatter caches — constructing Intl on Hermes is expensive
// (measured in ms per call on low-end ARM Android).
const numberFmtCache = new Map<string, Intl.NumberFormat>();
const dateFmtCache = new Map<string, Intl.DateTimeFormat>();

function getCurrencyFormatter(
  resolvedLocale: string,
  currency: string,
  opts?: Intl.NumberFormatOptions,
): Intl.NumberFormat {
  const key = `${resolvedLocale}_${currency}_${opts ? JSON.stringify(opts) : ''}`;
  let fmt = numberFmtCache.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat(resolvedLocale, {
      style: 'currency',
      currency,
      ...opts,
    });
    numberFmtCache.set(key, fmt);
  }
  return fmt;
}

export function formatCurrency(
  amount: number,
  locale: string,
  opts?: Intl.NumberFormatOptions,
): string {
  const resolvedLocale = locale === 'es' ? 'es-MX' : 'en-US';
  const { currency: currencyOpt, ...numberOpts } = opts ?? {};
  const currency = currencyOpt ?? 'MXN';
  return getCurrencyFormatter(resolvedLocale, currency, numberOpts).format(amount);
}

/**
 * Build a currency formatter without immediately formatting. Useful when the
 * same instance will be called many times in a render path.
 */
export function currencyFormatter(
  locale: string,
  currency: string,
): Intl.NumberFormat {
  return getCurrencyFormatter(locale === 'es' ? 'es-MX' : locale, currency);
}

export function formatDisplayDate(d: Date | string, locale: string): string {
  const date = typeof d === 'string' ? new Date(`${d}T00:00:00`) : d;
  const resolvedLocale = locale === 'es' ? 'es-MX' : 'en-US';
  let fmt = dateFmtCache.get(resolvedLocale);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(resolvedLocale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    dateFmtCache.set(resolvedLocale, fmt);
  }
  return fmt.format(date);
}

/**
 * Parses a `YYYY-MM-DD` API date as LOCAL midnight.
 *
 * `new Date('2026-08-20')` is parsed as UTC midnight, which in es-MX (UTC-6) is
 * 19 Aug 18:00 local — a date picker seeded that way shows the previous day, and
 * saving it back through toISODate() walks the date one day earlier on every edit.
 */
export function parseISODate(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

/** True when `d` falls on a later calendar day than today, in local time. */
export function isAfterToday(d: Date): boolean {
  return toISODate(d) > toISODate(new Date());
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

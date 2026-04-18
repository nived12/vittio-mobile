import React, { useMemo } from 'react';
import { Text, StyleProp, TextStyle } from 'react-native';
import { useUIStore } from '../../stores/uiStore';

// ── Types ──────────────────────────────────────────────────────────────────

export type AmountSize = 'xl' | 'lg' | 'md' | 'sm';
export type AmountVariant = 'auto' | 'always-sign' | 'no-sign' | 'hero';

interface AmountDisplayProps {
  amount: number;
  currency?: string;
  locale?: string;
  size?: AmountSize;
  variant?: AmountVariant;
  colorize?: boolean;
  showCurrencyCode?: boolean;
  style?: StyleProp<TextStyle>;
}

// ── Style maps ─────────────────────────────────────────────────────────────

const sizeStyles: Record<AmountSize, TextStyle> = {
  xl: { fontSize: 32, fontWeight: '700', lineHeight: 38 },
  lg: { fontSize: 24, fontWeight: '600', lineHeight: 30 },
  md: { fontSize: 17, fontWeight: '600', lineHeight: 22 },
  sm: { fontSize: 15, fontWeight: '500', lineHeight: 20 },
};

const colorMap = {
  positive: '#059669', // emerald-600
  negative: '#e11d48', // rose-600
  zero:     '#94a3b8', // slate-400
  hero:     '#ffffff',
  neutral:  '#0f172a', // slate-900
} as const;

// ── Formatting ─────────────────────────────────────────────────────────────

function formatAmount(
  amount: number,
  currency: string,
  locale: string,
  variant: AmountVariant,
): string {
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs);

  if (variant === 'no-sign') return formatted;
  if (variant === 'always-sign' && amount > 0) return `+${formatted}`;
  if (
    (variant === 'auto' || variant === 'always-sign' || variant === 'hero') &&
    amount < 0
  ) {
    return `\u2212${formatted}`; // U+2212 MINUS SIGN
  }
  return formatted;
}

function getAccessibilityLabel(
  amount: number,
  currency: string,
  locale: string,
): string {
  if (!isFinite(amount)) return 'amount unavailable';
  const sign = amount > 0 ? 'plus ' : amount < 0 ? 'minus ' : '';
  const abs = Math.abs(amount);
  const spoken = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs);
  return `${sign}${spoken}`;
}

// ── Component ──────────────────────────────────────────────────────────────

export function AmountDisplay({
  amount,
  currency = 'MXN',
  locale,
  size = 'md',
  variant = 'auto',
  colorize = true,
  showCurrencyCode = false,
  style,
}: AmountDisplayProps) {
  const storeLocale = useUIStore((s) => s.locale);
  const resolvedLocale = locale ?? (storeLocale === 'es' ? 'es-MX' : 'en-MX');

  const formatted = useMemo(() => {
    if (amount === null || amount === undefined || isNaN(amount) || !isFinite(amount)) {
      return '\u2014'; // em-dash
    }
    return formatAmount(amount, currency, resolvedLocale, variant);
  }, [amount, currency, resolvedLocale, variant]);

  const color = useMemo(() => {
    if (variant === 'hero') return colorMap.hero;
    if (!colorize) return colorMap.neutral;
    if (amount > 0) return colorMap.positive;
    if (amount < 0) return colorMap.negative;
    return colorMap.zero;
  }, [amount, colorize, variant]);

  const display =
    showCurrencyCode && formatted !== '\u2014'
      ? `${formatted} ${currency}`
      : formatted;

  return (
    <Text
      style={[
        sizeStyles[size],
        { color, fontVariant: ['tabular-nums'] },
        style,
      ]}
      accessibilityLabel={getAccessibilityLabel(amount, currency, resolvedLocale)}
    >
      {display}
    </Text>
  );
}

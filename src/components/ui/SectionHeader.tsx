import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { isToday, isYesterday, format, parseISO } from 'date-fns';
import { enUS, es } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../../stores/uiStore';
import { AmountDisplay } from './AmountDisplay';

// ── Types ──────────────────────────────────────────────────────────────────

interface SectionHeaderProps {
  dateKey: string;           // ISO date: "2026-04-15"
  locale?: string;
  transactionCount?: number;
  dailyTotal?: number;
  currency?: string;
}

// ── Date formatting ────────────────────────────────────────────────────────

function formatSectionDate(dateKey: string, locale: string, t: (k: string) => string): string {
  try {
    const date = parseISO(dateKey);
    const dateFnsLocale = locale.startsWith('es') ? es : enUS;
    if (isToday(date)) return t('sectionHeader.today');
    if (isYesterday(date)) return t('sectionHeader.yesterday');
    const currentYear = new Date().getFullYear();
    if (date.getFullYear() === currentYear) {
      return format(date, 'EEE, MMMM d', { locale: dateFnsLocale });
    }
    return format(date, 'EEE, MMMM d, yyyy', { locale: dateFnsLocale });
  } catch {
    return dateKey;
  }
}

// ── Component ──────────────────────────────────────────────────────────────

export function SectionHeader({
  dateKey,
  locale,
  transactionCount,
  dailyTotal,
  currency = 'MXN',
}: SectionHeaderProps) {
  const { t } = useTranslation();
  const storeLocale = useUIStore((s) => s.locale);
  const resolvedLocale = locale ?? (storeLocale === 'es' ? 'es-MX' : 'en-MX');

  const dateLabel = formatSectionDate(dateKey, resolvedLocale, t);

  // Build accessibility label
  let a11yLabel: string;
  if (isToday(parseISO(dateKey))) {
    a11yLabel = t('sectionHeader.a11yTransactionsToday');
  } else if (isYesterday(parseISO(dateKey))) {
    a11yLabel = t('sectionHeader.a11yTransactionsYesterday');
  } else {
    a11yLabel = t('sectionHeader.a11yTransactionsOn', { date: dateLabel });
  }

  return (
    <View
      accessibilityRole="header"
      accessibilityLabel={a11yLabel}
      style={styles.container}
    >
      <Text style={styles.dateLabel}>{dateLabel}</Text>

      {dailyTotal !== undefined ? (
        <AmountDisplay
          amount={dailyTotal}
          size="sm"
          variant="always-sign"
          colorize
          currency={currency}
          locale={resolvedLocale}
        />
      ) : transactionCount !== undefined ? (
        <Text style={styles.count}>
          {t('sectionHeader.count', { count: transactionCount })}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 36,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',   // slate-50 — masks rows scrolling underneath
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    zIndex: 10,
  },
  dateLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    lineHeight: 18,
    color: '#475569', // slate-600
  },
  count: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 16,
    color: '#94a3b8', // slate-400
  },
});

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { isToday, isYesterday, format, parseISO } from 'date-fns';
import { enUS, es } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../../stores/uiStore';
import { AmountDisplay } from './AmountDisplay';
import { useTheme } from '../../theme/ThemeContext';

interface SectionHeaderProps {
  dateKey: string;
  locale?: string;
  transactionCount?: number;
  dailyTotal?: number;
  currency?: string;
}

function SectionHeaderComponent({
  dateKey,
  locale,
  transactionCount,
  dailyTotal,
  currency = 'MXN',
}: SectionHeaderProps) {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();
  const storeLocale = useUIStore((s) => s.locale);
  const resolvedLocale = locale ?? (storeLocale === 'es' ? 'es-MX' : 'en-MX');

  const background = isDark ? theme.background : '#f8fafc';
  const textPrimary = isDark ? theme.textPrimary : '#475569';
  const borderCol = isDark ? theme.border : '#e2e8f0';

  const { dateLabel, a11yLabel } = useMemo(() => {
    let parsed: Date;
    try {
      parsed = parseISO(dateKey);
    } catch {
      return { dateLabel: dateKey, a11yLabel: dateKey };
    }
    const dateFnsLocale = resolvedLocale.startsWith('es') ? es : enUS;
    const today = isToday(parsed);
    const yesterday = !today && isYesterday(parsed);
    let label: string;
    if (today) {
      label = t('sectionHeader.today');
    } else if (yesterday) {
      label = t('sectionHeader.yesterday');
    } else {
      const currentYear = new Date().getFullYear();
      label = parsed.getFullYear() === currentYear
        ? format(parsed, 'EEE, MMMM d', { locale: dateFnsLocale })
        : format(parsed, 'EEE, MMMM d, yyyy', { locale: dateFnsLocale });
    }
    const a11y = today
      ? t('sectionHeader.a11yTransactionsToday')
      : yesterday
        ? t('sectionHeader.a11yTransactionsYesterday')
        : t('sectionHeader.a11yTransactionsOn', { date: label });
    return { dateLabel: label, a11yLabel: a11y };
  }, [dateKey, resolvedLocale, t]);

  return (
    <View
      accessibilityRole="header"
      accessibilityLabel={a11yLabel}
      style={[styles.container, { backgroundColor: background, borderBottomColor: borderCol }]}
    >
      <Text style={[styles.dateLabel, { color: textPrimary }]}>{dateLabel}</Text>

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
        <Text style={[styles.count, { color: isDark ? '#94a3b8' : '#94a3b8' }]}>
          {t('sectionHeader.count', { count: transactionCount })}
        </Text>
      ) : null}
    </View>
  );
}

export const SectionHeader = React.memo(SectionHeaderComponent);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 36,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    zIndex: 10,
  },
  dateLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    lineHeight: 18,
  },
  count: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 16,
    color: '#94a3b8',
  },
});

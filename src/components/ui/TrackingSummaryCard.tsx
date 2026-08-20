import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeContext';
import { getCategoryColor } from '../../utils/categoryColors';
import { mergeCalc, type CalculationSettings } from '../../api/financeShared';

const CALC_ROWS = ['income', 'expense', 'transfer_in', 'transfer_out'] as const;

interface Props {
  variant: 'saving' | 'debt';
  categories: { id: number; name: string; icon: string | null }[];
  bankAccounts: { id: number; display_name: string; currency: string }[];
  autoSync: boolean;
  calc: CalculationSettings;
}

/**
 * Read-only mirror of AdvancedFinanceSettings for the savings/debt detail
 * screens: what the goal is tracking and how those movements are counted.
 * Renders nothing when the user configured none of it.
 */
export function TrackingSummaryCard({ variant, categories, bankAccounts, autoSync, calc }: Props) {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();

  const surface = isDark ? theme.surface : '#ffffff';
  const textPrimary = isDark ? theme.textPrimary : '#0f172a';
  const textSecondary = isDark ? theme.textSecondary : '#64748b';
  const borderCol = isDark ? theme.border : '#e2e8f0';
  const dividerCol = isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9';
  const chipBg = isDark ? theme.surfaceElevated : '#f8fafc';

  const merged = mergeCalc(variant, calc);
  const defaults = mergeCalc(variant, null);
  // Only the rules the user moved off the template are worth the space.
  const changedRules = CALC_ROWS.filter((row) => merged[row] !== defaults[row]);

  if (categories.length === 0 && bankAccounts.length === 0 && !autoSync && changedRules.length === 0) {
    return null;
  }

  const calcNs = variant === 'debt' ? 'debts' : 'savings';

  return (
    <View style={s.section}>
      <Text style={[s.sectionTitle, { color: textPrimary }]}>{t('advancedSettings.title')}</Text>
      <View style={[s.card, { backgroundColor: surface, borderColor: borderCol }]}>
        <View style={s.row}>
          <Text style={[s.label, { color: textSecondary }]}>{t('advancedSettings.autoSync')}</Text>
          <View
            style={[
              s.statusPill,
              autoSync
                ? { backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : '#d1fae5' }
                : { backgroundColor: isDark ? 'rgba(148,163,184,0.15)' : '#f1f5f9' },
            ]}
          >
            <Text style={[s.statusText, { color: autoSync ? (isDark ? '#10b981' : '#065f46') : '#64748b' }]}>
              {autoSync ? t('common.enabled') : t('common.disabled')}
            </Text>
          </View>
        </View>

        {categories.length > 0 && (
          <>
            <View style={[s.divider, { backgroundColor: dividerCol }]} />
            <Text style={[s.label, { color: textSecondary }]}>{t('advancedSettings.categories')}</Text>
            <View style={s.chipRow}>
              {categories.map((c) => (
                <View key={c.id} style={[s.chip, { backgroundColor: chipBg, borderColor: borderCol }]}>
                  <View style={[s.dot, { backgroundColor: getCategoryColor(c.icon) }]} />
                  <Text style={[s.chipText, { color: textPrimary }]} numberOfLines={1}>{c.name}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {bankAccounts.length > 0 && (
          <>
            <View style={[s.divider, { backgroundColor: dividerCol }]} />
            <Text style={[s.label, { color: textSecondary }]}>{t('advancedSettings.bankAccounts')}</Text>
            <View style={s.chipRow}>
              {bankAccounts.map((a) => (
                <View key={a.id} style={[s.chip, { backgroundColor: chipBg, borderColor: borderCol }]}>
                  <Text style={[s.chipText, { color: textPrimary }]} numberOfLines={1}>{a.display_name}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {changedRules.length > 0 && (
          <>
            <View style={[s.divider, { backgroundColor: dividerCol }]} />
            <Text style={[s.label, { color: textSecondary }]}>{t('advancedSettings.calcTitle')}</Text>
            {changedRules.map((row) => (
              <View key={row} style={s.ruleRow}>
                <Text style={[s.ruleLabel, { color: textPrimary }]}>{t(`advancedSettings.rows.${row}`)}</Text>
                <Text style={[s.ruleValue, { color: textSecondary }]}>
                  {t(`${calcNs}.calcOptions.${merged[row]}`)}
                </Text>
              </View>
            ))}
          </>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  section: { gap: 8 },
  sectionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  card: { borderRadius: 12, borderWidth: 1, padding: 16, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statusPill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: '100%',
  },
  chipText: { fontFamily: 'Inter_400Regular', fontSize: 13, flexShrink: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  ruleLabel: { fontFamily: 'Inter_400Regular', fontSize: 14, flexShrink: 1 },
  ruleValue: { fontFamily: 'Inter_500Medium', fontSize: 13, textAlign: 'right' },
});

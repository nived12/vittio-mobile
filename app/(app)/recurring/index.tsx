import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, MagnifyingGlass, Plus } from 'phosphor-react-native';
import { useUIStore } from '../../../src/stores/uiStore';
import { useTheme } from '../../../src/theme/ThemeContext';
import type { ThemeTokens } from '../../../src/theme/colors';
import type { RecurringSeries } from '../../../src/api/recurring';
import {
  recurringKeys,
  useRecurring,
  useScanRecurring,
  useProcessDue,
  useUpdateRecurringRow,
  useDeleteRecurring,
} from '../../../src/hooks/useRecurring';
import { AddEditRecurringModal } from '../../../src/components/modals/AddEditRecurringModal';
import { formatCurrency, formatDisplayDate } from '../../../src/utils/format';

export default function RecurringScreen() {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();
  const locale = useUIStore((s) => s.locale);
  const showToast = useUIStore((s) => s.showToast);
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading } = useRecurring();

  const scanMutation = useScanRecurring();
  const processMutation = useProcessDue();
  const updateMutation = useUpdateRecurringRow();
  const deleteMutation = useDeleteRecurring();

  const onScan = () => {
    scanMutation.mutate(undefined, {
      onSuccess: (detected) => showToast(t('recurring.toastScanned', { count: detected.length }), 'success'),
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: recurringKeys.all });
    setRefreshing(false);
  };

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSeries, setEditingSeries] = useState<RecurringSeries | null>(null);
  const closeModal = () => { setShowAddModal(false); setEditingSeries(null); };

  const series = data?.series ?? [];
  const summary = data?.summary;
  const detected = series.filter((s) => s.status === 'detected');
  const active = series.filter((s) => s.status === 'active');
  const paused = series.filter((s) => s.status === 'paused');
  const cancelled = series.filter((s) => s.status === 'cancelled');

  const bg = isDark ? theme.background : '#f8fafc';
  const surface = isDark ? theme.surface : '#ffffff';
  const textPrimary = isDark ? theme.textPrimary : '#0f172a';
  const textMuted = isDark ? theme.textSecondary : '#64748b';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('common.back', { defaultValue: 'Back' })}
        >
          <ArrowLeft size={24} color={textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: textPrimary }]}>{t('recurring.title')}</Text>
        <TouchableOpacity
          onPress={() => setShowAddModal(true)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('recurring.new')}
        >
          <Plus size={24} color="#4f46e5" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color="#4f46e5" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />}
        >
          {/* Hero totals */}
          {summary && (
            <View style={styles.heroRow}>
              <View style={[styles.heroCard, { backgroundColor: surface }]}>
                <Text style={[styles.heroLabel, { color: textMuted }]}>{t('recurring.monthly_total')}</Text>
                <Text style={[styles.heroAmount, { color: textPrimary }]}>{formatCurrency(summary.monthly_total, locale)}</Text>
              </View>
              <View style={[styles.heroCard, { backgroundColor: surface }]}>
                <Text style={[styles.heroLabel, { color: textMuted }]}>{t('recurring.annual_total')}</Text>
                <Text style={[styles.heroAmount, { color: textPrimary }]}>{formatCurrency(summary.annual_total, locale)}</Text>
              </View>
            </View>
          )}

          {/* Scan CTA */}
          <TouchableOpacity
            style={[styles.scanBtn, { borderColor: isDark ? theme.border : '#cbd5e1' }]}
            onPress={onScan}
            disabled={scanMutation.isPending}
          >
            <MagnifyingGlass size={16} color="#4f46e5" />
            <Text style={[styles.scanBtnText, { color: textPrimary }]}>
              {scanMutation.isPending ? '…' : t('recurring.scan')}
            </Text>
          </TouchableOpacity>

          {/* Upcoming */}
          {summary && summary.upcoming.length > 0 && (
            <Section title={t('recurring.upcoming')} textPrimary={textPrimary}>
              {summary.upcoming.map((s) => (
                <UpcomingRow
                  key={s.id}
                  series={s}
                  locale={locale}
                  surface={surface}
                  textPrimary={textPrimary}
                  textMuted={textMuted}
                  isDark={isDark}
                  theme={theme}
                  onConfirm={() => processMutation.mutate({ id: s.id, action: 'confirm' })}
                  onSkip={() => processMutation.mutate({ id: s.id, action: 'skip' })}
                />
              ))}
            </Section>
          )}

          {/* Detected */}
          {detected.length > 0 && (
            <Section title={t('recurring.detected')} textPrimary={textPrimary}>
              <Text style={[styles.helper, { color: textMuted }]}>{t('recurring.detected_subtitle')}</Text>
              {detected.map((s) => (
                <DetectedRow
                  key={s.id}
                  series={s}
                  locale={locale}
                  textPrimary={textPrimary}
                  textMuted={textMuted}
                  isDark={isDark}
                  theme={theme}
                  onPromote={() => updateMutation.mutate({ id: s.id, body: { status: 'active' } })}
                  onDismiss={() => deleteMutation.mutate(s.id)}
                />
              ))}
            </Section>
          )}

          {/* Active */}
          <Section title={t('recurring.active')} textPrimary={textPrimary}>
            {active.length === 0 ? (
              <Text style={[styles.empty, { color: textMuted }]}>{t('recurring.empty_active')}</Text>
            ) : (
              active.map((s) => (
                <SeriesRow
                  key={s.id}
                  series={s}
                  locale={locale}
                  surface={surface}
                  textPrimary={textPrimary}
                  textMuted={textMuted}
                  onPress={() => router.push({ pathname: '/(app)/recurring/[id]', params: { id: String(s.id) } })}
                />
              ))
            )}
          </Section>

          {paused.length > 0 && (
            <Section title={t('recurring.paused')} textPrimary={textPrimary}>
              {paused.map((s) => <SeriesRow key={s.id} series={s} locale={locale} surface={surface} textPrimary={textPrimary} textMuted={textMuted} onPress={() => router.push({ pathname: '/(app)/recurring/[id]', params: { id: String(s.id) } })} />)}
            </Section>
          )}
          {cancelled.length > 0 && (
            <Section title={t('recurring.cancelled')} textPrimary={textPrimary}>
              {cancelled.map((s) => <SeriesRow key={s.id} series={s} locale={locale} surface={surface} textPrimary={textPrimary} textMuted={textMuted} onPress={() => router.push({ pathname: '/(app)/recurring/[id]', params: { id: String(s.id) } })} />)}
            </Section>
          )}
        </ScrollView>
      )}

      <AddEditRecurringModal
        visible={showAddModal || !!editingSeries}
        onClose={closeModal}
        series={editingSeries ?? undefined}
      />
    </SafeAreaView>
  );
}

function Section({ title, textPrimary, children }: { title: string; textPrimary: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 20 }}>
      <Text style={[styles.sectionHeader, { color: textPrimary }]}>{title}</Text>
      {children}
    </View>
  );
}

interface SeriesRowProps {
  series: RecurringSeries;
  locale: string;
  surface: string;
  textPrimary: string;
  textMuted: string;
  onPress: () => void;
}

function SeriesRow({ series, locale, surface, textPrimary, textMuted, onPress }: SeriesRowProps) {
  const { t } = useTranslation();
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={[styles.row, { backgroundColor: surface }]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.rowTitle, { color: textPrimary }]} numberOfLines={1}>{series.name}</Text>
        <Text style={[styles.rowSubtitle, { color: textMuted }]}>
          {t(`recurring.frequencies.${series.frequency}`)} · {formatDisplayDate(series.next_due_date, locale)}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[styles.rowAmount, { color: textPrimary }]}>{formatCurrency(series.expected_amount, locale, { maximumFractionDigits: 0 })}</Text>
        <Text style={[styles.rowMonthly, { color: textMuted }]}>
          {formatCurrency(series.monthly_estimate, locale, { maximumFractionDigits: 0 })}{t('recurring.monthly_suffix')}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

interface UpcomingRowProps {
  series: RecurringSeries;
  locale: string;
  surface: string;
  textPrimary: string;
  textMuted: string;
  isDark: boolean;
  theme: ThemeTokens;
  onConfirm: () => void;
  onSkip: () => void;
}

function UpcomingRow({ series, locale, surface, textPrimary, textMuted, isDark, theme, onConfirm, onSkip }: UpcomingRowProps) {
  const { t } = useTranslation();
  const skipBg = isDark ? theme.surfaceElevated : '#e2e8f0';
  return (
    <View style={[styles.row, { backgroundColor: surface, flexDirection: 'column', alignItems: 'stretch' }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowTitle, { color: textPrimary }]} numberOfLines={1}>{series.name}</Text>
          <Text style={[styles.rowSubtitle, { color: textMuted }]}>{formatDisplayDate(series.next_due_date, locale)}</Text>
        </View>
        <Text style={[styles.rowAmount, { color: textPrimary }]}>{formatCurrency(series.expected_amount, locale, { maximumFractionDigits: 0 })}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.positive ?? '#10b981' }]} onPress={onConfirm}>
          <Text style={styles.actionBtnText}>{t('recurring.actions.confirm')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: skipBg }]} onPress={onSkip}>
          <Text style={[styles.actionBtnText, { color: textPrimary }]}>{t('recurring.actions.skip')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

interface DetectedRowProps {
  series: RecurringSeries;
  locale: string;
  textPrimary: string;
  textMuted: string;
  isDark: boolean;
  theme: ThemeTokens;
  onPromote: () => void;
  onDismiss: () => void;
}

function DetectedRow({ series, locale, textPrimary, textMuted, isDark, theme, onPromote, onDismiss }: DetectedRowProps) {
  const { t } = useTranslation();
  const detectedBg = isDark ? 'rgba(217, 119, 6, 0.12)' : '#fef3c7';
  const dismissBorder = isDark ? theme.border : '#cbd5e1';
  const promoteBg = theme.primary ?? '#4f46e5';
  return (
    <View style={[styles.detectedRow, { backgroundColor: detectedBg }]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.rowTitle, { color: textPrimary }]} numberOfLines={1}>{series.name}</Text>
        <Text style={[styles.rowSubtitle, { color: textMuted }]}>
          {t(`recurring.frequencies.${series.frequency}`)} · {formatCurrency(series.expected_amount, locale, { maximumFractionDigits: 0 })} · {series.confidence_score}/100
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <TouchableOpacity style={[styles.smallBtn, { backgroundColor: promoteBg }]} onPress={onPromote}>
          <Text style={[styles.smallBtnText, { color: '#ffffff' }]}>{t('recurring.actions.promote')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.smallBtn, { borderWidth: 1, borderColor: dismissBorder }]}
          onPress={() => Alert.alert(t('common.confirm', { defaultValue: 'Confirm' }), t('recurring.actions.dismiss') + '?', [
            { text: t('common.cancel', { defaultValue: 'Cancel' }), style: 'cancel' },
            { text: 'OK', onPress: onDismiss },
          ])}
        >
          <Text style={[styles.smallBtnText, { color: textPrimary }]}>{t('recurring.actions.dismiss')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontFamily: 'Inter_600SemiBold', fontSize: 18 },
  heroRow: { flexDirection: 'row', gap: 12 },
  heroCard: { flex: 1, padding: 16, borderRadius: 16 },
  heroLabel: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  heroAmount: { fontFamily: 'Inter_700Bold', fontSize: 24, marginTop: 4 },
  scanBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderWidth: 1, borderRadius: 12, marginTop: 16 },
  scanBtnText: { fontFamily: 'Inter_500Medium', fontSize: 14 },
  sectionHeader: { fontFamily: 'Inter_600SemiBold', fontSize: 15, marginBottom: 8 },
  helper: { fontFamily: 'Inter_400Regular', fontSize: 12, marginBottom: 8 },
  empty: { fontFamily: 'Inter_400Regular', fontSize: 14, textAlign: 'center', paddingVertical: 16 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 8, gap: 12 },
  rowTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  rowSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2 },
  rowAmount: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  rowMonthly: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 2 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  actionBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#ffffff' },
  detectedRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 8, gap: 12 },
  smallBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  smallBtnText: { fontFamily: 'Inter_500Medium', fontSize: 12 },
});

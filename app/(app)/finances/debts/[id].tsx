import React, { useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, MoreHorizontal } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useDebt, useDeleteDebt } from '../../../../src/hooks/useDebts';
import { AddEditDebtModal } from '../../../../src/components/modals/AddEditDebtModal';
import { EmptyState } from '../../../../src/components/ui/EmptyState';
import { SkeletonBox } from '../../../../src/components/ui/SkeletonLoader';
import { useUIStore } from '../../../../src/stores/uiStore';

function formatCurrency(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(amount);
}

function StatCard({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={s.statCard}>
      <Text style={s.statLabel} numberOfLines={1}>{label}</Text>
      <Text style={[s.statValue, valueColor ? { color: valueColor } : {}]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

export default function DebtDetailScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const locale = useUIStore((s) => s.locale);
  const displayLocale = locale === 'es' ? 'es-MX' : 'en-MX';
  const [showEdit, setShowEdit] = useState(false);

  const debtId = Number(id);
  const { data: debt, isLoading, isError, refetch } = useDebt(debtId);
  const deleteMutation = useDeleteDebt();

  function handleMore() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: [t('common.cancel'), t('debts.delete.confirm')], destructiveButtonIndex: 1, cancelButtonIndex: 0 },
        (idx) => { if (idx === 1) confirmDelete(); },
      );
    } else {
      confirmDelete();
    }
  }

  function confirmDelete() {
    Alert.alert(t('debts.delete.title'), t('debts.delete.message'), [
      { text: t('debts.delete.cancel'), style: 'cancel' },
      {
        text: t('debts.delete.confirm'), style: 'destructive',
        onPress: async () => {
          await deleteMutation.mutateAsync(debtId);
          router.back();
        },
      },
    ]);
  }

  if (isLoading) {
    return (
      <View style={[s.screen, { paddingTop: insets.top }]}>
        <View style={s.navBar}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><ChevronLeft size={24} color="#0f172a" /></TouchableOpacity>
          <SkeletonBox width={120} height={18} />
          <View style={{ width: 44 }} />
        </View>
        <ScrollView contentContainerStyle={s.content}>
          <View style={s.heroCard}><SkeletonBox width={72} height={72} borderRadius={36} /></View>
          <View style={s.statsGrid}>{[1, 2, 3, 4].map((i) => <SkeletonBox key={i} width="100%" height={56} borderRadius={10} />)}</View>
        </ScrollView>
      </View>
    );
  }

  if (isError || !debt) {
    return (
      <View style={[s.screen, { paddingTop: insets.top }]}>
        <View style={s.navBar}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><ChevronLeft size={24} color="#0f172a" /></TouchableOpacity>
        </View>
        <EmptyState icon="wifi-off" iconColor="#cbd5e1" title={t('debts.error.title')}
          ctaLabel={t('common.retry')} ctaVariant="primary" onCta={() => refetch()} fullScreen />
      </View>
    );
  }

  const pct = Math.min(debt.progress_percentage, 100);
  const today = new Date().getDate();
  const isOverdue = Boolean(debt.due_day_of_month && today > debt.due_day_of_month && debt.status === 'active');

  return (
    <>
      <View style={[s.screen, { paddingTop: insets.top }]}>
        <View style={s.navBar}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><ChevronLeft size={24} color="#0f172a" /></TouchableOpacity>
          <Text style={s.navTitle} numberOfLines={1}>{debt.name}</Text>
          <TouchableOpacity onPress={handleMore} style={s.moreBtn}><MoreHorizontal size={22} color="#64748b" /></TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <View style={s.heroCard}>
            <View style={[s.heroCircle, { backgroundColor: debt.color }]}>
              <Text style={s.heroEmoji}>💳</Text>
            </View>
            {debt.due_day_of_month !== null && (
              <View style={[s.duePill, isOverdue ? { backgroundColor: '#fee2e2' } : { backgroundColor: '#fef3c7' }]}>
                <Text style={[s.duePillText, isOverdue ? { color: '#e11d48' } : { color: '#b45309' }]}>
                  {t('debts.dueDay', { day: debt.due_day_of_month })}
                </Text>
              </View>
            )}
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { backgroundColor: debt.color, width: `${pct}%` as unknown as number, minWidth: 4 }]} />
            </View>
            <Text style={s.pctText}>{debt.progress_percentage}% paid off</Text>
          </View>

          {/* Stats */}
          <View style={s.statsGrid}>
            <StatCard label={t('debts.fields.currentBalance')} value={formatCurrency(debt.current_balance, displayLocale)} valueColor="#e11d48" />
            <StatCard label={t('debts.fields.originalAmount')} value={formatCurrency(debt.original_amount, displayLocale)} />
            <StatCard label={t('debts.fields.amountPaid')} value={formatCurrency(debt.amount_paid, displayLocale)} valueColor="#10b981" />
            <StatCard label={t('debts.fields.interestRate')} value={debt.interest_rate != null ? `${debt.interest_rate}%` : '—'} />
          </View>

          {/* Payment card */}
          {debt.payment_mode && debt.target_payment_amount && (
            <View style={s.card}>
              <Text style={s.cardTitle}>{t('debts.fields.monthlyPayment')}</Text>
              <Text style={s.cardValue}>{formatCurrency(debt.target_payment_amount, displayLocale)}</Text>
              <Text style={s.cardSub}>/ {debt.payment_frequency}</Text>
            </View>
          )}

          {/* Linked goals */}
          {debt.goals.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Goals</Text>
              <View style={s.chipRow}>
                {debt.goals.map((g) => (
                  <View key={g.id} style={[s.goalChip, { borderColor: g.color }]}>
                    <View style={[s.goalDot, { backgroundColor: g.color }]} />
                    <Text style={s.goalChipText} numberOfLines={1}>{g.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {debt.notes && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>{t('common.notes')}</Text>
              <View style={s.card}><Text style={s.notesText}>{debt.notes}</Text></View>
            </View>
          )}

          <TouchableOpacity style={s.editBtn} onPress={() => setShowEdit(true)}>
            <Text style={s.editBtnText}>{t('common.edit')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <AddEditDebtModal visible={showEdit} onClose={() => setShowEdit(false)} debt={debt} />
    </>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  navBar: { flexDirection: 'row', alignItems: 'center', height: 56, paddingHorizontal: 4 },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  moreBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  navTitle: { flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 17, color: '#0f172a', textAlign: 'center' },
  content: { padding: 16, gap: 12 },
  heroCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', padding: 20, alignItems: 'center', gap: 12 },
  heroCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  heroEmoji: { fontSize: 32 },
  duePill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  duePillText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  progressTrack: { width: '100%', height: 8, borderRadius: 4, backgroundColor: '#f1f5f9', overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },
  pctText: { fontFamily: 'Inter_700Bold', fontSize: 24, color: '#0f172a', fontVariant: ['tabular-nums'] },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 14 },
  statLabel: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#64748b', marginBottom: 4 },
  statValue: { fontFamily: 'Inter_600SemiBold', fontSize: 17, color: '#0f172a', fontVariant: ['tabular-nums'] },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 16 },
  cardTitle: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#64748b', marginBottom: 4 },
  cardValue: { fontFamily: 'Inter_700Bold', fontSize: 22, color: '#0f172a', fontVariant: ['tabular-nums'] },
  cardSub: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#94a3b8' },
  section: { gap: 8 },
  sectionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#0f172a' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  goalChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#fff' },
  goalDot: { width: 8, height: 8, borderRadius: 4 },
  goalChipText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#0f172a' },
  notesText: { fontFamily: 'Inter_400Regular', fontSize: 15, color: '#374151', lineHeight: 22 },
  editBtn: { height: 52, backgroundColor: '#4f46e5', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  editBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#fff' },
});

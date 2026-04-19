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
import { useGoal, useDeleteGoal } from '../../../../src/hooks/useGoals';
import { AddEditGoalModal } from '../../../../src/components/modals/AddEditGoalModal';
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

export default function GoalDetailScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const locale = useUIStore((s) => s.locale);
  const displayLocale = locale === 'es' ? 'es-MX' : 'en-MX';
  const [showEdit, setShowEdit] = useState(false);

  const goalId = Number(id);
  const { data: goal, isLoading, isError, refetch } = useGoal(goalId);
  const deleteMutation = useDeleteGoal();

  function handleMore() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: [t('common.cancel'), t('goals.delete.confirm')], destructiveButtonIndex: 1, cancelButtonIndex: 0 },
        (idx) => { if (idx === 1) confirmDelete(); },
      );
    } else {
      confirmDelete();
    }
  }

  function confirmDelete() {
    Alert.alert(t('goals.delete.title'), t('goals.delete.message'), [
      { text: t('goals.delete.cancel'), style: 'cancel' },
      {
        text: t('goals.delete.confirm'), style: 'destructive',
        onPress: async () => {
          await deleteMutation.mutateAsync(goalId);
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
          <View style={s.heroCard}><SkeletonBox width="100%" height={100} borderRadius={12} /></View>
        </ScrollView>
      </View>
    );
  }

  if (isError || !goal) {
    return (
      <View style={[s.screen, { paddingTop: insets.top }]}>
        <View style={s.navBar}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><ChevronLeft size={24} color="#0f172a" /></TouchableOpacity>
        </View>
        <EmptyState icon="wifi-off" iconColor="#cbd5e1" title={t('goals.detail.error.title')}
          ctaLabel={t('common.retry')} ctaVariant="primary" onCta={() => refetch()} fullScreen />
      </View>
    );
  }

  const pct = Math.min(goal.progress_percentage, 100);
  const startDate = new Date(goal.start_date);
  const deadline = new Date(goal.deadline);
  const today = new Date();
  const daysElapsed = Math.max(0, Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <>
      <View style={[s.screen, { paddingTop: insets.top }]}>
        <View style={s.navBar}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><ChevronLeft size={24} color="#0f172a" /></TouchableOpacity>
          <Text style={s.navTitle} numberOfLines={1}>{goal.name}</Text>
          <TouchableOpacity onPress={handleMore} style={s.moreBtn}><MoreHorizontal size={22} color="#64748b" /></TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <View style={s.heroCard}>
            <View style={s.heroTopRow}>
              <View style={[s.typeBadge, goal.goal_type === 'savings_goal' ? { backgroundColor: '#e0e7ff' } : { backgroundColor: '#ffe4e6' }]}>
                <Text style={[s.typeBadgeText, goal.goal_type === 'savings_goal' ? { color: '#3730a3' } : { color: '#9f1239' }]}>
                  {goal.goal_type === 'savings_goal' ? t('goals.type.savingsGoal') : t('goals.type.debtPayoff')}
                </Text>
              </View>
              {goal.debt_strategy && (
                <View style={[s.typeBadge, { backgroundColor: '#f1f5f9' }]}>
                  <Text style={[s.typeBadgeText, { color: '#475569' }]}>
                    {goal.debt_strategy === 'snowball' ? t('goals.strategy.snowball') : t('goals.strategy.avalanche')}
                  </Text>
                </View>
              )}
            </View>
            <Text style={s.pctHero}>{goal.progress_percentage}%</Text>
            <Text style={s.deadlineText}>{t('goals.detail.complete')} · {deadline.toLocaleDateString(displayLocale)}</Text>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { backgroundColor: goal.color, width: `${pct}%` as unknown as number, minWidth: 4 }]} />
            </View>
          </View>

          {/* Stats */}
          <View style={s.statsGrid}>
            <StatCard label={t('goals.detail.daysElapsed')} value={String(daysElapsed)} />
            <StatCard label={t('goals.detail.daysRemaining')} value={String(Math.max(0, goal.days_remaining))}
              valueColor={goal.days_remaining <= 30 && goal.days_remaining > 0 ? '#d97706' : goal.days_remaining < 0 ? '#e11d48' : undefined} />
            <StatCard label={t('goals.detail.amountRemaining')} value={formatCurrency(goal.amount_remaining, displayLocale)} />
            <StatCard label={t('goals.detail.monthlyNeeded')} value={formatCurrency(goal.monthly_contribution_needed, displayLocale)} />
          </View>

          {/* Debt strategy card */}
          {goal.goal_type === 'debt_payoff' && goal.debt_strategy && (
            <View style={s.strategyCard}>
              <Text style={s.strategyTitle}>
                {goal.debt_strategy === 'snowball' ? t('goals.strategy.snowball') : t('goals.strategy.avalanche')}
              </Text>
              <Text style={s.strategyDesc}>
                {goal.debt_strategy === 'snowball' ? t('goals.strategy.snowballExplain') : t('goals.strategy.avalancheExplain')}
              </Text>
            </View>
          )}

          {/* Linked savings */}
          {goal.goal_type === 'savings_goal' && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>{t('goals.detail.linkedSavings')}</Text>
              {goal.savings.length === 0 ? (
                <Text style={s.emptyLinked}>{t('goals.noLinkedSavings')}</Text>
              ) : (
                goal.savings.map((sv) => (
                  <View key={sv.id} style={s.linkedCard}>
                    <View style={[s.linkedDot, { backgroundColor: sv.color }]} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={s.linkedName} numberOfLines={1}>{sv.name}</Text>
                      <View style={s.miniTrack}>
                        <View style={[s.miniFill, { backgroundColor: sv.color, width: `${Math.min(sv.progress_percentage, 100)}%` as unknown as number }]} />
                      </View>
                    </View>
                    <Text style={s.linkedAmt}>{sv.progress_percentage}%</Text>
                  </View>
                ))
              )}
            </View>
          )}

          {/* Linked debts */}
          {goal.goal_type === 'debt_payoff' && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>{t('goals.detail.linkedDebts')}</Text>
              {goal.debts.length === 0 ? (
                <Text style={s.emptyLinked}>{t('goals.noLinkedDebts')}</Text>
              ) : (
                goal.debts.map((db) => (
                  <View key={db.id} style={s.linkedCard}>
                    <View style={[s.linkedDot, { backgroundColor: db.color }]} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={s.linkedName} numberOfLines={1}>{db.name}</Text>
                      <View style={s.miniTrack}>
                        <View style={[s.miniFill, { backgroundColor: db.color, width: `${Math.min(db.progress_percentage, 100)}%` as unknown as number }]} />
                      </View>
                    </View>
                    <Text style={s.linkedAmt}>{formatCurrency(db.current_balance, displayLocale)}</Text>
                  </View>
                ))
              )}
            </View>
          )}

          {goal.notes && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>{t('common.notes')}</Text>
              <View style={s.card}><Text style={s.notesText}>{goal.notes}</Text></View>
            </View>
          )}

          <TouchableOpacity style={s.editBtn} onPress={() => setShowEdit(true)}>
            <Text style={s.editBtnText}>{t('common.edit')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <AddEditGoalModal visible={showEdit} onClose={() => setShowEdit(false)} goal={goal} />
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
  heroCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', padding: 20, gap: 10 },
  heroTopRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  typeBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  typeBadgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  pctHero: { fontFamily: 'Inter_700Bold', fontSize: 40, color: '#0f172a', fontVariant: ['tabular-nums'] },
  deadlineText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#64748b' },
  progressTrack: { width: '100%', height: 8, borderRadius: 4, backgroundColor: '#f1f5f9', overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 14 },
  statLabel: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#64748b', marginBottom: 4 },
  statValue: { fontFamily: 'Inter_600SemiBold', fontSize: 17, color: '#0f172a', fontVariant: ['tabular-nums'] },
  strategyCard: { backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 16 },
  strategyTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#0f172a', marginBottom: 4 },
  strategyDesc: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#64748b', lineHeight: 20 },
  section: { gap: 8 },
  sectionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#0f172a' },
  linkedCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', padding: 12 },
  linkedDot: { width: 10, height: 10, borderRadius: 5 },
  linkedName: { fontFamily: 'Inter_500Medium', fontSize: 14, color: '#0f172a', marginBottom: 6 },
  miniTrack: { height: 4, borderRadius: 2, backgroundColor: '#f1f5f9', overflow: 'hidden' },
  miniFill: { height: 4, borderRadius: 2 },
  linkedAmt: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#0f172a', marginLeft: 8, fontVariant: ['tabular-nums'] },
  emptyLinked: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#94a3b8' },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 16 },
  notesText: { fontFamily: 'Inter_400Regular', fontSize: 15, color: '#374151', lineHeight: 22 },
  editBtn: { height: 52, backgroundColor: '#4f46e5', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  editBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#fff' },
});

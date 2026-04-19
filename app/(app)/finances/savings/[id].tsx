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
import { useSaving, useDeleteSaving } from '../../../../src/hooks/useSavings';
import { AddEditSavingModal } from '../../../../src/components/modals/AddEditSavingModal';
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

export default function SavingDetailScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const locale = useUIStore((s) => s.locale);
  const displayLocale = locale === 'es' ? 'es-MX' : 'en-MX';
  const [showEdit, setShowEdit] = useState(false);

  const savingId = Number(id);
  const { data: saving, isLoading, isError, refetch } = useSaving(savingId);
  const deleteMutation = useDeleteSaving();

  function handleMore() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: [t('common.cancel'), t('savings.delete.confirm')], destructiveButtonIndex: 1, cancelButtonIndex: 0 },
        (idx) => { if (idx === 1) confirmDelete(); },
      );
    } else {
      Alert.alert(t('savings.delete.title'), t('savings.delete.message'), [
        { text: t('savings.delete.cancel'), style: 'cancel' },
        { text: t('savings.delete.confirm'), style: 'destructive', onPress: confirmDelete },
      ]);
    }
  }

  function confirmDelete() {
    Alert.alert(t('savings.delete.title'), t('savings.delete.message'), [
      { text: t('savings.delete.cancel'), style: 'cancel' },
      {
        text: t('savings.delete.confirm'), style: 'destructive',
        onPress: async () => {
          await deleteMutation.mutateAsync(savingId);
          router.back();
        },
      },
    ]);
  }

  if (isLoading) {
    return (
      <View style={[s.screen, { paddingTop: insets.top }]}>
        <View style={s.navBar}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <ChevronLeft size={24} color="#0f172a" />
          </TouchableOpacity>
          <SkeletonBox width={120} height={18} />
          <View style={{ width: 44 }} />
        </View>
        <ScrollView contentContainerStyle={s.content}>
          <View style={s.heroCard}>
            <SkeletonBox width={72} height={72} borderRadius={36} />
            <SkeletonBox width={120} height={10} style={{ marginTop: 16 }} />
            <SkeletonBox width={60} height={22} style={{ marginTop: 8 }} />
          </View>
          <View style={s.statsGrid}>
            {[1, 2, 3, 4].map((i) => <SkeletonBox key={i} width="100%" height={56} borderRadius={10} />)}
          </View>
        </ScrollView>
      </View>
    );
  }

  if (isError || !saving) {
    return (
      <View style={[s.screen, { paddingTop: insets.top }]}>
        <View style={s.navBar}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><ChevronLeft size={24} color="#0f172a" /></TouchableOpacity>
        </View>
        <EmptyState icon="wifi-off" iconColor="#cbd5e1" title={t('savings.error.title')}
          ctaLabel={t('common.retry')} ctaVariant="primary" onCta={() => refetch()} fullScreen />
      </View>
    );
  }

  const pct = Math.min(saving.progress_percentage, 100);
  const statusColors: Record<string, string> = {
    active: '#3730a3', completed: '#065f46', paused: '#92400e', archived: '#64748b',
  };
  const statusBgColors: Record<string, string> = {
    active: '#e0e7ff', completed: '#d1fae5', paused: '#fef3c7', archived: '#f1f5f9',
  };

  return (
    <>
      <View style={[s.screen, { paddingTop: insets.top }]}>
        <View style={s.navBar}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <ChevronLeft size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={s.navTitle} numberOfLines={1}>{saving.name}</Text>
          <TouchableOpacity onPress={handleMore} style={s.moreBtn} accessibilityRole="button">
            <MoreHorizontal size={22} color="#64748b" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <View style={s.heroCard}>
            <View style={[s.heroCircle, { backgroundColor: saving.color }]}>
              <Text style={s.heroEmoji}>💰</Text>
            </View>
            <View style={[s.statusBadge, { backgroundColor: statusBgColors[saving.status] ?? '#f1f5f9' }]}>
              <Text style={[s.statusText, { color: statusColors[saving.status] ?? '#64748b' }]}>
                {t(`savings.status.${saving.status}`)}
              </Text>
            </View>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { backgroundColor: saving.color, width: `${pct}%` as unknown as number, minWidth: 4 }]} />
            </View>
            <Text style={s.pctText}>{saving.progress_percentage}%</Text>
          </View>

          {/* Stats grid */}
          <View style={s.statsGrid}>
            <StatCard label={t('savings.fields.currentAmount')} value={formatCurrency(saving.current_amount, displayLocale)} valueColor="#10b981" />
            <StatCard label={t('savings.fields.targetAmount')} value={formatCurrency(saving.target_amount, displayLocale)} />
            <StatCard label={t('savings.fields.remaining')} value={formatCurrency(saving.amount_remaining, displayLocale)} />
            <StatCard label={t('savings.fields.targetDate')} value={saving.target_date ?? '—'} />
          </View>

          {/* Contribution card */}
          {saving.contribution_mode && saving.target_contribution_amount && (
            <View style={s.card}>
              <Text style={s.cardTitle}>{t('savings.fields.contribution')}</Text>
              <Text style={s.cardValue}>{formatCurrency(saving.target_contribution_amount, displayLocale)}</Text>
              <Text style={s.cardSub}>/ {saving.contribution_frequency}</Text>
            </View>
          )}

          {/* Linked goals */}
          {saving.goals.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Goals</Text>
              <View style={s.chipRow}>
                {saving.goals.map((g) => (
                  <View key={g.id} style={[s.goalChip, { borderColor: g.color }]}>
                    <View style={[s.goalDot, { backgroundColor: g.color }]} />
                    <Text style={s.goalChipText} numberOfLines={1}>{g.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Notes */}
          {saving.notes && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>{t('common.notes')}</Text>
              <View style={s.card}>
                <Text style={s.notesText}>{saving.notes}</Text>
              </View>
            </View>
          )}

          {/* Edit button */}
          <TouchableOpacity style={s.editBtn} onPress={() => setShowEdit(true)}>
            <Text style={s.editBtnText}>{t('common.edit')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <AddEditSavingModal visible={showEdit} onClose={() => setShowEdit(false)} saving={saving} />
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
  heroCard: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0',
    padding: 20, alignItems: 'center', gap: 12,
  },
  heroCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  heroEmoji: { fontSize: 32 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  progressTrack: { width: '100%', height: 8, borderRadius: 4, backgroundColor: '#f1f5f9', overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },
  pctText: { fontFamily: 'Inter_700Bold', fontSize: 28, color: '#0f172a', fontVariant: ['tabular-nums'] },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCard: {
    flex: 1, minWidth: '45%', backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: '#e2e8f0', padding: 14,
  },
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
  editBtn: {
    height: 52, backgroundColor: '#4f46e5', borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  editBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#fff' },
});

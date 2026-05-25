import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft } from 'phosphor-react-native';
import { useUIStore } from '../../../src/stores/uiStore';
import { useTheme } from '../../../src/theme/ThemeContext';
import {
  useRecurringSeries,
  useUpdateRecurring,
  useDeleteRecurring,
} from '../../../src/hooks/useRecurring';
import { AddEditRecurringModal } from '../../../src/components/modals/AddEditRecurringModal';
import { formatCurrency, formatDisplayDate } from '../../../src/utils/format';

export default function RecurringDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const numericId = Number(id);
  const { theme, isDark } = useTheme();
  const locale = useUIStore((s) => s.locale);
  const [showEditModal, setShowEditModal] = useState(false);

  const { data: series, isLoading } = useRecurringSeries(numericId);
  const updateMutation = useUpdateRecurring(numericId);
  const deleteMutation = useDeleteRecurring();

  const bg          = isDark ? theme.background     : '#f8fafc';
  const surface     = isDark ? theme.surface        : '#ffffff';
  const surfaceElev = isDark ? theme.surfaceElevated : '#f1f5f9';
  const borderCol   = isDark ? theme.border         : '#e2e8f0';
  const textPrimary = isDark ? theme.textPrimary    : '#0f172a';
  const textMuted   = isDark ? theme.textSecondary  : '#64748b';
  const primary     = theme.primary ?? '#4f46e5';
  const negative    = theme.negative ?? '#e11d48';

  const onDelete = () => {
    Alert.alert(
      t('common.confirm', { defaultValue: 'Confirm' }),
      t('recurring.actions.delete') + '?',
      [
        { text: t('common.cancel', { defaultValue: 'Cancel' }), style: 'cancel' },
        { text: t('recurring.actions.delete'), style: 'destructive', onPress: () => deleteMutation.mutate(numericId, { onSuccess: () => router.replace('/(app)/recurring') }) },
      ]
    );
  };

  if (isLoading || !series) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
        <ActivityIndicator color={primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

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
        <Text style={[styles.title, { color: textPrimary }]} numberOfLines={1}>{series.name}</Text>
        <TouchableOpacity onPress={() => setShowEditModal(true)} hitSlop={8}>
          <Text style={[styles.editBtn, { color: primary }]}>{t('recurring.actions.edit')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
        <View style={[styles.card, { backgroundColor: surface }]}>
          <Text style={[styles.label, { color: textMuted }]}>{t(`recurring.frequencies.${series.frequency}`)}</Text>
          <Text style={[styles.amount, { color: textPrimary }]}>{formatCurrency(series.expected_amount, locale)}</Text>
          <Text style={[styles.label, { color: textMuted, marginTop: 6 }]}>
            {t('recurring.next_due_label')}: {formatDisplayDate(series.next_due_date, locale)}
          </Text>
        </View>

        <View style={styles.grid}>
          <View style={[styles.statCard, { backgroundColor: surface }]}>
            <Text style={[styles.label, { color: textMuted }]}>{t('recurring.monthly_total')}</Text>
            <Text style={[styles.statValue, { color: textPrimary }]}>{formatCurrency(series.monthly_estimate, locale)}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: surface }]}>
            <Text style={[styles.label, { color: textMuted }]}>{t('recurring.annual_total')}</Text>
            <Text style={[styles.statValue, { color: textPrimary }]}>{formatCurrency(series.annual_estimate, locale)}</Text>
          </View>
        </View>

        <View style={{ gap: 8, marginTop: 16 }}>
          {series.status === 'active' && (
            <TouchableOpacity style={[styles.btn, { backgroundColor: surfaceElev, borderColor: borderCol }]} onPress={() => updateMutation.mutate({ status: 'paused' })}>
              <Text style={[styles.btnText, { color: textPrimary }]}>{t('recurring.actions.pause')}</Text>
            </TouchableOpacity>
          )}
          {series.status === 'paused' && (
            <TouchableOpacity style={[styles.btn, { backgroundColor: primary, borderColor: primary }]} onPress={() => updateMutation.mutate({ status: 'active' })}>
              <Text style={[styles.btnText, { color: '#fff' }]}>{t('recurring.actions.resume')}</Text>
            </TouchableOpacity>
          )}
          {series.status !== 'cancelled' && (
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: surface, borderColor: negative }]}
              onPress={() => updateMutation.mutate({ status: 'cancelled' })}
            >
              <Text style={[styles.btnText, { color: negative }]}>{t('recurring.actions.cancel')}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: surface, borderColor: negative }]}
            onPress={onDelete}
          >
            <Text style={[styles.btnText, { color: negative }]}>{t('recurring.actions.delete')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <AddEditRecurringModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        series={series}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontFamily: 'Inter_600SemiBold', fontSize: 17, flex: 1, textAlign: 'center', marginHorizontal: 12 },
  editBtn: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  card: { padding: 16, borderRadius: 16 },
  label: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  amount: { fontFamily: 'Inter_700Bold', fontSize: 32, marginTop: 4 },
  grid: { flexDirection: 'row', gap: 12, marginTop: 12 },
  statCard: { flex: 1, padding: 14, borderRadius: 12 },
  statValue: { fontFamily: 'Inter_700Bold', fontSize: 18, marginTop: 4 },
  btn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  btnText: { fontFamily: 'Inter_500Medium', fontSize: 14 },
});

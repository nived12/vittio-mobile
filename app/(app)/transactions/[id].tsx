import React, { useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
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
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react-native';
import * as LucideIcons from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useTransaction, useDeleteTransaction, useUpdateTransaction } from '../../../src/hooks/useTransactions';
import { useCategories } from '../../../src/hooks/useCategories';
import { useUIStore } from '../../../src/stores/uiStore';
import { AddEditTransactionModal } from '../../../src/components/modals/AddEditTransactionModal';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { SkeletonBox } from '../../../src/components/ui/SkeletonLoader';
import { getCategoryColor } from '../../../src/utils/categoryColors';
import type { Category } from '../../../src/api/categories';

// ── Icon resolver ──────────────────────────────────────────────────────────

function getIcon(name: string): React.ComponentType<{ size: number; color: string }> {
  const pascal = name.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('');
  const icons = LucideIcons as Record<string, unknown>;
  return (icons[pascal] as React.ComponentType<{ size: number; color: string }>) ?? LucideIcons.Tag;
}

// ── Type badge config ──────────────────────────────────────────────────────

interface BadgeConfig { bg: string; text: string; label: string }

function getTypeBadge(type: string, t: (k: string) => string): BadgeConfig {
  const map: Record<string, BadgeConfig> = {
    income:           { bg: '#d1fae5', text: '#065f46', label: t('transactionDetail.types.income') },
    fixed_expense:    { bg: '#fee2e2', text: '#991b1b', label: t('transactionDetail.types.fixed_expense') },
    variable_expense: { bg: '#fee2e2', text: '#991b1b', label: t('transactionDetail.types.variable_expense') },
    transfer_in:      { bg: '#ede9fe', text: '#5b21b6', label: t('transactionDetail.types.transfer_in') },
    transfer_out:     { bg: '#ede9fe', text: '#5b21b6', label: t('transactionDetail.types.transfer_out') },
  };
  return map[type] ?? { bg: '#f1f5f9', text: '#334155', label: type };
}

// ── Category Picker Modal ─────────────────────────────────────────────────

interface CategoryPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (category: Category) => void;
  categories: Category[];
  selectedId?: number | null;
}

function CategoryPickerModal({ visible, onClose, onSelect, categories, selectedId }: CategoryPickerProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose} />
      <View style={[styles.categorySheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Categoría</Text>
        <FlatList
          data={categories}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.categoryRow, item.id === selectedId && styles.categoryRowActive]}
              onPress={() => {
                onSelect(item);
                onClose();
              }}
            >
              <Text style={[styles.categoryRowText, item.id === selectedId && styles.categoryRowTextActive]}>
                {item.name}
              </Text>
              {item.id === selectedId && <View style={styles.checkDot} />}
            </TouchableOpacity>
          )}
          style={{ maxHeight: 360 }}
        />
      </View>
    </Modal>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const txId = Number(id);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const locale = useUIStore((s) => s.locale);
  const showToast = useUIStore((s) => s.showToast);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const { data: tx, isLoading, isError } = useTransaction(txId);
  const deleteMutation = useDeleteTransaction();
  const updateMutation = useUpdateTransaction(txId);
  const { data: categoriesData } = useCategories();
  const categories = categoriesData ?? [];

  const resolvedLocale = locale === 'es' ? 'es-MX' : 'en-MX';

  function fmtAmount(amount: number): string {
    const abs = Math.abs(amount);
    const formatted = new Intl.NumberFormat(resolvedLocale, {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
    }).format(abs);
    if (amount < 0) return `\u2212${formatted}`;
    if (amount > 0) return `+${formatted}`;
    return formatted;
  }

  function handleMoreOptions() {
    const txIsManual = tx?.source === 'manual';
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (Platform.OS === 'ios') {
      const options = txIsManual
        ? ['Editar', 'Eliminar', 'Cancelar']
        : ['Cancelar'];
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: txIsManual ? 2 : 0,
          destructiveButtonIndex: txIsManual ? 1 : undefined,
        },
        (buttonIndex) => {
          if (txIsManual && buttonIndex === 0) {
            setShowEditModal(true);
          } else if (txIsManual && buttonIndex === 1) {
            handleDelete();
          }
        },
      );
    } else {
      const buttons: Array<{ text: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void }> = [
        { text: 'Cancelar', style: 'cancel' },
      ];
      if (txIsManual) {
        buttons.unshift(
          { text: 'Editar', onPress: () => Alert.alert('Próximamente', 'La edición estará disponible en la próxima versión.') },
          { text: 'Eliminar', style: 'destructive', onPress: handleDelete },
        );
      }
      Alert.alert('Opciones', undefined, buttons);
    }
  }

  function handleDelete() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Alert.alert(
      t('transactionDetail.deleteConfirm.title'),
      t('transactionDetail.deleteConfirm.message'),
      [
        { text: t('transactionDetail.deleteConfirm.cancel'), style: 'cancel' },
        {
          text: t('transactionDetail.deleteConfirm.confirm'),
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteMutation.mutateAsync(txId);
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
              showToast(t('transactionDetail.deleteSuccess'), 'success');
              router.back();
            } catch {
              showToast(t('transactionDetail.deleteError'), 'error');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  }

  async function handleCategorySelect(category: Category) {
    if (!tx) return;
    // Optimistic update not needed — react-query setQueryData after success is sufficient
    try {
      await updateMutation.mutateAsync({ category_id: category.id });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      showToast('Categoría actualizada', 'success');
    } catch {
      showToast('Error al actualizar categoría', 'error');
    }
  }

  // ── Skeleton ────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.navHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ChevronLeft size={20} color="#475569" />
            <Text style={styles.backLabel}>{t('transactionDetail.back')}</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Hero card skeleton */}
          <View style={[styles.heroCard, { gap: 12 }]}>
            <SkeletonBox width={56} height={56} borderRadius={16} />
            <SkeletonBox width={140} height={20} />
            <SkeletonBox width={120} height={32} />
            <SkeletonBox width={100} height={16} />
          </View>
          {/* Details skeleton */}
          <View style={styles.detailsCard}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <View key={i} style={styles.detailRow}>
                <SkeletonBox width={80} height={14} />
                <SkeletonBox width={100} height={14} />
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────

  if (isError || !tx) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.navHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ChevronLeft size={20} color="#475569" />
            <Text style={styles.backLabel}>{t('transactionDetail.back')}</Text>
          </TouchableOpacity>
        </View>
        <EmptyState
          icon="receipt"
          iconColor="#cbd5e1"
          title={t('transactionDetail.notFound.title')}
          subtitle={t('transactionDetail.notFound.subtitle')}
          ctaLabel={t('transactionDetail.notFound.goBack')}
          ctaVariant="secondary"
          onCta={() => router.back()}
          fullScreen
        />
      </View>
    );
  }

  // ── Data ─────────────────────────────────────────────────────────────────

  const isManual = tx.source === 'manual';
  const iconName = tx.is_transfer ? 'arrow-left-right' : (tx.category?.icon ?? 'tag');
  const iconBg = tx.is_transfer ? '#ede9fe' : (tx.category ? getCategoryColor(tx.category.icon) : '#f1f5f9');
  const iconColor = tx.is_transfer ? '#7c3aed' : (tx.category ? '#ffffff' : '#94a3b8');
  const IconComponent = getIcon(iconName);

  const amountColor =
    tx.amount > 0 ? '#059669' :
    tx.amount < 0 ? '#e11d48' :   // rose-600 per design spec
    '#94a3b8';

  const typeBadge = getTypeBadge(tx.transaction_type, t);
  const formattedDate = format(parseISO(tx.date), 'MMMM d, yyyy');

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Nav header */}
      <View style={styles.navHeader}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('transactionDetail.back')}
        >
          <ChevronLeft size={20} color="#475569" />
          <Text style={styles.backLabel}>{t('transactionDetail.back')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.moreBtn}
          onPress={handleMoreOptions}
          accessibilityRole="button"
          accessibilityLabel="Más opciones"
        >
          <MoreHorizontal size={22} color="#475569" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 32 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero card */}
        <View style={styles.heroCard}>
          <View style={[styles.heroIconCircle, { backgroundColor: iconBg }]}>
            <IconComponent size={28} color={iconColor} />
          </View>
          <Text style={styles.heroTitle} numberOfLines={2}>
            {tx.merchant ?? tx.description}
          </Text>
          {tx.concept ? <Text style={styles.heroConcept}>{tx.concept}</Text> : null}
          <Text style={[styles.heroAmount, { color: amountColor }]}>{fmtAmount(tx.amount)}</Text>
          <Text style={styles.heroDate}>{formattedDate}</Text>
          {/* Type badge */}
          <View style={[styles.typeBadge, { backgroundColor: typeBadge.bg }]}>
            <Text style={[styles.typeBadgeText, { color: typeBadge.text }]}>{typeBadge.label}</Text>
          </View>
        </View>

        {/* Details card */}
        <View style={styles.detailsCard}>
          {/* Category — tappable for all transactions (to allow re-categorize) */}
          <TouchableOpacity
            style={styles.detailRow}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setShowCategoryPicker(true);
            }}
            accessibilityRole="button"
            accessibilityLabel={`${t('transactionDetail.fields.category')}: ${tx.category?.name ?? t('transactionDetail.fields.uncategorized')}. Toca para cambiar`}
          >
            <Text style={styles.detailLabel}>{t('transactionDetail.fields.category')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.detailValue}>
                {tx.category?.name ?? t('transactionDetail.fields.uncategorized')}
              </Text>
              <ChevronRight size={16} color="#cbd5e1" />
            </View>
          </TouchableOpacity>
          <View style={styles.detailDivider} />

          {/* Account */}
          <TouchableOpacity
            style={styles.detailRow}
            onPress={() => router.push(`/(app)/accounts/${tx.bank_account.id}` as `/(app)/accounts/${string}`)}
            accessibilityRole="button"
          >
            <Text style={styles.detailLabel}>{t('transactionDetail.fields.account')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.detailValue}>{tx.bank_account.name}</Text>
              <ChevronRight size={16} color="#cbd5e1" />
            </View>
          </TouchableOpacity>
          <View style={styles.detailDivider} />

          {/* Type */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('transactionDetail.fields.type')}</Text>
            <View style={[styles.typeBadge, { backgroundColor: typeBadge.bg }]}>
              <Text style={[styles.typeBadgeText, { color: typeBadge.text }]}>{typeBadge.label}</Text>
            </View>
          </View>
          <View style={styles.detailDivider} />

          {/* Source */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('transactionDetail.fields.source')}</Text>
            <Text style={styles.detailValue}>
              {isManual ? t('transactionDetail.fields.manual') : t('transactionDetail.fields.statement')}
            </Text>
          </View>

          {/* Merchant (if present) */}
          {tx.merchant ? (
            <>
              <View style={styles.detailDivider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('transactionDetail.fields.merchant')}</Text>
                <Text style={styles.detailValue}>{tx.merchant}</Text>
              </View>
            </>
          ) : null}

          {/* Reference (if present) */}
          {tx.reference ? (
            <>
              <View style={styles.detailDivider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('transactionDetail.fields.reference')}</Text>
                <Text style={styles.detailValue}>{tx.reference}</Text>
              </View>
            </>
          ) : null}
        </View>

        {/* Delete button */}
        {isManual ? (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={handleDelete}
            disabled={isDeleting}
            accessibilityRole="button"
            accessibilityHint="Double-tap to permanently delete this transaction"
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.deleteBtnText}>{t('transactionDetail.deleteButton')}</Text>
            )}
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      {/* Category picker modal */}
      <CategoryPickerModal
        visible={showCategoryPicker}
        onClose={() => setShowCategoryPicker(false)}
        onSelect={handleCategorySelect}
        categories={categories}
        selectedId={tx.category?.id ?? null}
      />

      {/* Edit transaction modal */}
      <AddEditTransactionModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        transaction={tx}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: 8,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 100,
    minHeight: 44,
    paddingHorizontal: 8,
  },
  backLabel: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 20, color: '#475569', marginLeft: 2 },
  moreBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 16, gap: 16 },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 20,
    alignItems: 'flex-start',
    gap: 8,
  },
  heroIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 20, lineHeight: 26, color: '#0f172a' },
  heroConcept: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 18, color: '#64748b' },
  heroAmount: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    lineHeight: 30,
    fontVariant: ['tabular-nums'],
    marginTop: 4,
  },
  heroDate: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 18, color: '#64748b' },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9999 },
  typeBadgeText: { fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 16 },
  detailsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  detailLabel: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 18, color: '#64748b' },
  detailValue: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 20, color: '#0f172a', textAlign: 'right' },
  detailDivider: { height: 1, backgroundColor: '#f1f5f9', marginHorizontal: 16 },
  deleteBtn: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  deleteBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, lineHeight: 20, color: '#ffffff' },
  // ── Category picker ─────────────────────────────────────────────────────
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)' },
  categorySheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: 480,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    lineHeight: 22,
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 16,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  categoryRowActive: { backgroundColor: '#e0e7ff' },
  categoryRowText: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 20, color: '#0f172a' },
  categoryRowTextActive: { color: '#4f46e5', fontFamily: 'Inter_500Medium' },
  checkDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4f46e5' },
});

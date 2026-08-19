import React, { useCallback, useMemo, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { CreditCard, Banknote, TrendingUp } from 'lucide-react-native';
import { CaretLeft, DotsThreeOutline } from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';
import {
  useArchiveBankAccount,
  useBankAccount,
  useDeleteBankAccount,
  useUnarchiveBankAccount,
} from '../../../src/hooks/useBankAccounts';
import { AddEditBankAccountModal } from '../../../src/components/modals/AddEditBankAccountModal';
import { getBankLogoComponent } from '../../../src/utils/bankLogos';
import { useTransactions, useDeleteTransaction } from '../../../src/hooks/useTransactions';
import { resolveBankAccountName } from '../../../src/utils/displayNames';
import { useCategories } from '../../../src/hooks/useCategories';
import { useUIStore } from '../../../src/stores/uiStore';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useRequireConfirmed } from '../../../src/hooks/useRequireConfirmed';
import { SectionHeader } from '../../../src/components/ui/SectionHeader';
import { TransactionRow, TransactionRowSkeleton } from '../../../src/components/ui/TransactionRow';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { SkeletonBox } from '../../../src/components/ui/SkeletonLoader';
import type { Transaction } from '../../../src/api/transactions';
import type { Category } from '../../../src/api/categories';

// ── Category Picker Modal ─────────────────────────────────────────────────

interface CategoryPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (category: Category) => void;
  categories: Category[];
  selectedId?: number | null;
}

function CategoryPickerModal({ visible, onClose, onSelect, categories, selectedId }: CategoryPickerProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const surface = isDark ? theme.surface : '#ffffff';
  const textPrimary = isDark ? theme.textPrimary : '#0f172a';
  const borderCol = isDark ? theme.border : '#e2e8f0';
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={[styles.categorySheet, { paddingBottom: insets.bottom + 16, backgroundColor: surface }]}>
          <View style={[styles.sheetHandle, { backgroundColor: borderCol }]} />
          <Text style={[styles.sheetTitle, { color: textPrimary }]}>{t('transactions.category_label')}</Text>
          <FlatList
            data={categories}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.categoryRow, item.id === selectedId && styles.categoryRowActive]}
                onPress={() => { onSelect(item); onClose(); }}
              >
                <Text style={[styles.categoryRowText, { color: textPrimary }, item.id === selectedId && styles.categoryRowTextActive]}>
                  {item.name}
                </Text>
                {item.id === selectedId && <View style={styles.checkDot} />}
              </TouchableOpacity>
            )}
            style={{ maxHeight: 360 }}
          />
        </View>
      </View>
    </Modal>
  );
}

// ── Date grouping ──────────────────────────────────────────────────────────

interface Section { title: string; data: Transaction[]; dailyTotal: number }

function groupByDate(transactions: Transaction[]): Section[] {
  const map = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    const existing = map.get(tx.date) ?? [];
    existing.push(tx);
    map.set(tx.date, existing);
  }
  return Array.from(map.entries()).map(([date, data]) => ({
    title: date,
    data,
    dailyTotal: data.reduce((sum, tx) => sum + tx.amount, 0),
  }));
}

// ── Screen ─────────────────────────────────────────────────────────────────

export default function AccountDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const accountId = Number(id);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const locale = useUIStore((s) => s.locale);
  const showToast = useUIStore((s) => s.showToast);
  const openStatementUpload = useUIStore((s) => s.openStatementUpload);
  const resolvedLocale = locale === 'es' ? 'es-MX' : 'en-MX';

  const { theme, isDark } = useTheme();
  const bg = isDark ? theme.background : '#f8fafc';
  const surface = isDark ? theme.surface : '#ffffff';
  const textPrimary = isDark ? theme.textPrimary : '#0f172a';
  const textSecondary = isDark ? theme.textSecondary : '#64748b';
  const borderCol = isDark ? theme.border : '#e2e8f0';
  const dividerCol = isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9';

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showEditAccount, setShowEditAccount] = useState(false);
  const requireConfirmed = useRequireConfirmed();
  const [categorizingTxId, setCategorizingTxId] = useState<number | null>(null);

  const { data: account, isLoading: accountLoading, isError: accountError, refetch: refetchAccount } =
    useBankAccount(accountId);
  const deleteAccountMutation = useDeleteBankAccount();
  const archiveAccountMutation = useArchiveBankAccount();
  const unarchiveAccountMutation = useUnarchiveBankAccount();
  const { data: categoriesData } = useCategories();
  const categories = categoriesData ?? [];

  const {
    data: infiniteData,
    isLoading: txLoading,
    isError: txError,
    refetch: refetchTx,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useTransactions({ bank_account_id: accountId });

  const deleteMutation = useDeleteTransaction();

  const transactions = useMemo(
    () => infiniteData?.pages.flatMap((p) => p.data.transactions) ?? [],
    [infiniteData],
  );
  const sections = useMemo(() => groupByDate(transactions), [transactions]);

  const handleRefresh = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    setIsRefreshing(true);
    try {
      await Promise.all([refetchAccount(), refetchTx()]);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchAccount, refetchTx]);

  const handleDelete = useCallback((txId: number) => {
    setDeletingId(txId);
    deleteMutation.mutate(txId, {
      onSuccess: () => showToast(t('transactions.delete.success'), 'success'),
      onError: () => { showToast(t('transactions.error.title'), 'error'); setDeletingId(null); },
      onSettled: () => setDeletingId(null),
    });
  }, [deleteMutation, showToast, t]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  function handleCategorize(txId: number) {
    setCategorizingTxId(txId);
    setShowCategoryPicker(true);
  }

  async function handleCategorySelect(category: Category) {
    if (!categorizingTxId) return;
    const txId = categorizingTxId;
    setCategorizingTxId(null);
    try {
      const { updateTransaction } = await import('../../../src/api/transactions');
      await updateTransaction(txId, { category_id: category.id });
      refetchTx();
      showToast(t('transactions.category_updated'), 'success');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
    } catch {
      showToast(t('transactions.category_update_error'), 'error');
    }
  }

  function handleArchiveAccount() {
    Alert.alert(
      t('accountDetail.archiveConfirm.title'),
      t('accountDetail.archiveConfirm.message'),
      [
        { text: t('accountDetail.archiveConfirm.cancel'), style: 'cancel' },
        {
          text: t('accountDetail.archiveConfirm.confirm'),
          onPress: async () => {
            try {
              await archiveAccountMutation.mutateAsync(accountId);
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
              showToast(t('accountDetail.archiveSuccess'), 'success');
              router.back();
            } catch {
              showToast(t('accountDetail.archiveError'), 'error');
            }
          },
        },
      ],
    );
  }

  function handleUnarchiveAccount() {
    unarchiveAccountMutation.mutateAsync(accountId)
      .then(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
        showToast(t('accountDetail.unarchiveSuccess'), 'success');
      })
      .catch(() => {
        showToast(t('accountDetail.unarchiveError'), 'error');
      });
  }

  function handleDeleteAccount() {
    const txCount = account?.transactions_count ?? 0;
    Alert.alert(
      t('accountDetail.deleteConfirm.title'),
      txCount > 0
        ? t('accountDetail.deleteConfirm.messageWithTransactions', { count: txCount })
        : t('accountDetail.deleteConfirm.message'),
      [
        { text: t('accountDetail.deleteConfirm.cancel'), style: 'cancel' },
        {
          text: t('accountDetail.deleteConfirm.confirm'),
          style: 'destructive',
          onPress: async () => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => { });
            setIsDeletingAccount(true);
            try {
              await deleteAccountMutation.mutateAsync(accountId);
              showToast(t('accountDetail.deleteSuccess'), 'success');
              router.back();
            } catch {
              showToast(t('accountDetail.deleteError'), 'error');
            } finally {
              setIsDeletingAccount(false);
            }
          },
        },
      ],
    );
  }

  function handleMoreOptions() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    const isArchived = account?.archived ?? false;
    const archiveLabel = isArchived
      ? t('accountDetail.actions.unarchiveAccount')
      : t('accountDetail.actions.archiveAccount');
    const onArchiveToggle = () =>
      requireConfirmed(isArchived ? handleUnarchiveAccount : handleArchiveAccount);

    // Statement upload lives here as well as on the FAB: this is where the user
    // is already looking at the bank the statement belongs to, so the account
    // can be pre-selected.
    const onUploadStatement = () =>
      requireConfirmed(() => openStatementUpload(account ?? undefined));

    if (Platform.OS === 'ios') {
      // Delete is only offered for archived accounts (two-step safety, matches desktop/web).
      const options = isArchived
        ? [
            t('statement_upload.modal_title'),
            t('accountDetail.edit'),
            archiveLabel,
            t('accountDetail.actions.deleteAccount'),
            t('accountDetail.actions.cancel'),
          ]
        : [
            t('statement_upload.modal_title'),
            t('accountDetail.edit'),
            archiveLabel,
            t('accountDetail.actions.cancel'),
          ];
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: isArchived ? 4 : 3,
          destructiveButtonIndex: isArchived ? 3 : undefined,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            onUploadStatement();
          } else if (buttonIndex === 1) {
            requireConfirmed(() => setShowEditAccount(true));
          } else if (buttonIndex === 2) {
            onArchiveToggle();
          } else if (isArchived && buttonIndex === 3) {
            handleDeleteAccount();
          }
        },
      );
    } else {
      const buttons: Parameters<typeof Alert.alert>[2] = [
        { text: t('statement_upload.modal_title'), onPress: onUploadStatement },
        { text: t('accountDetail.edit'), onPress: () => requireConfirmed(() => setShowEditAccount(true)) },
        { text: archiveLabel, onPress: onArchiveToggle },
      ];
      if (isArchived) {
        buttons.push({
          text: t('accountDetail.actions.deleteAccount'),
          style: 'destructive',
          onPress: handleDeleteAccount,
        });
      }
      buttons.push({ text: t('accountDetail.actions.cancel'), style: 'cancel' });
      Alert.alert(t('accountDetail.moreOptions'), undefined, buttons);
    }
  }

  // ── Account type config ────────────────────────────────────────────────
  const typeConfig = {
    debit: { bg: '#dbeafe', iconColor: '#1e40af', Icon: CreditCard, label: t('accounts.types.debit') },
    credit: { bg: '#ede9fe', iconColor: '#5b21b6', Icon: CreditCard, label: t('accounts.types.credit') },
    cash: { bg: '#d1fae5', iconColor: '#065f46', Icon: Banknote, label: t('accounts.types.cash') },
    investment: { bg: '#e0f2fe', iconColor: '#075985', Icon: TrendingUp, label: t('accounts.types.investment') },
  } as const;

  // ── Error ────────────────────────────────────────────────────────────────
  if (accountError || (!accountLoading && !account)) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top, backgroundColor: bg }]}>
        <View style={[styles.navHeader, { backgroundColor: bg }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <CaretLeft size={20} color="#475569" weight="regular" />
            <Text style={styles.backLabel}>{t('accountDetail.back')}</Text>
          </TouchableOpacity>
        </View>
        <EmptyState
          icon="credit-card"
          iconColor="#cbd5e1"
          title={t('accountDetail.empty.notFound.title')}
          ctaLabel={t('accountDetail.empty.notFound.goBack')}
          ctaVariant="secondary"
          onCta={() => router.back()}
          fullScreen
        />
      </View>
    );
  }

  const cfg = account ? (typeConfig[account.account_type] ?? typeConfig.debit) : typeConfig.debit;
  const { Icon } = cfg;

  const fmtBalance = account
    ? new Intl.NumberFormat(resolvedLocale, {
      style: 'currency',
      currency: account.currency,
      minimumFractionDigits: 2,
    }).format(account.balance)
    : '';

  return (
    <View style={[styles.screen, { paddingTop: insets.top, backgroundColor: bg }]}>
      {/* Nav header */}
      <View style={[styles.navHeader, { backgroundColor: bg }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('accountDetail.back')}
        >
          <CaretLeft size={20} color={textPrimary} weight="regular" />
          <Text style={styles.backLabel}>{t('accountDetail.back')}</Text>
        </TouchableOpacity>
        {account && !isDeletingAccount && (
          <TouchableOpacity
            style={styles.moreBtn}
            onPress={handleMoreOptions}
            accessibilityRole="button"
            accessibilityLabel={t('transactionDetail.moreOptions')}
          >
            <DotsThreeOutline size={22} color={textSecondary} weight="regular" />
          </TouchableOpacity>
        )}
        {isDeletingAccount && (
          <ActivityIndicator size="small" color="#4f46e5" style={{ marginRight: 16 }} />
        )}
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        stickySectionHeadersEnabled
        removeClippedSubviews={false}
        ListHeaderComponent={() => (
          <>
            {/* Account header card */}
            {accountLoading ? (
              <View style={styles.accountCard}>
                <View style={styles.cardTopRow}>
                  <SkeletonBox width={48} height={48} borderRadius={12} />
                  <View style={{ flex: 1, marginLeft: 12, gap: 8 }}>
                    <SkeletonBox width={160} height={18} />
                    <SkeletonBox width={100} height={14} />
                  </View>
                </View>
                <SkeletonBox width={140} height={28} style={{ marginTop: 12 }} />
                <SkeletonBox width={200} height={14} style={{ marginTop: 6 }} />
              </View>
            ) : account ? (
              <View
                style={[styles.accountCard, { backgroundColor: surface, borderColor: borderCol }]}
                accessibilityRole="none"
                accessibilityLabel={`${resolveBankAccountName(account, t)}, ${cfg.label} account, balance ${fmtBalance}, ${account.transactions_count} transactions`}
              >
                {/* Account type badge */}
                <View style={[styles.typeBadge, { backgroundColor: cfg.bg, alignSelf: 'flex-end', position: 'absolute', top: 16, right: 16 }]}>
                  <Text style={[styles.typeBadgeText, { color: cfg.iconColor }]}>{cfg.label}</Text>
                </View>
                {/* Top row */}
                <View style={styles.cardTopRow}>
                  {(() => {
                    const Logo = getBankLogoComponent(account.bank_logo_url);
                    if (Logo) {
                      return (
                        <View style={[styles.accountIcon, { backgroundColor: '#ffffff', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }]}>
                          <Logo width={28} height={28} />
                        </View>
                      );
                    }
                    return (
                      <View style={[styles.accountIcon, { backgroundColor: cfg.bg }]}>
                        <Icon size={24} color={cfg.iconColor} />
                      </View>
                    );
                  })()}
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.accountName, { color: textPrimary }]} numberOfLines={2}>
                      {resolveBankAccountName(account, t)}
                    </Text>
                    <Text style={[styles.bankName, { color: textSecondary }]}>{account.bank_name}</Text>
                  </View>
                </View>
                {/* Balance */}
                <Text
                  style={[
                    styles.balanceText,
                    { color: textPrimary },
                    account.balance < 0 && { color: '#e11d48' },
                  ]}
                >
                  {fmtBalance}
                </Text>
                <Text style={[styles.metaText, { color: textSecondary }]}>
                  {account.currency} · {cfg.label} · {account.transactions_count} {t('accountDetail.sections.transactions').toLowerCase()}
                </Text>
              </View>
            ) : null}

            {/* Transactions section header */}
            <View style={styles.txSectionRow}>
              <Text style={[styles.txSectionLabel, { color: textSecondary }]}>
                {t('accountDetail.sections.transactions').toUpperCase()}
              </Text>
            </View>
          </>
        )}
        renderSectionHeader={({ section }) => (
          <SectionHeader
            dateKey={section.title}
            transactionCount={section.data.length}
            currency="MXN"
          />
        )}
        renderItem={({ item }) => (
          <TransactionRow
            {...item}
            onPress={() => router.push(`/(app)/transactions/${item.id}` as `/(app)/transactions/${string}`)}
            onDelete={handleDelete}
            onCategorize={handleCategorize}
            showAccountName={false}
            enableSwipeActions
            isDeleting={deletingId === item.id}
          />
        )}
        ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: dividerCol }]} />}
        SectionSeparatorComponent={() => <View style={{ height: 8 }} />}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          txLoading ? (
            <View>
              {[1, 2, 3, 4, 5].map((i) => (
                <React.Fragment key={i}>
                  <TransactionRowSkeleton />
                  {i < 5 && <View style={styles.separator} />}
                </React.Fragment>
              ))}
            </View>
          ) : txError ? (
            <EmptyState
              icon="wifi-off"
              iconColor="#cbd5e1"
              title={t('transactions.error.title')}
              ctaLabel={t('transactions.error.retry')}
              ctaVariant="secondary"
              onCta={() => refetchTx()}
              fullScreen
            />
          ) : (
            <EmptyState
              icon="receipt"
              iconColor="#c7d2fe"
              title={t('accountDetail.empty.noTransactions.title')}
              subtitle={t('accountDetail.empty.noTransactions.subtitle')}
              fullScreen
            />
          )
        }
        ListFooterComponent={() =>
          isFetchingNextPage ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color="#4f46e5" />
            </View>
          ) : !hasNextPage && transactions.length > 0 ? (
            <View style={styles.footer}>
              <Text style={styles.allCaughtUp}>{t('transactions.allCaughtUp')}</Text>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#4f46e5"
          />
        }
        contentContainerStyle={{ paddingBottom: 32 + insets.bottom }}
      />

      {/* Category picker (for swipe-to-categorize) */}
      <CategoryPickerModal
        visible={showCategoryPicker}
        onClose={() => { setShowCategoryPicker(false); setCategorizingTxId(null); }}
        onSelect={handleCategorySelect}
        categories={categories}
      />

      {/* Edit account modal */}
      <AddEditBankAccountModal
        visible={showEditAccount}
        onClose={() => setShowEditAccount(false)}
        account={account}
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
  accountCard: {
    margin: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 20,
    minHeight: 120,
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'flex-start' },
  accountIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  accountName: { fontFamily: 'Inter_600SemiBold', fontSize: 17, lineHeight: 22, color: '#0f172a' },
  bankName: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 18, color: '#64748b', marginTop: 2 },
  balanceText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    lineHeight: 30,
    color: '#0f172a',
    fontVariant: ['tabular-nums'],
    marginTop: 12,
  },
  metaText: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 16, color: '#64748b', marginTop: 4 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9999 },
  typeBadgeText: { fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 16 },
  txSectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 36,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  txSectionLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    lineHeight: 18,
    color: '#64748b',
    letterSpacing: 0.65,
  },
  separator: { height: 1, backgroundColor: '#f1f5f9' },
  footer: { height: 40, alignItems: 'center', justifyContent: 'center' },
  allCaughtUp: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 16, color: '#94a3b8' },
  // ── Category picker ───────────────────────────────────────────────────────
  modalContainer: { flex: 1, justifyContent: 'flex-end' },
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

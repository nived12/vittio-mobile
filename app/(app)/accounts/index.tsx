import React, { useCallback, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Plus, PlusCircle, ChevronRight, CreditCard, Banknote } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useBankAccounts } from '../../../src/hooks/useBankAccounts';
import { AddEditBankAccountModal } from '../../../src/components/modals/AddEditBankAccountModal';
import { useUIStore } from '../../../src/stores/uiStore';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { SkeletonBox } from '../../../src/components/ui/SkeletonLoader';
import type { BankAccount } from '../../../src/api/bankAccounts';

// ── Account icon config ────────────────────────────────────────────────────

const accountTypeConfig = {
  debit:  { bg: '#dbeafe', iconColor: '#1e40af', Icon: CreditCard },
  credit: { bg: '#ede9fe', iconColor: '#5b21b6', Icon: CreditCard },
  cash:   { bg: '#d1fae5', iconColor: '#065f46', Icon: Banknote },
} as const;

// ── Account row ────────────────────────────────────────────────────────────

function AccountRow({ account, locale }: { account: BankAccount; locale: string }) {
  const { t } = useTranslation();
  const config = accountTypeConfig[account.account_type] ?? accountTypeConfig.debit;
  const { Icon } = config;

  const typeLabel =
    account.account_type === 'debit' ? t('accounts.types.debit') :
    account.account_type === 'credit' ? t('accounts.types.credit') :
    t('accounts.types.cash');

  const fmtBalance = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: account.currency,
    minimumFractionDigits: 2,
  }).format(account.balance);

  return (
    <TouchableOpacity
      style={styles.accountRow}
      onPress={() => router.push(`/(app)/accounts/${account.id}` as `/(app)/accounts/${string}`)}
      accessibilityRole="button"
      accessibilityLabel={`${account.custom_name ?? account.name}, ${typeLabel} account, balance ${fmtBalance}`}
    >
      {/* Icon */}
      <View style={[styles.accountIcon, { backgroundColor: config.bg }]}>
        <Icon size={20} color={config.iconColor} />
      </View>
      {/* Text */}
      <View style={styles.accountCenter}>
        <Text style={styles.accountName} numberOfLines={1}>
          {account.custom_name ?? account.name}
        </Text>
        <Text style={styles.accountMeta}>
          {typeLabel} · {account.currency}
        </Text>
      </View>
      {/* Balance + chevron */}
      <View style={styles.accountRight}>
        <Text
          style={[
            styles.accountBalance,
            account.balance < 0 && { color: '#e11d48' },
            account.balance === 0 && { color: '#94a3b8' },
          ]}
        >
          {fmtBalance}
        </Text>
        <ChevronRight size={16} color="#cbd5e1" />
      </View>
    </TouchableOpacity>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────

export default function AccountsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const locale = useUIStore((s) => s.locale);
  const resolvedLocale = locale === 'es' ? 'es-MX' : 'en-MX';
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const { data: accounts, isLoading, isError, refetch } = useBankAccounts();

  const handleRefresh = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setIsRefreshing(true);
    try {
      await refetch();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  const totalBalance = (accounts ?? []).reduce((sum, a) => sum + a.balance, 0);

  const fmtTotal = new Intl.NumberFormat(resolvedLocale, {
    style: 'currency',
    currency: accounts?.[0]?.currency ?? 'MXN',
    minimumFractionDigits: 2,
  }).format(totalBalance);

  if (isError && !accounts) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.navHeader}>
          <Text style={styles.navTitle}>{t('accounts.title')}</Text>
        </View>
        <EmptyState
          icon="wifi-off"
          iconColor="#cbd5e1"
          title={t('accounts.error.title')}
          ctaLabel={t('accounts.error.retry')}
          ctaVariant="secondary"
          onCta={() => refetch()}
          fullScreen
        />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Nav header */}
      <View style={styles.navHeader}>
        <Text style={styles.navTitle} accessibilityRole="header">{t('accounts.title')}</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowAddModal(true)}
          accessibilityRole="button"
          accessibilityLabel={t('accounts.addButton')}
        >
          <Plus size={20} color="#4f46e5" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 32 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#4f46e5"
          />
        }
      >
        {/* Net worth card */}
        {isLoading ? (
          <View style={styles.netWorthCard}>
            <SkeletonBox width={80} height={14} />
            <SkeletonBox width={160} height={24} style={{ marginTop: 6 }} />
            <SkeletonBox width={60} height={14} style={{ marginTop: 6 }} />
          </View>
        ) : (accounts?.length ?? 0) > 0 ? (
          <View
            style={styles.netWorthCard}
            accessibilityRole="summary"
            accessibilityLabel={`${t('accounts.totalBalance')}: ${fmtTotal} across ${accounts!.length} accounts`}
          >
            <View style={{ justifyContent: 'space-between', flexDirection: 'row', alignItems: 'flex-end' }}>
              <View>
                <Text style={styles.netWorthLabel}>{t('accounts.totalBalance')}</Text>
                <Text
                  style={[
                    styles.netWorthAmount,
                    totalBalance < 0 && { color: '#e11d48' },
                  ]}
                >
                  {fmtTotal}
                </Text>
              </View>
              <Text style={styles.accountCount}>
                {t('accounts.accountCount', { count: accounts!.length })}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Accounts list */}
        {isLoading ? (
          <View style={styles.accountsCard}>
            {[1, 2, 3].map((i) => (
              <React.Fragment key={i}>
                <View style={styles.accountRowSkeleton}>
                  <SkeletonBox width={40} height={40} borderRadius={12} />
                  <View style={{ flex: 1, marginLeft: 12, gap: 8 }}>
                    <SkeletonBox width="60%" height={15} />
                    <SkeletonBox width="40%" height={12} />
                  </View>
                  <SkeletonBox width={80} height={15} />
                </View>
                {i < 3 && <View style={styles.separator} />}
              </React.Fragment>
            ))}
          </View>
        ) : (accounts?.length ?? 0) === 0 ? (
          <EmptyState
            icon="credit-card"
            iconColor="#c7d2fe"
            title={t('accounts.empty.title')}
            subtitle={t('accounts.empty.subtitle')}
            ctaLabel={t('accounts.empty.cta')}
            ctaVariant="primary"
            onCta={() => setShowAddModal(true)}
            fullScreen
          />
        ) : (
          <View style={styles.accountsCard}>
            {accounts!.map((account, idx) => (
              <React.Fragment key={account.id}>
                <AccountRow account={account} locale={resolvedLocale} />
                {idx < accounts!.length - 1 && <View style={styles.separator} />}
              </React.Fragment>
            ))}
          </View>
        )}

        {/* Add account CTA */}
        {(accounts?.length ?? 0) > 0 && (
          <TouchableOpacity
            style={styles.addAccountCard}
            onPress={() => setShowAddModal(true)}
            accessibilityRole="button"
            accessibilityLabel={t('accounts.addButton')}
          >
            <PlusCircle size={20} color="#818cf8" />
            <Text style={styles.addAccountText}>{t('accounts.addButton')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <AddEditBankAccountModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
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
    paddingHorizontal: 16,
  },
  navTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 20, lineHeight: 26, color: '#0f172a' },
  addBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 16, gap: 16 },
  netWorthCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 20,
    minHeight: 90,
    justifyContent: 'center',
  },
  netWorthLabel: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 16, color: '#64748b' },
  netWorthAmount: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 20,
    lineHeight: 26,
    color: '#0f172a',
    fontVariant: ['tabular-nums'],
    marginTop: 4,
  },
  accountCount: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 16, color: '#64748b' },
  accountsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 72,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  accountIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountCenter: { flex: 1, marginLeft: 12 },
  accountName: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 20, color: '#0f172a' },
  accountMeta: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 16, color: '#64748b', marginTop: 2 },
  accountRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  accountBalance: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    lineHeight: 22,
    color: '#0f172a',
    fontVariant: ['tabular-nums'],
  },
  separator: { height: 1, backgroundColor: '#f1f5f9', marginHorizontal: 16 },
  addAccountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#c7d2fe',
    gap: 8,
  },
  addAccountText: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 20, color: '#4f46e5' },
  accountRowSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 72,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});

import React, { useCallback, useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ChevronDown, Check } from 'lucide-react-native';
import { resolveBankAccountName } from '../../src/utils/displayNames';
import { format, parseISO } from 'date-fns';
import { enUS, es } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { useDashboard } from '../../src/hooks/useDashboard';
import type { DashboardTransaction } from '../../src/api/dashboard';
import { useUIStore } from '../../src/stores/uiStore';
import { useAuth } from '../../src/hooks/useAuth';
import { useTheme } from '../../src/theme/ThemeContext';
import { AvatarCircle } from '../../src/components/AvatarCircle';
import { ProfileBottomSheet } from '../../src/components/modals/ProfileBottomSheet';
import { BalanceCard } from '../../src/components/ui/BalanceCard';
import { ChartBar } from '../../src/components/ui/ChartBar';
import { TransactionRow, TransactionRowSkeleton } from '../../src/components/ui/TransactionRow';
import { EmptyState } from '../../src/components/ui/EmptyState';
import {
  AccountChipSkeleton,
  BalanceCardSkeleton,
  ChartBarSkeleton,
} from '../../src/components/ui/SkeletonLoader';

// ── Module-scope formatter cache (Intl.NumberFormat is expensive on Hermes) ──

const currencyFmtCache = new Map<string, Intl.NumberFormat>();
function getCurrencyFmt(locale: string, currency: string): Intl.NumberFormat {
  const key = `${locale}_${currency}`;
  let fmt = currencyFmtCache.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    });
    currencyFmtCache.set(key, fmt);
  }
  return fmt;
}

const ACCOUNT_DOT_COLORS: Record<string, string> = {
  debit: '#0ea5e9',
  credit: '#8b5cf6',
  cash: '#10b981',
};

interface RecentTransactionsListProps {
  transactions: DashboardTransaction[];
  isLoading: boolean;
  surface: string;
  borderCol: string;
  dividerCol: string;
}

const RecentTransactionsList = React.memo(function RecentTransactionsList({
  transactions,
  isLoading,
  surface,
  borderCol,
  dividerCol,
}: RecentTransactionsListProps) {
  const { t } = useTranslation();
  return (
    <View style={[styles.card, { padding: 0, overflow: 'hidden', backgroundColor: surface, borderColor: borderCol }]}>
      {isLoading ? (
        [1, 2, 3, 4, 5].map((i) => (
          <React.Fragment key={i}>
            <TransactionRowSkeleton />
            {i < 5 && <View style={styles.separator} />}
          </React.Fragment>
        ))
      ) : transactions.length === 0 ? (
        <EmptyState
          icon="receipt"
          iconSize={48}
          iconColor="#c7d2fe"
          title={t('dashboard.transactionsEmpty.title')}
          subtitle={t('dashboard.transactionsEmpty.subtitle')}
          topPadding={8}
        />
      ) : (
        transactions.map((tx, idx) => (
          <React.Fragment key={tx.id}>
            <TransactionRow
              {...tx}
              onPress={() => router.push(`/(app)/transactions/${tx.id}` as `/(app)/transactions/${string}`)}
              showAccountName
              enableSwipeActions={false}
            />
            {idx < transactions.length - 1 && (
              <View style={[styles.separator, { backgroundColor: dividerCol }]} />
            )}
          </React.Fragment>
        ))
      )}
    </View>
  );
});

export default function DashboardScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { user } = useAuth();
  const locale = useUIStore((s) => s.locale);
  const selectedMonth = useUIStore((s) => s.selectedMonth);
  const setSelectedMonth = useUIStore((s) => s.setSelectedMonth);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const initials   = [user?.first_name?.[0], user?.last_name?.[0]].filter(Boolean).join('').toUpperCase() || '?';
  const isPremium  = user?.subscription_status === 'active';

  const { data, isLoading, isError, refetch } = useDashboard(selectedMonth);
  const cardWidth = width - 32;
  const { theme, isDark } = useTheme();
  const bg = theme.background;
  const surface = theme.surface;
  const textPrimary = theme.textPrimary;
  const textSecondary = theme.textSecondary;
  const borderCol = theme.border;
  const dividerCol = isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9';

  const handleRefresh = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    setIsRefreshing(true);
    try {
      await refetch();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  const resolvedLocale = locale === 'es' ? 'es-MX' : 'en-MX';

  const renderAccountChip = useCallback(({ item }: { item: { id: number; account_type: string; bank_name: string; balance: number; currency: string } }) => {
    const dotColor = ACCOUNT_DOT_COLORS[item.account_type] ?? '#94a3b8';
    return (
      <TouchableOpacity
        onPress={() => router.push(`/(app)/accounts/${item.id}` as `/(app)/accounts/${string}`)}
        style={[styles.accountChip, { backgroundColor: surface, borderColor: borderCol }]}
        accessibilityRole="button"
        accessibilityLabel={`${item.bank_name}, ${item.account_type}, balance ${item.balance}`}
        activeOpacity={0.8}
      >
        <View style={styles.chipTopRow}>
          <View style={[styles.typeDot, { backgroundColor: dotColor }]} />
          <Text style={[styles.chipName, { color: textSecondary }]} numberOfLines={1}>
            {resolveBankAccountName(item, t)}
          </Text>
        </View>
        <Text
          style={[
            styles.chipBalance,
            { color: textPrimary },
            item.balance < 0 && { color: '#e11d48' },
            item.balance === 0 && { color: '#94a3b8' },
          ]}
        >
          {getCurrencyFmt(resolvedLocale, item.currency).format(item.balance)}
        </Text>
      </TouchableOpacity>
    );
  }, [surface, borderCol, textSecondary, textPrimary, resolvedLocale, t]);

  const monthLabel = useMemo(() => {
    const dateFnsLocale = locale === 'es' ? es : enUS;
    return data?.summary.selected_month
      ? format(parseISO(data.summary.selected_month + '-01'), 'MMMM yyyy', { locale: dateFnsLocale })
      : format(new Date(), 'MMMM yyyy', { locale: dateFnsLocale });
  }, [locale, data?.summary.selected_month]);

  if (isError && !data) {
    return (
      <View style={[styles.errorContainer, { paddingTop: insets.top + 16, backgroundColor: bg }]}>
        <EmptyState
          icon="wifi-off"
          iconColor="#cbd5e1"
          title={t('dashboard.error.title')}
          subtitle={t('dashboard.error.subtitle')}
          ctaLabel={t('dashboard.error.retry')}
          ctaVariant="primary"
          onCta={() => refetch()}
          fullScreen
        />
      </View>
    );
  }

  const { chartCategories, maxCategoryAmount } = useMemo(() => {
    const rawCategories = data?.category_summary.categories ?? [];
    const topCategories = rawCategories.slice(0, 5);
    const otherCategories = rawCategories.slice(5);
    const otherSum = otherCategories.reduce((sum, c) => sum + c.amount, 0);
    const cats = [
      ...topCategories,
      ...(otherSum > 0
        ? [{ id: null as number | null, name: t('dashboard.chart.other'), icon: 'more-horizontal' as string | null, amount: otherSum }]
        : []),
    ];
    const max = cats.length > 0 ? Math.max(...cats.map((c) => c.amount), 1) : 1;
    return { chartCategories: cats, maxCategoryAmount: max };
  }, [data?.category_summary.categories, t]);

  return (
    <>
      <ScrollView
        style={[styles.screen, { paddingTop: insets.top, backgroundColor: bg }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#4f46e5"
          />
        }
      >
        {/* Top bar: logo centered; spacer balances avatar width */}
        <View style={styles.topBar}>
          <View style={styles.topBarSide} />
          <View style={styles.topBarLogoWrap}>
            <Image
              source={
                isDark
                  ? require('../../assets/images/vittio_logo_dark_bg.png')
                  : require('../../assets/images/vittio_logo.png')
              }
              style={[
                styles.logo,
                {
                  width: Math.min(width - 72, Math.min(width * 0.66, 420)),
                  height: 80,
                },
              ]}
              contentFit="contain"
            />
          </View>
          <View style={styles.topBarSide}>
            <AvatarCircle initials={initials} onPress={() => setShowProfile(true)} isPremium={isPremium} avatarUrl={user?.avatar_url} />
          </View>
        </View>

        {/* Month picker row */}
        <TouchableOpacity
          onPress={() => setShowMonthPicker(true)}
          style={styles.monthPickerRow}
          accessibilityRole="button"
          accessibilityLabel={`${t('dashboard.monthPicker.label')}: ${monthLabel}, tap to change`}
        >
          <Text style={[styles.monthPickerText, { color: textPrimary }]}>{monthLabel}</Text>
          <ChevronDown size={16} color="#94a3b8" />
        </TouchableOpacity>

        {/* Balance card */}
        <View style={styles.sectionPad}>
          {isLoading ? (
            <BalanceCardSkeleton width={cardWidth} />
          ) : (
            <BalanceCard
              totalBalance={data?.summary.total_balance ?? 0}
              totalIncome={data?.monthly_summary.total_income ?? 0}
              totalExpenses={data?.monthly_summary.total_expenses ?? 0}
              netIncome={data?.monthly_summary.net_income ?? 0}
              currency={data?.bank_accounts?.[0]?.currency ?? 'MXN'}
              selectedMonth={monthLabel}
              locale={resolvedLocale}
            />
          )}
        </View>

        {/* Accounts */}
        <View style={styles.sectionGap}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>{t('dashboard.sections.accounts')}</Text>
            <TouchableOpacity
              onPress={() => router.navigate('/(app)/accounts')}
              accessibilityLabel={`${t('dashboard.sections.seeAll')} accounts`}
              style={styles.seeAllBtn}
            >
              <Text style={styles.seeAllText}>{t('dashboard.sections.seeAll')} →</Text>
            </TouchableOpacity>
          </View>
          {isLoading ? (
            <FlatList
              horizontal
              data={[1, 2] as number[]}
              keyExtractor={(i) => String(i)}
              renderItem={() => <AccountChipSkeleton />}
              ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
              contentContainerStyle={{ paddingHorizontal: 16 }}
              showsHorizontalScrollIndicator={false}
              scrollEnabled={false}
            />
          ) : (data?.bank_accounts?.length ?? 0) === 0 ? (
            <View style={[styles.inlineCard, { backgroundColor: surface, borderColor: borderCol }]}>
              <EmptyState
                icon="credit-card"
                iconSize={48}
                iconColor="#c7d2fe"
                title={t('dashboard.accountsEmpty.title')}
                subtitle={t('dashboard.accountsEmpty.subtitle')}
                ctaLabel={t('dashboard.accountsEmpty.cta')}
                ctaVariant="primary"
                onCta={() => router.navigate('/(app)/accounts')}
                topPadding={8}
              />
            </View>
          ) : (
            <FlatList
              horizontal
              data={data!.bank_accounts}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderAccountChip}
              ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
              contentContainerStyle={{ paddingHorizontal: 16 }}
              showsHorizontalScrollIndicator={false}
              removeClippedSubviews
              initialNumToRender={5}
              maxToRenderPerBatch={5}
            />
          )}
        </View>

        {/* Spending chart */}
        <View style={styles.sectionGap}>
          <Text style={[styles.sectionTitle, styles.sectionTitlePad, { color: textPrimary }]}>
            {t('dashboard.sections.spending')}
          </Text>
          <View style={[styles.card, { backgroundColor: surface, borderColor: borderCol }]}>
            {isLoading ? (
              [1, 2, 3, 4].map((i) => <ChartBarSkeleton key={i} />)
            ) : !data?.category_summary.has_data ? (
              <EmptyState
                icon="chart-bar"
                iconSize={48}
                iconColor="#c7d2fe"
                title={t('dashboard.categoryEmpty.title')}
                subtitle={t('dashboard.categoryEmpty.subtitle')}
                topPadding={8}
              />
            ) : (
              chartCategories.map((cat, idx) => (
                <ChartBar
                  key={cat.id ?? 'other'}
                  label={cat.name}
                  icon={cat.icon ?? 'tag'}
                  amount={cat.amount}
                  value={cat.amount}
                  maxValue={maxCategoryAmount}
                  index={idx}
                  locale={resolvedLocale}
                />
              ))
            )}
          </View>
        </View>

        {/* Recent transactions */}
        <View style={styles.sectionGap}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>{t('dashboard.sections.recentTransactions')}</Text>
            <TouchableOpacity
              onPress={() => router.navigate('/(app)/transactions')}
              accessibilityLabel={`${t('dashboard.sections.seeAll')} transactions`}
              style={styles.seeAllBtn}
            >
              <Text style={styles.seeAllText}>{t('dashboard.sections.seeAll')} →</Text>
            </TouchableOpacity>
          </View>
          <RecentTransactionsList
            transactions={data?.recent_transactions ?? []}
            isLoading={isLoading}
            surface={surface}
            borderCol={borderCol}
            dividerCol={dividerCol}
          />
        </View>

        <View style={{ height: 32 + insets.bottom }} />
      </ScrollView>

      <ProfileBottomSheet visible={showProfile} onClose={() => setShowProfile(false)} />

      {/* Month Picker Modal */}
      <Modal
        visible={showMonthPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMonthPicker(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowMonthPicker(false)}
          />
          <View style={[styles.monthSheet, { paddingBottom: insets.bottom + 16, backgroundColor: surface }]}>
            <View style={[styles.sheetHandle, { backgroundColor: borderCol }]} />
            <Text style={[styles.sheetTitle, { color: textPrimary }]}>{t('dashboard.monthPicker.label')}</Text>
            <FlatList
              data={data?.available_months ?? []}
              keyExtractor={(item) => item.value}
              style={{ maxHeight: Math.min(height * 0.45, 360) }}
              renderItem={({ item }) => {
                const isSelected = item.value === (data?.summary.selected_month ?? selectedMonth);
                return (
                  <TouchableOpacity
                    style={styles.monthRow}
                    onPress={() => {
                      setSelectedMonth(item.value);
                      setShowMonthPicker(false);
                    }}
                  >
                    <Text style={[styles.monthRowText, { color: textPrimary }, isSelected && styles.monthRowActive]}>
                      {item.label}
                    </Text>
                    {isSelected && <Check size={16} color="#4f46e5" />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { paddingBottom: 16 },
  errorContainer: { flex: 1, backgroundColor: '#f8fafc' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    minHeight: 76,
    paddingVertical: 6,
  },
  topBarSide: {
    width: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarLogoWrap: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    flexShrink: 1,
  },
  monthPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingBottom: 8,
    minHeight: 36,
  },
  monthPickerText: { fontFamily: 'Inter_600SemiBold', fontSize: 17, lineHeight: 22, color: '#0f172a', flexShrink: 1 },
  sectionPad: { paddingHorizontal: 16, marginTop: 4 },
  sectionGap: { marginTop: 24 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 17, lineHeight: 22, color: '#0f172a' },
  sectionTitlePad: { paddingHorizontal: 16, marginBottom: 8 },
  seeAllBtn: { minHeight: 44, justifyContent: 'center' },
  seeAllText: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 18, color: '#4f46e5' },
  accountChip: {
    width: 160,
    minHeight: 80,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 12,
    justifyContent: 'space-between',
  },
  chipTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  typeDot: { width: 8, height: 8, borderRadius: 4 },
  chipName: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 18, color: '#334155', flex: 1 },
  chipBalance: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    lineHeight: 22,
    color: '#0f172a',
    fontVariant: ['tabular-nums'],
    marginTop: 4,
  },
  card: {
    marginHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
  },
  inlineCard: {
    marginHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  separator: { height: 1, backgroundColor: '#f1f5f9' },
  modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.4)' },
  monthSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
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
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 52,
    paddingHorizontal: 8,
  },
  monthRowText: { fontFamily: 'Inter_400Regular', fontSize: 16, lineHeight: 22, color: '#0f172a' },
  monthRowActive: { color: '#4f46e5', fontFamily: 'Inter_600SemiBold' },
});

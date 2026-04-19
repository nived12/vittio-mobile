import React, { useCallback, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
  Modal,
  Image,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ChevronDown, Check, LogOut, Globe } from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { enUS, es } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import i18n from '../../src/i18n';
import { useDashboard } from '../../src/hooks/useDashboard';
import { useUIStore } from '../../src/stores/uiStore';
import { useAuth } from '../../src/hooks/useAuth';
import { BalanceCard } from '../../src/components/ui/BalanceCard';
import { ChartBar } from '../../src/components/ui/ChartBar';
import { TransactionRow, TransactionRowSkeleton } from '../../src/components/ui/TransactionRow';
import { EmptyState } from '../../src/components/ui/EmptyState';
import {
  AccountChipSkeleton,
  BalanceCardSkeleton,
  ChartBarSkeleton,
} from '../../src/components/ui/SkeletonLoader';

function AvatarCircle({ initials, onPress }: { initials: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.avatarCircle} accessibilityRole="button">
      <Text style={styles.avatarInitials}>{initials}</Text>
    </TouchableOpacity>
  );
}

function ProfileSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const locale = useUIStore((s) => s.locale);
  const setLocale = useUIStore((s) => s.setLocale);

  function handleLogout() {
    Alert.alert(t('profile.logout'), t('profile.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.logout'), style: 'destructive',
        onPress: async () => { onClose(); await logout(); },
      },
    ]);
  }

  function toggleLocale() {
    const next = locale === 'es' ? 'en' : 'es';
    setLocale(next);
    i18n.changeLanguage(next);
  }

  const initials = [user?.first_name?.[0], user?.last_name?.[0]].filter(Boolean).join('').toUpperCase() || '?';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose} />
      <View style={[styles.profileSheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.sheetHandle} />
        <View style={styles.profileHeader}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{[user?.first_name, user?.last_name].filter(Boolean).join(' ')}</Text>
            <Text style={styles.profileEmail}>{user?.email ?? ''}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.profileRow} onPress={toggleLocale}>
          <Globe size={20} color="#64748b" />
          <Text style={styles.profileRowText}>{locale === 'es' ? 'Switch to English' : 'Cambiar a Español'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.profileRow, { marginTop: 8 }]} onPress={handleLogout}>
          <LogOut size={20} color="#e11d48" />
          <Text style={[styles.profileRowText, { color: '#e11d48' }]}>{t('profile.logout')}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

export default function DashboardScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const locale = useUIStore((s) => s.locale);
  const selectedMonth = useUIStore((s) => s.selectedMonth);
  const setSelectedMonth = useUIStore((s) => s.setSelectedMonth);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const initials = [user?.first_name?.[0], user?.last_name?.[0]].filter(Boolean).join('').toUpperCase() || '?';

  const { data, isLoading, isError, refetch } = useDashboard(selectedMonth);
  const cardWidth = width - 32;

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

  const dateFnsLocale = locale === 'es' ? es : enUS;
  const monthLabel = data?.summary.selected_month
    ? format(parseISO(data.summary.selected_month + '-01'), 'MMMM yyyy', { locale: dateFnsLocale })
    : format(new Date(), 'MMMM yyyy', { locale: dateFnsLocale });

  if (isError && !data) {
    return (
      <View style={[styles.errorContainer, { paddingTop: insets.top + 16 }]}>
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

  const rawCategories = data?.category_summary.categories ?? [];
  const topCategories = rawCategories.slice(0, 5);
  const otherCategories = rawCategories.slice(5);
  const otherSum = otherCategories.reduce((sum, c) => sum + c.amount, 0);
  const chartCategories = [
    ...topCategories,
    ...(otherSum > 0
      ? [{ id: null as number | null, name: t('dashboard.chart.other'), icon: 'more-horizontal' as string | null, amount: otherSum }]
      : []),
  ];
  const maxCategoryAmount = Math.max(...chartCategories.map((c) => c.amount), 1);

  return (
    <>
      <ScrollView
        style={[styles.screen, { paddingTop: insets.top }]}
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
        {/* Top bar: logo + avatar */}
        <View style={styles.topBar}>
          <Image
            source={require('../../assets/images/vittio_logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <AvatarCircle initials={initials} onPress={() => setShowProfile(true)} />
        </View>

        {/* Month picker row */}
        <TouchableOpacity
          onPress={() => setShowMonthPicker(true)}
          style={styles.monthPickerRow}
          accessibilityRole="button"
          accessibilityLabel={`${t('dashboard.monthPicker.label')}: ${monthLabel}, tap to change`}
        >
          <Text style={styles.monthPickerText}>{monthLabel}</Text>
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
              locale={locale === 'es' ? 'es-MX' : 'en-MX'}
            />
          )}
        </View>

        {/* Accounts */}
        <View style={styles.sectionGap}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{t('dashboard.sections.accounts')}</Text>
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
            <View style={styles.inlineCard}>
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
              ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
              contentContainerStyle={{ paddingHorizontal: 16 }}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => {
                const dotColors: Record<string, string> = { debit: '#0ea5e9', credit: '#8b5cf6', cash: '#10b981' };
                const dotColor = dotColors[item.account_type] ?? '#94a3b8';
                const resolvedLocale = locale === 'es' ? 'es-MX' : 'en-MX';
                return (
                  <TouchableOpacity
                    onPress={() => router.push(`/(app)/accounts/${item.id}` as `/(app)/accounts/${string}`)}
                    style={styles.accountChip}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.bank_name}, ${item.account_type}, balance ${item.balance}`}
                    activeOpacity={0.8}
                  >
                    <View style={styles.chipTopRow}>
                      <View style={[styles.typeDot, { backgroundColor: dotColor }]} />
                      <Text style={styles.chipName} numberOfLines={1}>
                        {item.custom_name ?? item.name}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.chipBalance,
                        item.balance < 0 && { color: '#e11d48' },
                        item.balance === 0 && { color: '#94a3b8' },
                      ]}
                    >
                      {new Intl.NumberFormat(resolvedLocale, {
                        style: 'currency',
                        currency: item.currency,
                        minimumFractionDigits: 2,
                      }).format(item.balance)}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>

        {/* Spending chart */}
        <View style={styles.sectionGap}>
          <Text style={[styles.sectionTitle, styles.sectionTitlePad]}>
            {t('dashboard.sections.spending')}
          </Text>
          <View style={styles.card}>
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
                  locale={locale === 'es' ? 'es-MX' : 'en-MX'}
                />
              ))
            )}
          </View>
        </View>

        {/* Recent transactions */}
        <View style={styles.sectionGap}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{t('dashboard.sections.recentTransactions')}</Text>
            <TouchableOpacity
              onPress={() => router.navigate('/(app)/transactions')}
              accessibilityLabel={`${t('dashboard.sections.seeAll')} transactions`}
              style={styles.seeAllBtn}
            >
              <Text style={styles.seeAllText}>{t('dashboard.sections.seeAll')} →</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.card, { padding: 0, overflow: 'hidden' }]}>
            {isLoading ? (
              [1, 2, 3, 4, 5].map((i) => (
                <React.Fragment key={i}>
                  <TransactionRowSkeleton />
                  {i < 5 && <View style={styles.separator} />}
                </React.Fragment>
              ))
            ) : (data?.recent_transactions?.length ?? 0) === 0 ? (
              <EmptyState
                icon="receipt"
                iconSize={48}
                iconColor="#c7d2fe"
                title={t('dashboard.transactionsEmpty.title')}
                subtitle={t('dashboard.transactionsEmpty.subtitle')}
                topPadding={8}
              />
            ) : (
              data!.recent_transactions.map((tx, idx) => (
                <React.Fragment key={tx.id}>
                  <TransactionRow
                    {...tx}
                    onPress={() => router.push(`/(app)/transactions/${tx.id}` as `/(app)/transactions/${string}`)}
                    showAccountName
                    enableSwipeActions={false}
                  />
                  {idx < data!.recent_transactions.length - 1 && (
                    <View style={styles.separator} />
                  )}
                </React.Fragment>
              ))
            )}
          </View>
        </View>

        <View style={{ height: 32 + insets.bottom }} />
      </ScrollView>

      <ProfileSheet visible={showProfile} onClose={() => setShowProfile(false)} />

      {/* Month Picker Modal */}
      <Modal
        visible={showMonthPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMonthPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowMonthPicker(false)}
        />
        <View style={[styles.monthSheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{t('dashboard.monthPicker.label')}</Text>
          <FlatList
            data={data?.available_months ?? []}
            keyExtractor={(item) => item.value}
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
                  <Text style={[styles.monthRowText, isSelected && styles.monthRowActive]}>
                    {item.label}
                  </Text>
                  {isSelected && <Check size={16} color="#4f46e5" />}
                </TouchableOpacity>
              );
            }}
          />
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
    paddingHorizontal: 16,
    height: 56,
  },
  logo: { height: 28, width: 100 },
  avatarCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#fff' },
  monthPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingBottom: 8,
    minHeight: 36,
  },
  monthPickerText: { fontFamily: 'Inter_600SemiBold', fontSize: 17, lineHeight: 22, color: '#0f172a' },
  profileSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
  },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  profileAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center' },
  profileAvatarText: { fontFamily: 'Inter_600SemiBold', fontSize: 18, color: '#fff' },
  profileName: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#0f172a' },
  profileEmail: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#64748b' },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  profileRowText: { fontFamily: 'Inter_400Regular', fontSize: 15, color: '#0f172a' },
  sectionPad: { paddingHorizontal: 16, marginTop: 4 },
  sectionGap: { marginTop: 20 },
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
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)' },
  monthSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: 400,
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

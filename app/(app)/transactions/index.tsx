import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Repeat2, Search, SlidersHorizontal, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import {
  useTransactions,
  useDeleteTransaction,
  useTransactionsSummary,
} from '../../../src/hooks/useTransactions';
import { useCategories } from '../../../src/hooks/useCategories';
import { useRecurringSummary } from '../../../src/hooks/useRecurringSummary';
import { useDeferredReady } from '../../../src/hooks/useDeferredReady';
import { useUIStore } from '../../../src/stores/uiStore';
import { useTheme } from '../../../src/theme/ThemeContext';
import { SectionHeader } from '../../../src/components/ui/SectionHeader';
import { TransactionRow, TransactionRowSkeleton } from '../../../src/components/ui/TransactionRow';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import type { TransactionFilters } from '../../../src/api/transactions';
import type { Transaction } from '../../../src/api/transactions';
import type { Category } from '../../../src/api/categories';

// ── Date grouping ──────────────────────────────────────────────────────────

interface Section {
  title: string;             // ISO date string "2026-04-15"
  data: Transaction[];
  dailyTotal: number;
}

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

// ── Module-scope currency formatters (constructing Intl on Hermes is expensive) ──

const fmtMXN_es = new Intl.NumberFormat('es-MX', {
  style: 'currency', currency: 'MXN', minimumFractionDigits: 2,
});
const fmtMXN_en = new Intl.NumberFormat('en-MX', {
  style: 'currency', currency: 'MXN', minimumFractionDigits: 2,
});

function formatMXN(n: number, locale: 'es-MX' | 'en-MX'): string {
  return (locale === 'es-MX' ? fmtMXN_es : fmtMXN_en).format(Math.abs(n));
}

const SectionSeparator = () => <View style={{ height: 8 }} />;

// ── Date helpers ──────────────────────────────────────────────────────────

function getDateRange(period: 'current' | 'last' | 'three_months'): { from_date: string; to_date: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const toDate = fmt(now);

  if (period === 'current') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from_date: fmt(from), to_date: toDate };
  }
  if (period === 'last') {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from_date: fmt(from), to_date: fmt(to) };
  }
  // three_months
  const from = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  return { from_date: fmt(from), to_date: toDate };
}

// ── Active filter count ───────────────────────────────────────────────────

interface ActiveFilters {
  period?: 'current' | 'last' | 'three_months';
  categoryId?: number;
  txType?: 'income' | 'expense';
}

function countActiveFilters(f: ActiveFilters): number {
  let n = 0;
  if (f.period) n++;
  if (f.categoryId) n++;
  if (f.txType) n++;
  return n;
}

// ── Category Picker Modal ─────────────────────────────────────────────────

interface CategoryPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (category: Category) => void;
  categories: Category[];
  selectedId?: number;
}

function CategoryPickerModal({ visible, onClose, onSelect, categories, selectedId }: CategoryPickerProps) {
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
      <View style={styles.modalContainer}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16, backgroundColor: surface }]}>
          <View style={[styles.sheetHandle, { backgroundColor: borderCol }]} />
          <Text style={[styles.sheetTitle, { color: textPrimary }]}>Categoría</Text>
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

// ── Filter Sheet ──────────────────────────────────────────────────────────

interface FilterSheetProps {
  visible: boolean;
  current: ActiveFilters;
  categories: Category[];
  onApply: (filters: ActiveFilters) => void;
  onClose: () => void;
}

function FilterSheet({ visible, current, categories, onApply, onClose }: FilterSheetProps) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const surface = isDark ? theme.surface : '#ffffff';
  const surfaceEl = isDark ? theme.surfaceElevated : '#f8fafc';
  const textPrimary = isDark ? theme.textPrimary : '#0f172a';
  const textSecondary = isDark ? theme.textSecondary : '#64748b';
  const borderCol = isDark ? theme.border : '#e2e8f0';

  const [period, setPeriod] = useState<ActiveFilters['period']>(current.period);
  const [categoryId, setCategoryId] = useState<number | undefined>(current.categoryId);
  const [txType, setTxType] = useState<ActiveFilters['txType']>(current.txType);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const selectedCategory = categories.find((c) => c.id === categoryId);

  function handleApply() {
    onApply({ period, categoryId, txType });
    onClose();
  }

  function handleReset() {
    setPeriod(undefined);
    setCategoryId(undefined);
    setTxType(undefined);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={[styles.filterSheet, { paddingBottom: insets.bottom + 16, backgroundColor: surface }]}>
          <View style={[styles.sheetHandle, { backgroundColor: borderCol }]} />
          <View style={styles.filterHeader}>
            <Text style={[styles.sheetTitle, { color: textPrimary }]}>Filtros</Text>
            <TouchableOpacity onPress={handleReset} style={styles.resetBtn}>
              <Text style={styles.resetLabel}>Limpiar</Text>
            </TouchableOpacity>
          </View>

          {/* Period */}
          <Text style={[styles.filterSectionLabel, { color: textSecondary }]}>PERÍODO</Text>
          <View style={styles.pillRow}>
            {(['current', 'last', 'three_months'] as const).map((p) => {
              const labels = { current: 'Este mes', last: 'Mes pasado', three_months: 'Últimos 3 meses' };
              return (
                <TouchableOpacity
                  key={p}
                  style={[styles.pill, { backgroundColor: surface, borderColor: borderCol }, period === p && styles.pillActive]}
                  onPress={() => setPeriod(period === p ? undefined : p)}
                >
                  <Text style={[styles.pillText, { color: textPrimary }, period === p && styles.pillTextActive]}>
                    {labels[p]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Category */}
          <Text style={[styles.filterSectionLabel, { color: textSecondary }]}>CATEGORÍA</Text>
          <TouchableOpacity
            style={[styles.categorySelector, { backgroundColor: surfaceEl, borderColor: borderCol }]}
            onPress={() => setShowCategoryPicker(true)}
          >
            <Text style={[styles.categorySelectorText, !!categoryId && { color: textPrimary }]}>
              {selectedCategory ? selectedCategory.name : 'Todas las categorías'}
            </Text>
            {categoryId && (
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation?.(); setCategoryId(undefined); }}
                style={styles.clearCategoryBtn}
              >
                <X size={14} color={textSecondary} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          {/* Type */}
          <Text style={[styles.filterSectionLabel, { color: textSecondary }]}>TIPO</Text>
          <View style={styles.pillRow}>
            {(['income', 'expense'] as const).map((type) => {
              const labels = { income: 'Ingresos', expense: 'Gastos' };
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.pill, { backgroundColor: surface, borderColor: borderCol }, txType === type && styles.pillActive]}
                  onPress={() => setTxType(txType === type ? undefined : type)}
                >
                  <Text style={[styles.pillText, { color: textPrimary }, txType === type && styles.pillTextActive]}>
                    {labels[type]}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[styles.pill, { backgroundColor: surface, borderColor: borderCol }, !txType && styles.pillActive]}
              onPress={() => setTxType(undefined)}
            >
              <Text style={[styles.pillText, { color: textPrimary }, !txType && styles.pillTextActive]}>Todos</Text>
            </TouchableOpacity>
          </View>

          {/* Apply */}
          <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
            <Text style={styles.applyBtnText}>Aplicar</Text>
          </TouchableOpacity>
        </View>
      </View>

      <CategoryPickerModal
        visible={showCategoryPicker}
        onClose={() => setShowCategoryPicker(false)}
        onSelect={(cat) => setCategoryId(cat.id)}
        categories={categories}
        selectedId={categoryId}
      />
    </Modal>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export default function TransactionsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const locale = useUIStore((s) => s.locale);
  const showToast = useUIStore((s) => s.showToast);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [categorizingId, setCategorizingId] = useState<number | null>(null);
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ready = useDeferredReady();

  const { data: categoriesData } = useCategories();
  const { activeCount: recurringActiveCount, detectedCount: recurringDetectedCount } = useRecurringSummary({ enabled: ready });

  const categories = categoriesData ?? [];

  const filterBadgeCount = countActiveFilters(activeFilters);

  const filters: TransactionFilters = useMemo(() => {
    const f: TransactionFilters = {};
    if (debouncedSearch) f.search = debouncedSearch;
    if (activeFilters.period) {
      const range = getDateRange(activeFilters.period);
      f.from_date = range.from_date;
      f.to_date = range.to_date;
    }
    if (activeFilters.categoryId) f.category_id = activeFilters.categoryId;
    if (activeFilters.txType === 'income') f.transaction_type = 'income';
    if (activeFilters.txType === 'expense') f.transaction_type = 'variable_expense';
    return f;
  }, [debouncedSearch, activeFilters]);

  const {
    data: infiniteData,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useTransactions(filters);

  const { data: summaryData } = useTransactionsSummary(filters, { enabled: ready });
  const deleteMutation = useDeleteTransaction();

  // ── Categorize via swipe ──────────────────────────────────────────────────
  // useUpdateTransaction requires a fixed id, so we use a state-driven approach
  // by calling the mutation directly when a category is selected

  // Flatten pages
  const transactions = useMemo(
    () => infiniteData?.pages.flatMap((p) => p.data.transactions) ?? [],
    [infiniteData],
  );

  const sections = useMemo(() => groupByDate(transactions), [transactions]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleSearchChange(text: string) {
    setSearch(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(text), 200);
  }

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

  function handleDelete(id: number) {
    Alert.alert(
      t('transactions.delete.confirmTitle'),
      t('transactions.delete.confirmMessage'),
      [
        { text: t('transactions.delete.cancel'), style: 'cancel' },
        {
          text: t('transactions.delete.confirm'),
          style: 'destructive',
          onPress: async () => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => { });
            setDeletingId(id);
            try {
              await deleteMutation.mutateAsync(id);
              showToast(t('transactions.delete.success'), 'success');
            } catch {
              showToast(t('transactions.error.title'), 'error');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  }

  function handleCategorize(id: number) {
    setCategorizingId(id);
    setShowCategoryPicker(true);
  }

  async function handleCategorySelect(category: Category) {
    if (!categorizingId) return;
    const txId = categorizingId;
    setCategorizingId(null);
    try {
      const { updateTransaction } = await import('../../../src/api/transactions');
      await updateTransaction(txId, { category_id: category.id });
      refetch();
      showToast('Categoría actualizada', 'success');
    } catch {
      showToast('Error al actualizar categoría', 'error');
    }
  }

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderSectionHeader = useCallback(
    ({ section }: { section: Section }) => (
      <SectionHeader dateKey={section.title} dailyTotal={section.dailyTotal} currency="MXN" />
    ),
    [],
  );

  const renderItem = useCallback(
    ({ item }: { item: Transaction }) => (
      <TransactionRow
        {...item}
        onPress={() => router.push(`/(app)/transactions/${item.id}` as `/(app)/transactions/${string}`)}
        onDelete={handleDelete}
        onCategorize={handleCategorize}
        showAccountName
        enableSwipeActions
        isDeleting={deletingId === item.id}
      />
    ),
    [deletingId],
  );

  const keyExtractor = useCallback((item: Transaction) => String(item.id), []);

  const { theme, isDark } = useTheme();
  const bg = isDark ? theme.background : '#f8fafc';
  const textPrimary = isDark ? theme.textPrimary : '#0f172a';
  const textSecondary = isDark ? theme.textSecondary : '#64748b';
  const borderCol = isDark ? theme.border : '#e2e8f0';
  const dividerCol = isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9';
  const inputBg = isDark ? theme.surfaceElevated : '#f1f5f9';

  const resolvedLocale: 'es-MX' | 'en-MX' = locale === 'es' ? 'es-MX' : 'en-MX';
  const fmtAmount = useCallback((n: number) => formatMXN(n, resolvedLocale), [resolvedLocale]);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <View style={[styles.screen, { paddingTop: insets.top, backgroundColor: bg }]}>
      {/* Header */}
      <View style={[styles.navHeader, { backgroundColor: bg }]}>
        <Text style={[styles.navTitle, { color: textPrimary }]} accessibilityRole="header">
          {t('transactions.title')}
        </Text>
        <View style={styles.headerActions}>
          {(recurringActiveCount > 0 || recurringDetectedCount > 0) && (
            <TouchableOpacity
              style={[styles.recurringChip, { borderColor: borderCol }]}
              onPress={() => router.push('/(app)/recurring' as never)}
              accessibilityLabel={t('recurring.title')}
            >
              <Repeat2 size={14} color={recurringDetectedCount > 0 ? '#4f46e5' : textSecondary} />
              <Text style={[styles.recurringChipText, { color: textPrimary }]}>
                {t('recurring.title')}
                {recurringActiveCount > 0 ? ` (${recurringActiveCount})` : ''}
              </Text>
              {recurringDetectedCount > 0 && (
                <View style={styles.recurringChipBadge}>
                  <Text style={styles.recurringChipBadgeText}>{recurringDetectedCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.filterIconBtn}
            onPress={() => setShowFilterSheet(true)}
            accessibilityLabel={t('transactions.filters.title')}
          >
            <SlidersHorizontal size={24} color={filterBadgeCount > 0 ? '#4f46e5' : textSecondary} />
            {filterBadgeCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{filterBadgeCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={[styles.searchRow, { backgroundColor: bg }]}>
        <View style={[styles.searchBar, { backgroundColor: inputBg, borderColor: borderCol }]}>
          <Search size={16} color="#94a3b8" style={{ marginLeft: 12 }} />
          <TextInput
            style={[styles.searchInput, { color: textPrimary }]}
            value={search}
            onChangeText={handleSearchChange}
            placeholder={t('transactions.search.placeholder')}
            placeholderTextColor="#94a3b8"
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            accessibilityLabel={t('transactions.search.placeholder')}
            accessibilityRole="search"
          />
          {search.length > 0 && (
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={() => { setSearch(''); setDebouncedSearch(''); }}
            >
              <X size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Summary bar */}
      <View style={[styles.summaryBar, { backgroundColor: bg, borderColor: borderCol }]}>
        <View>
          <Text style={styles.summaryValue} accessibilityLabel={undefined}>
            {summaryData ? fmtAmount(summaryData.total_income) : '—'}
          </Text>
          <Text style={[styles.summaryLabel, { color: textSecondary }]}>{t('transactions.summary.income')}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.summaryValue, { color: '#e11d48' }]}>
            {summaryData ? fmtAmount(summaryData.total_expenses) : '—'}
          </Text>
          <Text style={[styles.summaryLabel, { color: textSecondary }]}>{t('transactions.summary.expenses')}</Text>
        </View>
      </View>

      {/* List */}
      {isLoading ? (
        <FlatList
          data={[1, 2, 3, 4, 5] as number[]}
          keyExtractor={(i) => String(i)}
          renderItem={() => <TransactionRowSkeleton />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      ) : isError ? (
        <EmptyState
          icon="wifi-off"
          iconColor="#cbd5e1"
          title={t('transactions.error.title')}
          ctaLabel={t('transactions.error.retry')}
          ctaVariant="secondary"
          onCta={() => refetch()}
          fullScreen
        />
      ) : transactions.length === 0 ? (
        <EmptyState
          icon={debouncedSearch || filterBadgeCount > 0 ? 'search-x' : 'receipt'}
          iconColor={debouncedSearch || filterBadgeCount > 0 ? '#cbd5e1' : '#c7d2fe'}
          title={
            debouncedSearch || filterBadgeCount > 0
              ? t('transactions.empty.noResults.title')
              : t('transactions.empty.noTransactions.title')
          }
          subtitle={
            debouncedSearch || filterBadgeCount > 0
              ? t('transactions.empty.noResults.subtitle')
              : t('transactions.empty.noTransactions.subtitle')
          }
          ctaLabel={debouncedSearch || filterBadgeCount > 0 ? t('transactions.search.clearFilters') : undefined}
          ctaVariant="ghost"
          onCta={
            debouncedSearch || filterBadgeCount > 0
              ? () => { setSearch(''); setDebouncedSearch(''); setActiveFilters({}); }
              : undefined
          }
          fullScreen
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={keyExtractor}
          stickySectionHeadersEnabled
          initialNumToRender={15}
          maxToRenderPerBatch={8}
          updateCellsBatchingPeriod={50}
          windowSize={11}
          renderSectionHeader={renderSectionHeader}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: dividerCol }]} />}
          SectionSeparatorComponent={SectionSeparator}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
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
        />
      )}

      {/* Filter sheet — mount only when open */}
      {showFilterSheet && (
        <FilterSheet
          visible={showFilterSheet}
          current={activeFilters}
          categories={categories}
          onApply={(f) => {
            setActiveFilters(f);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
          }}
          onClose={() => setShowFilterSheet(false)}
        />
      )}

      {/* Category picker (for swipe-to-categorize) — mount only when open */}
      {showCategoryPicker && (
        <CategoryPickerModal
          visible={showCategoryPicker}
          onClose={() => { setShowCategoryPicker(false); setCategorizingId(null); }}
          onSelect={handleCategorySelect}
          categories={categories}
        />
      )}

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
  filterIconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recurringChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  recurringChipText: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  recurringChipBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recurringChipBadgeText: { color: '#ffffff', fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  filterBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  filterBadgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 10, color: '#ffffff' },
  searchRow: { paddingHorizontal: 16, paddingBottom: 8 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: '#0f172a',
    paddingHorizontal: 10,
    height: '100%',
  },
  clearBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: 16,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 4,
  },
  summaryValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    lineHeight: 20,
    color: '#059669',
    fontVariant: ['tabular-nums'],
  },
  summaryLabel: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 16, color: '#64748b' },
  separator: { height: 1, backgroundColor: '#f1f5f9' },
  footer: { height: 40, alignItems: 'center', justifyContent: 'center' },
  allCaughtUp: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 16, color: '#94a3b8' },
  // ── Modal / Sheet ──────────────────────────────────────────────────────────
  modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.4)' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    maxHeight: 480,
  },
  filterSheet: {
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
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  resetBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  resetLabel: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 20, color: '#4f46e5' },
  filterSectionLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.55,
    color: '#64748b',
    marginBottom: 8,
    marginTop: 4,
  },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  pillActive: { borderColor: '#4f46e5', backgroundColor: '#e0e7ff' },
  pillText: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 18, color: '#334155' },
  pillTextActive: { color: '#4f46e5', fontFamily: 'Inter_500Medium' },
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  categorySelectorText: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 20, color: '#94a3b8' },
  categorySelectorTextActive: { color: '#0f172a' },
  clearCategoryBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  applyBtn: {
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  applyBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, lineHeight: 20, color: '#ffffff' },
  // Category picker rows
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

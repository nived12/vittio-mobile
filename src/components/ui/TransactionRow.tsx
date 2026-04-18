import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import * as LucideIcons from 'lucide-react-native';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { enUS, es } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { getCategoryColor } from '../../utils/categoryColors';
import { AmountDisplay } from './AmountDisplay';
import { SkeletonBox } from './SkeletonLoader';
import { useUIStore } from '../../stores/uiStore';

// ── Types ──────────────────────────────────────────────────────────────────

type TransactionType =
  | 'income'
  | 'fixed_expense'
  | 'variable_expense'
  | 'transfer_in'
  | 'transfer_out';

interface TransactionRowProps {
  id: number;
  description: string;
  concept?: string | null;
  amount: number;
  transaction_type: TransactionType;
  source: 'manual' | 'statement_file';
  date: string;
  merchant?: string | null;
  category?: { id: number; name: string; icon: string } | null;
  bank_account: { id: number; name: string; account_type: 'debit' | 'credit' | 'cash' };
  is_transfer: boolean;
  transfer_account?: { name: string } | null;
  onPress: () => void;
  onDelete?: (id: number) => void;
  onCategorize?: (id: number) => void;
  showAccountName?: boolean;
  enableSwipeActions?: boolean;
  isDeleting?: boolean;
}

// ── Icon resolver ──────────────────────────────────────────────────────────

function getIcon(name: string): React.ComponentType<{ size: number; color: string }> {
  const pascal = name
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
  const icons = LucideIcons as Record<string, unknown>;
  return (icons[pascal] as React.ComponentType<{ size: number; color: string }>) ?? LucideIcons.Tag;
}

// ── Date formatting ────────────────────────────────────────────────────────

function formatDate(dateStr: string, locale: string, t: (k: string) => string): string {
  try {
    const date = parseISO(dateStr);
    const dateFnsLocale = locale.startsWith('es') ? es : enUS;
    if (isToday(date)) return t('transactionRow.today');
    if (isYesterday(date)) return t('transactionRow.yesterday');
    const currentYear = new Date().getFullYear();
    if (date.getFullYear() === currentYear) {
      return format(date, 'MMM d', { locale: dateFnsLocale });
    }
    return format(date, 'MMM d, yyyy', { locale: dateFnsLocale });
  } catch {
    return dateStr;
  }
}

// ── Amount sign / color helpers ────────────────────────────────────────────

function getAmountVariant(
  txType: TransactionType,
  amount: number,
): 'auto' | 'always-sign' | 'no-sign' {
  if (
    txType === 'income' ||
    txType === 'transfer_in' ||
    amount > 0
  ) {
    return 'always-sign';
  }
  return 'auto';
}

// ── Badge config ────────────────────────────────────────────────────────────

interface BadgeConfig {
  bg: string;
  text: string;
  label: string;
}

function getBadge(txType: TransactionType, t: (k: string) => string): BadgeConfig | null {
  switch (txType) {
    case 'fixed_expense':
      return { bg: '#fef3c7', text: '#92400e', label: t('transactionRow.types.fixed_expense') };
    case 'income':
      return { bg: '#d1fae5', text: '#065f46', label: t('transactionRow.types.income') };
    case 'transfer_in':
    case 'transfer_out':
      return { bg: '#ede9fe', text: '#5b21b6', label: t('transactionRow.types.transfer_in') };
    default:
      return null; // variable_expense — no badge (most common, reduces noise)
  }
}

// ── Component ──────────────────────────────────────────────────────────────

export function TransactionRow({
  id,
  description,
  concept,
  amount,
  transaction_type,
  source,
  date,
  merchant,
  category,
  bank_account,
  is_transfer,
  onPress,
  onDelete,
  onCategorize,
  showAccountName = true,
  enableSwipeActions = true,
  isDeleting = false,
}: TransactionRowProps) {
  const { t } = useTranslation();
  const storeLocale = useUIStore((s) => s.locale);
  const resolvedLocale = storeLocale === 'es' ? 'es-MX' : 'en-MX';
  const swipeableRef = useRef<Swipeable>(null);
  const hasReachedDeleteThreshold = useRef(false);
  const hasReachedCategorizeThreshold = useRef(false);

  // ── Labels ──────────────────────────────────────────────────────────────
  const primaryLabel = merchant ?? concept ?? description;
  const dateLabel = formatDate(date, resolvedLocale, t);
  const subtitleText = showAccountName
    ? `${dateLabel} · ${bank_account.name}`
    : dateLabel;

  // ── Category icon ────────────────────────────────────────────────────────
  let iconBg: string;
  let iconName: string;
  let iconColor = '#ffffff';

  if (is_transfer) {
    iconBg = '#ede9fe';
    iconName = 'arrow-left-right';
    iconColor = '#7c3aed';
  } else if (category) {
    iconBg = getCategoryColor(category.icon);
    iconName = category.icon;
  } else {
    iconBg = '#f1f5f9';
    iconName = 'tag';
    iconColor = '#94a3b8';
  }

  const IconComponent = getIcon(iconName);
  const badge = getBadge(transaction_type, t);
  const amountVariant = getAmountVariant(transaction_type, amount);

  // ── Swipe actions ────────────────────────────────────────────────────────
  function handleDeletePress() {
    swipeableRef.current?.close();
    Alert.alert(
      t('transactionRow.swipeDeleteConfirm.title'),
      t('transactionRow.swipeDeleteConfirm.message'),
      [
        { text: t('transactionRow.swipeDeleteConfirm.cancel'), style: 'cancel' },
        {
          text: t('transactionRow.swipeDeleteConfirm.confirm'),
          style: 'destructive',
          onPress: () => onDelete?.(id),
        },
      ],
    );
  }

  function handleCategorizePress() {
    swipeableRef.current?.close();
    onCategorize?.(id);
  }

  function renderRightActions() {
    if (!enableSwipeActions || source !== 'manual') return null;
    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={handleDeletePress}
        accessibilityLabel={t('transactionRow.delete')}
        accessibilityHint="Double-tap to delete this transaction. This cannot be undone."
      >
        <LucideIcons.Trash2 size={20} color="#ffffff" />
        <Text style={styles.actionLabel}>{t('transactionRow.delete')}</Text>
      </TouchableOpacity>
    );
  }

  function renderLeftActions() {
    if (!enableSwipeActions) return null;
    return (
      <TouchableOpacity
        style={styles.categorizeAction}
        onPress={handleCategorizePress}
        accessibilityLabel={t('transactionRow.categorize')}
      >
        <LucideIcons.Tag size={20} color="#ffffff" />
        <Text style={styles.actionLabel}>{t('transactionRow.categorize')}</Text>
      </TouchableOpacity>
    );
  }

  const row = (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDeleting}
      style={[styles.row, isDeleting && styles.deletingRow]}
      accessibilityRole="button"
      accessibilityLabel={`${primaryLabel}, ${amount} ${bank_account.name}, ${transaction_type}, ${dateLabel}`}
      accessibilityActions={[
        ...(source === 'manual' ? [{ name: 'delete', label: t('transactionRow.delete') }] : []),
        { name: 'categorize', label: t('transactionRow.categorize') },
      ]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'delete') handleDeletePress();
        if (event.nativeEvent.actionName === 'categorize') handleCategorizePress();
      }}
    >
      {/* Category icon */}
      <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
        <IconComponent size={20} color={iconColor} />
      </View>

      {/* Center block */}
      <View style={styles.center}>
        <Text style={styles.primaryLabel} numberOfLines={1}>
          {primaryLabel}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitleText}
        </Text>
      </View>

      {/* Right block */}
      <View style={styles.right}>
        {isDeleting ? (
          <ActivityIndicator size="small" color="#4f46e5" />
        ) : (
          <>
            <AmountDisplay
              amount={amount}
              size="md"
              variant={amountVariant}
              colorize
            />
            {badge ? (
              <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                <Text style={[styles.badgeText, { color: badge.text }]}>
                  {badge.label}
                </Text>
              </View>
            ) : null}
          </>
        )}
      </View>
    </TouchableOpacity>
  );

  if (!enableSwipeActions) return row;

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      renderLeftActions={renderLeftActions}
      friction={2}
      rightThreshold={80}
      leftThreshold={80}
      onSwipeableWillOpen={(direction) => {
        if (direction === 'right' && !hasReachedDeleteThreshold.current) {
          hasReachedDeleteThreshold.current = true;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        }
        if (direction === 'left' && !hasReachedCategorizeThreshold.current) {
          hasReachedCategorizeThreshold.current = true;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
      }}
      onSwipeableClose={() => {
        hasReachedDeleteThreshold.current = false;
        hasReachedCategorizeThreshold.current = false;
      }}
    >
      {row}
    </Swipeable>
  );
}

/**
 * Skeleton placeholder for a TransactionRow.
 */
export function TransactionRowSkeleton() {
  return (
    <View style={styles.skeletonRow}>
      <SkeletonBox width={40} height={40} borderRadius={12} />
      <View style={{ flex: 1, marginLeft: 12, gap: 8 }}>
        <SkeletonBox width="60%" height={15} />
        <SkeletonBox width="40%" height={12} />
      </View>
      <SkeletonBox width={80} height={15} />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 72,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
  },
  deletingRow: {
    opacity: 0.5,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  primaryLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 20,
    color: '#0f172a',
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 16,
    color: '#64748b',
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
    minWidth: 88,
    marginLeft: 8,
  },
  badge: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  badgeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    lineHeight: 14,
  },
  deleteAction: {
    backgroundColor: '#ef4444',
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  categorizeAction: {
    backgroundColor: '#4f46e5',
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  actionLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#ffffff',
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 72,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
  },
});

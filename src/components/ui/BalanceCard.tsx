import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowUp, ArrowDown, TrendingDown } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../../stores/uiStore';
import { SkeletonBox } from './SkeletonLoader';

// ── Types ──────────────────────────────────────────────────────────────────

interface BalanceCardProps {
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  currency: string;
  selectedMonth: string;
  isLoading?: boolean;
  locale?: string;
}

// ── Formatting ─────────────────────────────────────────────────────────────

function fmt(amount: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
}

// ── Component ──────────────────────────────────────────────────────────────

export function BalanceCard({
  totalBalance,
  totalIncome,
  totalExpenses,
  currency,
  selectedMonth,
  isLoading = false,
  locale,
}: BalanceCardProps) {
  const { t } = useTranslation();
  const storeLocale = useUIStore((s) => s.locale);
  const resolvedLocale = locale ?? (storeLocale === 'es' ? 'es-MX' : 'en-MX');

  // Count-up animation — only fires on first load
  const animatedBalance = useRef(new Animated.Value(0)).current;
  const hasAnimated = useRef(false);
  const [displayBalance, setDisplayBalance] = React.useState('');

  useEffect(() => {
    if (!isLoading && !hasAnimated.current) {
      hasAnimated.current = true;
      // Listen to animated value and format as currency
      const listener = animatedBalance.addListener(({ value }) => {
        setDisplayBalance(
          (totalBalance < 0 ? '\u2212' : '') + fmt(value, currency, resolvedLocale),
        );
      });
      Animated.timing(animatedBalance, {
        toValue: Math.abs(totalBalance),
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
      return () => animatedBalance.removeListener(listener);
    } else if (!isLoading && hasAnimated.current) {
      setDisplayBalance(
        (totalBalance < 0 ? '\u2212' : '') + fmt(totalBalance, currency, resolvedLocale),
      );
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, totalBalance]);

  const formattedIncome = fmt(totalIncome, currency, resolvedLocale);
  const formattedExpenses = fmt(totalExpenses, currency, resolvedLocale);

  const a11yLabel = `${t('balanceCard.totalBalance')}: ${displayBalance}. ${t('balanceCard.income')}: ${formattedIncome}. ${t('balanceCard.expenses')}: ${formattedExpenses}.`;

  return (
    <LinearGradient
      colors={['#3b82f6', '#4f46e5']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
      accessibilityLabel={isLoading ? t('balanceCard.loading') : a11yLabel}
      accessibilityRole="none"
    >
      {isLoading ? (
        <View style={styles.skeletonContent}>
          {/* Top row */}
          <View style={styles.labelRow}>
            <SkeletonBox width={100} height={12} style={styles.shimmer} />
            <SkeletonBox width={80} height={12} style={styles.shimmer} />
          </View>
          {/* Balance */}
          <SkeletonBox width={180} height={36} style={[styles.shimmer, { marginTop: 8 }]} />
          {/* Divider */}
          <View style={styles.divider} />
          {/* Bottom row */}
          <View style={styles.bottomRow}>
            <View style={{ gap: 6 }}>
              <SkeletonBox width={80} height={12} style={styles.shimmer} />
              <SkeletonBox width={50} height={10} style={styles.shimmer} />
            </View>
            <View style={{ gap: 6, alignItems: 'flex-end' }}>
              <SkeletonBox width={80} height={12} style={styles.shimmer} />
              <SkeletonBox width={50} height={10} style={styles.shimmer} />
            </View>
          </View>
        </View>
      ) : (
        <>
          {/* Label row */}
          <View style={styles.labelRow}>
            <Text style={styles.labelText}>{t('balanceCard.totalBalance')}</Text>
            <Text style={styles.labelText}>{selectedMonth}</Text>
          </View>

          {/* Balance amount */}
          <View style={styles.balanceRow}>
            {totalBalance < 0 && (
              <TrendingDown size={18} color="#fca5a5" style={{ marginRight: 4 }} />
            )}
            <Text
              style={styles.balanceText}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {displayBalance || (totalBalance < 0 ? '\u2212' : '') + fmt(totalBalance, currency, resolvedLocale)}
            </Text>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Income / Expenses */}
          <View style={styles.bottomRow}>
            {/* Income */}
            <View>
              <View style={styles.statRow}>
                <ArrowUp size={14} color="#6ee7b7" />
                <Text style={styles.statAmount}>{formattedIncome}</Text>
              </View>
              <Text style={styles.statLabel}>{t('balanceCard.income')}</Text>
            </View>

            {/* Expenses */}
            <View style={{ alignItems: 'flex-end' }}>
              <View style={styles.statRow}>
                <ArrowDown size={14} color="#fca5a5" />
                <Text style={styles.statAmount}>{formattedExpenses}</Text>
              </View>
              <Text style={styles.statLabel}>{t('balanceCard.expenses')}</Text>
            </View>
          </View>
        </>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 160,
    borderRadius: 20,
    padding: 20,
    // Shadow
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.30,
    shadowRadius: 24,
    elevation: 12,
  },
  skeletonContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  shimmer: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.75)',
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  balanceText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 32,
    lineHeight: 38,
    color: '#ffffff',
    fontVariant: ['tabular-nums'],
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.20)',
    marginVertical: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statAmount: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    lineHeight: 22,
    color: '#ffffff',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.70)',
    marginTop: 2,
  },
});

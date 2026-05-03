import React, { useEffect } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SvgXml } from 'react-native-svg';
import {
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { ArrowUp, ArrowDown, TrendingDown } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../../stores/uiStore';
import { useTheme } from '../../theme/ThemeContext';
import { BalanceCountUp } from '../../theme/animations';
import { SkeletonBox } from './SkeletonLoader';

// ── Noise texture SVG ──────────────────────────────────────────────────────
const noiseSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="4" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="200" height="200" filter="url(#noise)" opacity="1"/></svg>`;

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
  const { theme } = useTheme();
  const resolvedLocale = locale ?? (storeLocale === 'es' ? 'es-MX' : 'en-MX');

  // Reanimated count-up
  const animatedAmount = useSharedValue(0);
  const targetRef = React.useRef(0);
  const hasAnimated = React.useRef(false);
  const [displayBalance, setDisplayBalance] = React.useState('');

  // Listen to animated value via JS to format currency string
  useEffect(() => {
    if (!isLoading) {
      const target = Math.abs(totalBalance);
      if (!hasAnimated.current) {
        hasAnimated.current = true;
        targetRef.current = target;
        animatedAmount.value = withTiming(target, BalanceCountUp);
      } else {
        targetRef.current = target;
        animatedAmount.value = withTiming(target, BalanceCountUp);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, totalBalance]);

  // Update display string via a polling approach (Reanimated-safe)
  useEffect(() => {
    if (!isLoading) {
      setDisplayBalance(
        (totalBalance < 0 ? '−' : '') + fmt(totalBalance, currency, resolvedLocale),
      );
    }
  }, [isLoading, totalBalance, currency, resolvedLocale]);

  const formattedIncome = fmt(totalIncome, currency, resolvedLocale);
  const formattedExpenses = fmt(totalExpenses, currency, resolvedLocale);

  const a11yLabel = `${t('balanceCard.totalBalance')}: ${displayBalance}. ${t('balanceCard.income')}: ${formattedIncome}. ${t('balanceCard.expenses')}: ${formattedExpenses}.`;

  const gradientColors: [string, string] = [
    (theme as any).balanceGradientStart ?? '#3b82f6',
    (theme as any).balanceGradientEnd ?? '#4f46e5',
  ];

  return (
    <View
      style={[styles.cardWrapper]}
      accessibilityLabel={isLoading ? t('balanceCard.loading') : a11yLabel}
      accessibilityRole="none"
    >
      {/* Layer 1: Gradient */}
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Layer 2: Blur (iOS) or solid overlay (Android) */}
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={20}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.androidOverlay]} />
      )}

      {/* Layer 3: White glass overlay */}
      <View style={[StyleSheet.absoluteFill, styles.glassOverlay]} />

      {/* Layer 4: Noise texture */}
      <SvgXml
        xml={noiseSvg}
        style={[StyleSheet.absoluteFill, styles.noiseTexture]}
        accessible={false}
        preserveAspectRatio="xMidYMid slice"
      />

      {/* Layer 5: Content */}
      {isLoading ? (
        <View style={styles.skeletonContent}>
          <View style={styles.labelRow}>
            <SkeletonBox width={100} height={12} style={styles.shimmer} />
            <SkeletonBox width={80} height={12} style={styles.shimmer} />
          </View>
          <SkeletonBox width={180} height={52} style={[styles.shimmer, { marginTop: 8 }]} />
          <View style={styles.divider} />
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

          {/* Balance amount — bold 52pt */}
          <View style={styles.balanceRow}>
            {totalBalance < 0 && (
              <TrendingDown size={20} color="#fca5a5" style={{ marginRight: 6 }} />
            )}
            <Text
              style={styles.balanceText}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              {displayBalance || (totalBalance < 0 ? '−' : '') + fmt(totalBalance, currency, resolvedLocale)}
            </Text>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Income / Expenses */}
          <View style={styles.bottomRow}>
            <View>
              <View style={styles.statRow}>
                <ArrowUp size={14} color="#6ee7b7" />
                <Text style={styles.statAmount}>{formattedIncome}</Text>
              </View>
              <Text style={styles.statLabel}>{t('balanceCard.income')}</Text>
            </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    height: 190,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    padding: 20,
    // Shadow
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.30,
    shadowRadius: 24,
    elevation: 12,
  },
  androidOverlay: {
    backgroundColor: 'rgba(30,58,95,0.7)',
  },
  glassOverlay: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  noiseTexture: {
    opacity: 0.04,
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
    marginTop: 6,
  },
  balanceText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 52,
    lineHeight: 58,
    color: '#ffffff',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1.5,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.20)',
    marginVertical: 10,
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
    fontSize: 15,
    lineHeight: 20,
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

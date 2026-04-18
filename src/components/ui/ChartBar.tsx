import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, Text, StyleSheet } from 'react-native';
import * as LucideIcons from 'lucide-react-native';
import { getCategoryColor } from '../../utils/categoryColors';
import { AmountDisplay } from './AmountDisplay';
import { SkeletonBox } from './SkeletonLoader';

// ── Types ──────────────────────────────────────────────────────────────────

interface ChartBarProps {
  label: string;
  icon: string;
  amount: number;
  currency?: string;
  locale?: string;
  value: number;
  maxValue: number;
  color?: string;
  index: number;
  isLoading?: boolean;
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

// ── Component ──────────────────────────────────────────────────────────────

export function ChartBar({
  label,
  icon,
  amount,
  currency = 'MXN',
  locale,
  value,
  maxValue,
  color,
  index,
  isLoading = false,
}: ChartBarProps) {
  const barPercent = maxValue > 0 ? value / maxValue : 0;
  const clampedPercent = Math.max(0.04, Math.min(1.0, barPercent));
  const percentage = Math.round(barPercent * 100);

  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isLoading) return;
    Animated.timing(animatedWidth, {
      toValue: clampedPercent,
      duration: 400,
      delay: index * 50,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [clampedPercent, index, isLoading, animatedWidth]);

  const barColor = color ?? getCategoryColor(icon);
  const IconComponent = getIcon(icon);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.row}>
          <SkeletonBox width={28} height={28} borderRadius={8} />
          <SkeletonBox width={80} height={12} style={{ marginLeft: 8 }} />
          <View style={{ flex: 1 }} />
          <SkeletonBox width={60} height={12} />
        </View>
        <SkeletonBox width="100%" height={6} borderRadius={3} style={{ marginTop: 6 }} />
      </View>
    );
  }

  const widthInterpolation = animatedWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View
      style={styles.container}
      accessibilityRole="none"
      accessibilityLabel={`${label}: ${amount} ${currency}, ${percentage}% of spending`}
    >
      <View style={styles.row}>
        {/* Icon circle */}
        <View style={[styles.iconCircle, { backgroundColor: barColor }]}>
          <IconComponent size={14} color="#ffffff" />
        </View>

        {/* Label */}
        <Text style={styles.label} numberOfLines={1} ellipsizeMode="tail">
          {label}
        </Text>

        {/* Amount */}
        <AmountDisplay
          amount={amount}
          size="sm"
          variant="no-sign"
          colorize={false}
          currency={currency}
          locale={locale}
        />
      </View>

      {/* Bar track + fill */}
      <View style={styles.track}>
        <Animated.View
          accessibilityElementsHidden
          style={[styles.fill, { width: widthInterpolation, backgroundColor: barColor }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 20,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -4, // compensate for row height being smaller than circle
  },
  label: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: '#0f172a',
    marginLeft: 8,
  },
  track: {
    height: 6,
    backgroundColor: '#f1f5f9', // slate-100
    borderRadius: 3,
    marginTop: 6,
    overflow: 'hidden',
  },
  fill: {
    height: 6,
    borderRadius: 3,
  },
});

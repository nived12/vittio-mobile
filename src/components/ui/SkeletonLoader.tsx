import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleProp, ViewStyle } from 'react-native';

interface SkeletonBoxProps {
  width: number | `${number}%`;
  height: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Single animated shimmer rectangle.
 * Uses a looping opacity animation: 0.4 → 0.7 → 0.4 over 1200ms.
 */
export function SkeletonBox({
  width,
  height,
  borderRadius = 6,
  style,
}: SkeletonBoxProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: '#e2e8f0', // slate-200
          opacity,
        },
        style,
      ]}
    />
  );
}

/**
 * Skeleton for a single TransactionRow (72pt height).
 */
export function TransactionRowSkeleton() {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        height: 72,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#ffffff',
      }}
    >
      {/* Icon circle */}
      <SkeletonBox width={40} height={40} borderRadius={12} />
      {/* Center text */}
      <View style={{ flex: 1, marginLeft: 12, gap: 8 }}>
        <SkeletonBox width="60%" height={15} />
        <SkeletonBox width="40%" height={12} />
      </View>
      {/* Amount */}
      <SkeletonBox width={80} height={15} />
    </View>
  );
}

/**
 * Skeleton for a BalanceCard (160pt fixed height).
 * Gradient preserved; text replaced by white shimmer bars.
 */
export function BalanceCardSkeleton({ width }: { width: number }) {
  return (
    <View
      style={{
        width,
        height: 160,
        borderRadius: 20,
        backgroundColor: '#4f46e5',
        padding: 20,
        justifyContent: 'space-between',
      }}
    >
      {/* Top row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <SkeletonBox width={100} height={12} style={{ backgroundColor: 'rgba(255,255,255,0.3)' }} />
        <SkeletonBox width={80} height={12} style={{ backgroundColor: 'rgba(255,255,255,0.3)' }} />
      </View>
      {/* Balance */}
      <SkeletonBox width={180} height={36} style={{ backgroundColor: 'rgba(255,255,255,0.3)' }} />
      {/* Bottom row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ gap: 6 }}>
          <SkeletonBox width={80} height={12} style={{ backgroundColor: 'rgba(255,255,255,0.3)' }} />
          <SkeletonBox width={50} height={10} style={{ backgroundColor: 'rgba(255,255,255,0.3)' }} />
        </View>
        <View style={{ gap: 6, alignItems: 'flex-end' }}>
          <SkeletonBox width={80} height={12} style={{ backgroundColor: 'rgba(255,255,255,0.3)' }} />
          <SkeletonBox width={50} height={10} style={{ backgroundColor: 'rgba(255,255,255,0.3)' }} />
        </View>
      </View>
    </View>
  );
}

/**
 * Skeleton for an account chip (160×80pt).
 */
export function AccountChipSkeleton() {
  return (
    <View
      style={{
        width: 160,
        height: 80,
        borderRadius: 12,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        padding: 12,
        justifyContent: 'space-between',
      }}
    >
      <SkeletonBox width="70%" height={12} />
      <SkeletonBox width="50%" height={18} />
    </View>
  );
}

/**
 * Skeleton for a ChartBar row (36pt).
 */
export function ChartBarSkeleton() {
  return (
    <View style={{ paddingVertical: 4, gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <SkeletonBox width={28} height={28} borderRadius={8} />
        <SkeletonBox width={80} height={12} style={{ marginLeft: 8 }} />
        <View style={{ flex: 1 }} />
        <SkeletonBox width={60} height={12} />
      </View>
      <SkeletonBox width="100%" height={6} borderRadius={3} />
    </View>
  );
}

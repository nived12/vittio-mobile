import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, StyleSheet } from 'react-native';
import * as LucideIcons from 'lucide-react-native';
import { Button } from './Button';

// ── Types ──────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon: string;
  iconSize?: number;
  iconColor?: string;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaVariant?: 'primary' | 'secondary' | 'ghost';
  onCta?: () => void;
  secondaryCtaLabel?: string;
  onSecondaryCta?: () => void;
  fullScreen?: boolean;
  topPadding?: number;
}

// ── Icon resolver ──────────────────────────────────────────────────────────

function getIcon(name: string): React.ComponentType<{ size: number; color: string; strokeWidth?: number }> {
  const pascal = name
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
  const icons = LucideIcons as Record<string, unknown>;
  return (icons[pascal] as React.ComponentType<{ size: number; color: string; strokeWidth?: number }>) ?? LucideIcons.Circle;
}

// ── Component ──────────────────────────────────────────────────────────────

export function EmptyState({
  icon,
  iconSize = 64,
  iconColor = '#c7d2fe', // indigo-200
  title,
  subtitle,
  ctaLabel,
  ctaVariant = 'primary',
  onCta,
  secondaryCtaLabel,
  onSecondaryCta,
  fullScreen = false,
  topPadding = 40,
}: EmptyStateProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  const IconComponent = getIcon(icon);

  return (
    <Animated.View
      style={[
        styles.container,
        fullScreen && styles.fullScreen,
        fullScreen && { paddingTop: topPadding },
        { opacity, transform: [{ translateY }] },
      ]}
    >
      <View accessibilityElementsHidden style={styles.iconWrapper}>
        <IconComponent size={iconSize} color={iconColor} strokeWidth={1.5} />
      </View>

      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>

      {subtitle ? (
        <Text style={styles.subtitle}>{subtitle}</Text>
      ) : null}

      {ctaLabel && onCta ? (
        <View style={styles.ctaWrapper}>
          <Button
            label={ctaLabel}
            variant={ctaVariant === 'primary' ? 'primary' : ctaVariant === 'secondary' ? 'secondary' : 'ghost'}
            onPress={onCta}
          />
        </View>
      ) : null}

      {secondaryCtaLabel && onSecondaryCta ? (
        <Button
          label={secondaryCtaLabel}
          variant="ghost"
          onPress={onSecondaryCta}
        />
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 24,
  },
  fullScreen: {
    flex: 1,
    justifyContent: 'center',
  },
  iconWrapper: {
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    lineHeight: 22,
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  ctaWrapper: {
    width: '100%',
    marginBottom: 12,
  },
});

import React, { useRef } from 'react';
import {
  Animated,
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import { colors, components, textStyles } from '../../theme';

// ── Types ──────────────────────────────────────────────────────────────────

type Variant = 'primary' | 'secondary' | 'destructive' | 'ghost';
type Size    = 'lg' | 'md' | 'sm';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

// ── Component ──────────────────────────────────────────────────────────────

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  isLoading = false,
  disabled = false,
  style,
  accessibilityLabel,
  accessibilityHint,
}: ButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isDisabled = disabled || isLoading;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const heightMap: Record<Size, number> = {
    lg: components.button.heightLg,
    md: components.button.heightMd,
    sm: components.button.heightSm,
  };

  const variantStyles = getVariantStyles(variant, isDisabled);

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <Pressable
        onPress={isDisabled ? undefined : onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: isDisabled, busy: isLoading }}
        style={[
          styles.base,
          { height: heightMap[size] },
          variantStyles.container,
        ]}
      >
        {isLoading ? (
          <ActivityIndicator
            color={variant === 'primary' || variant === 'destructive' ? '#ffffff' : colors.brand.primary}
            size="small"
          />
        ) : (
          <Text style={[styles.label, variantStyles.label]}>{label}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getVariantStyles(variant: Variant, disabled: boolean) {
  if (disabled && variant === 'primary') {
    return {
      container: { backgroundColor: components.button.primary.disabledBg },
      label:     { color: components.button.primary.disabledColor },
    };
  }

  const map = {
    primary: {
      container: { backgroundColor: components.button.primary.backgroundColor },
      label:     { color: components.button.primary.color },
    },
    secondary: {
      container: {
        backgroundColor: components.button.secondary.backgroundColor,
        borderWidth:     components.button.secondary.borderWidth,
        borderColor:     components.button.secondary.borderColor,
      },
      label: { color: components.button.secondary.color },
    },
    destructive: {
      container: { backgroundColor: components.button.destructive.backgroundColor },
      label:     { color: components.button.destructive.color },
    },
    ghost: {
      container: { backgroundColor: components.button.ghost.backgroundColor },
      label:     { color: components.button.ghost.color },
    },
  };

  return map[variant];
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  base: {
    borderRadius:    components.button.borderRadius,
    alignItems:      'center',
    justifyContent:  'center',
    paddingHorizontal: components.button.paddingH,
  },
  label: {
    ...textStyles.bodyLg,
    fontFamily:    components.button.fontStyle.fontFamily,
    letterSpacing: components.button.fontStyle.letterSpacing,
  },
});

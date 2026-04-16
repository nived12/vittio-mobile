import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { components } from '../../theme';

// ── Types ──────────────────────────────────────────────────────────────────

type Variant = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  variant?: Variant;
  action?: {
    label: string;
    onPress: () => void;
  };
  onDismiss?: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────

export function Toast({ message, variant = 'info', action, onDismiss }: ToastProps) {
  const translateY = useRef(new Animated.Value(20)).current;
  const opacity    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Slide up + fade in
    Animated.parallel([
      Animated.spring(translateY, {
        toValue:        0,
        damping:        15,
        stiffness:      200,
        mass:           0.8,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue:         1,
        duration:        250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  const variantStyle = components.toast[variant];
  const iconName     = getIconName(variant);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: variantStyle.backgroundColor,
          borderColor:     variantStyle.borderColor,
          borderWidth:     variantStyle.borderWidth,
          transform:       [{ translateY }],
          opacity,
        },
      ]}
      accessibilityLiveRegion="assertive"
      accessibilityRole="alert"
    >
      <Feather
        name={iconName}
        size={components.toast.iconSize}
        color={variantStyle.iconColor}
        style={styles.icon}
      />
      <View style={styles.content}>
        <Text style={[styles.message, { color: variantStyle.textColor }]}>
          {message}
        </Text>
        {action != null && (
          <TouchableOpacity onPress={action.onPress} style={styles.actionButton}>
            <Text style={[styles.actionText, { color: variantStyle.textColor }]}>
              {action.label}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      {onDismiss != null && (
        <TouchableOpacity
          onPress={onDismiss}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Dismiss"
          accessibilityRole="button"
        >
          <Feather name="x" size={16} color={variantStyle.iconColor} />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getIconName(variant: Variant): React.ComponentProps<typeof Feather>['name'] {
  const map: Record<Variant, React.ComponentProps<typeof Feather>['name']> = {
    success: 'check-circle',
    error:   'alert-circle',
    warning: 'alert-triangle',
    info:    'info',
  };
  return map[variant];
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection:    'row',
    alignItems:       'center',
    borderRadius:     components.toast.borderRadius,
    paddingVertical:  components.toast.paddingV,
    paddingHorizontal: components.toast.paddingH,
    maxWidth:         components.toast.maxWidth,
    alignSelf:        'center',
  },
  icon: {
    marginRight: 8,
  },
  content: {
    flex: 1,
  },
  message: {
    fontFamily: components.toast.fontFamily,
    fontSize:   components.toast.fontSize,
    lineHeight: 20,
    flexShrink: 1,
  },
  actionButton: {
    marginTop: 4,
  },
  actionText: {
    fontFamily:  'Inter_600SemiBold',
    fontSize:    13,
    lineHeight:  18,
    textDecorationLine: 'underline',
  },
});

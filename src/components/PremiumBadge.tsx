import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Crown } from 'phosphor-react-native';

interface PremiumBadgeProps {
  style?: ViewStyle;
}

export function PremiumBadge({ style }: PremiumBadgeProps) {
  return (
    <View style={[styles.badge, style]} pointerEvents="none">
      <Crown size={10} color="#ffffff" weight="fill" />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#d97706',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
});

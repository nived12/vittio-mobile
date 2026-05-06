import { Easing } from 'react-native-reanimated';

export const Springs = {
  // Modal entry/exit (AddEditTransactionModal, ProfileBottomSheet, FilterSheet)
  modal: {
    stiffness: 300,
    damping: 28,
    mass: 0.8,
  },
  // Bottom sheet slide-up (sheets anchored to bottom)
  bottomSheet: {
    stiffness: 280,
    damping: 26,
    mass: 0.9,
  },
  // Tab icon scale on press (micro-interaction)
  tabPress: {
    stiffness: 400,
    damping: 34,
    mass: 0.6,
  },
  // Card mount animation (entrance from slightly below)
  cardMount: {
    stiffness: 250,
    damping: 30,
    mass: 1.0,
  },
} as const;

// Count-up for balance figure
export const BalanceCountUp = {
  duration: 800,
  easing: Easing.out(Easing.cubic),
};

// Standard fade-in for skeleton → content transitions
export const FadeIn = {
  duration: 200,
  easing: Easing.out(Easing.ease),
};

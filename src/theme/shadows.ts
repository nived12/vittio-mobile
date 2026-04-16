import { Platform } from 'react-native';

type ShadowStyle = {
  shadowColor?: string;
  shadowOffset?: { width: number; height: number };
  shadowOpacity?: number;
  shadowRadius?: number;
  elevation?: number;
};

function shadow(
  color: string,
  offset: { width: number; height: number },
  opacity: number,
  radius: number,
  elevation: number,
): ShadowStyle {
  return (
    Platform.select({
      ios: { shadowColor: color, shadowOffset: offset, shadowOpacity: opacity, shadowRadius: radius },
      android: { elevation },
      default: { shadowColor: color, shadowOffset: offset, shadowOpacity: opacity, shadowRadius: radius, elevation },
    }) ?? {}
  );
}

export const shadows = {
  // none — flat card (production style, matches web component files)
  none: {} as ShadowStyle,

  // sm — subtle lift (mobile cards, input containers)
  sm: shadow('#0f172a', { width: 0, height: 1 }, 0.05, 2, 1),

  // md — card hover / bottom nav
  md: shadow('#0f172a', { width: 0, height: 4 }, 0.08, 8, 4),

  // lg — modals, sheets
  lg: shadow('#0f172a', { width: 0, height: 10 }, 0.10, 16, 8),

  // xl — elevated overlays
  xl: shadow('#0f172a', { width: 0, height: 20 }, 0.12, 24, 12),

  // fab — indigo-colored shadow for the FAB
  fab: Platform.select({
    ios: {
      shadowColor: '#4f46e5',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
    },
    android: { elevation: 8 },
    default: {
      shadowColor: '#4f46e5',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 8,
    },
  }) as ShadowStyle,

  // tabBar — upward shadow for bottom nav
  tabBar: Platform.select({
    ios: {
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
    },
    android: { elevation: 16 },
    default: {
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 16,
    },
  }) as ShadowStyle,
} as const;

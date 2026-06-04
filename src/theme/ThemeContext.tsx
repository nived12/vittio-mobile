import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { colors, darkColors, ThemeTokens } from './colors';
import { useUIStore } from '../stores/uiStore';

export type ColorSchemePreference = 'system' | 'light' | 'dark';

const ThemeContext = createContext<{
  theme: ThemeTokens;
  isDark: boolean;
}>({ theme: colors, isDark: false });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const colorScheme = useUIStore((s) => s.colorScheme);

  const resolved: 'light' | 'dark' =
    colorScheme === 'system'
      ? (systemScheme === 'dark' ? 'dark' : 'light')
      : colorScheme;

  const isDark = resolved === 'dark';
  const theme: ThemeTokens = isDark ? darkColors : colors;

  // Stable reference — without this, every parent re-render produces a new
  // value object and every useTheme() consumer re-renders, which on a 5-tab
  // app cascades into a full subtree re-render on every interaction.
  const value = useMemo(() => ({ theme, isDark }), [theme, isDark]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import { colors, darkColors } from './colors';
import { useUIStore } from '../stores/uiStore';

export type ColorSchemePreference = 'system' | 'light' | 'dark';

// The resolved theme is always either light tokens or dark tokens
export type ResolvedTheme = typeof colors | typeof darkColors;

const ThemeContext = createContext<{
  theme: ResolvedTheme;
  isDark: boolean;
}>({ theme: colors, isDark: false });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null
  const colorScheme = useUIStore((s) => s.colorScheme);

  const resolved: 'light' | 'dark' =
    colorScheme === 'system'
      ? (systemScheme === 'dark' ? 'dark' : 'light')
      : colorScheme;

  const isDark = resolved === 'dark';
  const theme = isDark ? darkColors : colors;

  return (
    <ThemeContext.Provider value={{ theme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

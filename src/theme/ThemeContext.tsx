import React, { createContext, useContext } from 'react';
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

  return (
    <ThemeContext.Provider value={{ theme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

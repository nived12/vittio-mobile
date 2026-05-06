import { useMemo } from 'react';
import { ImageStyle, TextStyle, ViewStyle } from 'react-native';
import { useTheme } from './ThemeContext';
import { ThemeTokens } from './colors';

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

/**
 * Returns memoized styles derived from the current theme. Replaces inline
 * `isDark ? theme.X : 'fallback'` ternaries with a single declarative call.
 *
 * Usage:
 *   const styles = useThemedStyles((t) => ({
 *     container: { backgroundColor: t.background },
 *     title:    { color: t.textPrimary },
 *   }));
 */
export function useThemedStyles<T extends NamedStyles<T>>(
    factory: (theme: ThemeTokens) => T,
): T {
    const { theme } = useTheme();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return useMemo(() => factory(theme), [theme, factory]);
}

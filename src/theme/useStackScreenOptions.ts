import { useMemo } from 'react';
import { useTheme } from './ThemeContext';

/**
 * React Navigation paints each screen's container from its own theme, which
 * defaults to white because the app installs no navigation theme. That white is
 * what shows wherever a screen's own background does not reach — most visibly
 * along the bottom once the keyboard has resized the window under edge-to-edge.
 * Every Stack needs it, so it lives here rather than in seven layouts.
 */
export function useStackScreenOptions() {
  const { theme } = useTheme();
  return useMemo(
    () => ({
      headerShown: false as const,
      contentStyle: { backgroundColor: theme.background },
    }),
    [theme.background],
  );
}

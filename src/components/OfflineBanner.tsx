import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { useTranslation } from 'react-i18next';
import { CloudOff } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { spacing, textStyles } from '../theme';

// Tracks connectivity across platforms. On native we use NetInfo (the real
// device signal, incl. reachability). On web — the Expo-web/mobile-web fallback
// — the correct primitive is the standard window online/offline events plus
// navigator.onLine; NetInfo's web layer wraps the same events but layers a
// reachability probe on top that muddies the signal, so we read them directly.
function useIsOffline(): boolean {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const nav = typeof navigator !== 'undefined' ? navigator : undefined;
      setOffline(nav?.onLine === false);
      const goOffline = () => setOffline(true);
      const goOnline = () => setOffline(false);
      window.addEventListener('offline', goOffline);
      window.addEventListener('online', goOnline);
      return () => {
        window.removeEventListener('offline', goOffline);
        window.removeEventListener('online', goOnline);
      };
    }

    const unsubscribe = NetInfo.addEventListener((state) => {
      // isInternetReachable can be null while unknown — only flag offline once
      // we're confident there's genuinely no connectivity.
      setOffline(state.isConnected === false || state.isInternetReachable === false);
    });
    return unsubscribe;
  }, []);

  return offline;
}

// Thin app-wide banner shown when the device has no internet, so the user knows
// the data on screen may be stale (served from the persisted query cache — see
// src/lib/queryPersister.ts). Read-only: we only inform, we don't queue writes.
export function OfflineBanner() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const offline = useIsOffline();

  if (!offline) return null;

  return (
    <View
      style={[
        styles.banner,
        { backgroundColor: theme.warning, paddingTop: insets.top + spacing.xs },
      ]}
      accessibilityRole="alert"
    >
      <CloudOff size={16} color="#ffffff" />
      <Text style={styles.text}>{t('offline.banner')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  text: {
    ...textStyles.caption,
    color: '#ffffff',
    fontWeight: '600',
  },
});

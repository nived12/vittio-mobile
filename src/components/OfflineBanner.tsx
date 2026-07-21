import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { useTranslation } from 'react-i18next';
import { CloudOff } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { spacing, textStyles } from '../theme';

// Thin app-wide banner shown when the device has no internet, so the user knows
// the data on screen may be stale (served from the persisted query cache — see
// src/lib/queryPersister.ts). Read-only: we only inform, we don't queue writes.
export function OfflineBanner() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      // isInternetReachable can be null while unknown — only flag offline once
      // we're confident there's genuinely no connectivity.
      setOffline(state.isConnected === false || state.isInternetReachable === false);
    });
    return unsubscribe;
  }, []);

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

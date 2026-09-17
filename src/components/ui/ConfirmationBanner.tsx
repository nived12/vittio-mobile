import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';
import { authApi } from '../../api/auth';
import { useUIStore } from '../../stores/uiStore';
import { useTheme } from '../../theme/ThemeContext';

export function ConfirmationBanner() {
  const { t }    = useTranslation();
  const insets   = useSafeAreaInsets();
  const setHide  = useUIStore((s) => s.setHideConfirmationBanner);
  const { isDark } = useTheme();
  // Amber-on-cream is unreadable over a dark app; mirror it rather than dim it.
  const bannerBg = isDark ? '#3b2f0b' : '#fef3c7';
  const bannerBorder = isDark ? '#5a4a12' : '#fde68a';
  const ink = isDark ? '#fcd34d' : '#92400e';
  const inkSoft = isDark ? '#fbbf24' : '#b45309';
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);

  async function handleResend() {
    if (sending || sent) return;
    setSending(true);
    try {
      await authApi.resendConfirmation();
      setSent(true);
    } catch {
      // ignore — user can try again
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={[styles.banner, { paddingTop: insets.top + 10, backgroundColor: bannerBg, borderBottomColor: bannerBorder }]}>
      <View style={styles.left}>
        <Feather name="mail" size={16} color={ink} style={styles.icon} />
        <View style={styles.textBlock}>
          <Text style={[styles.title, { color: ink }]}>{t('auth.confirmation.bannerTitle')}</Text>
          <Text style={[styles.body, { color: inkSoft }]}>
            {sent ? t('auth.confirmation.resendSuccess') : t('auth.confirmation.bannerBody')}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        {!sent && (
          <TouchableOpacity
            onPress={handleResend}
            disabled={sending}
            style={styles.resendBtn}
            accessibilityRole="button"
          >
            {sending
              ? <ActivityIndicator size="small" color={ink} />
              : <Text style={[styles.resendText, { color: ink }]}>{t('auth.confirmation.resendButton')}</Text>
            }
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => setHide(true)}
          style={styles.dismissBtn}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        >
          <Feather name="x" size={16} color={ink} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection:    'row',
    alignItems:       'center',
    justifyContent:   'space-between',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical:   10,
    gap:               8,
  },
  left: {
    flex:          1,
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           8,
  },
  icon: {
    marginTop: 1,
  },
  textBlock: {
    flex: 1,
  },
  title: {
    fontFamily: 'Inter_600SemiBold',
    fontSize:   13,
    color:      '#92400e',
  },
  body: {
    fontFamily: 'Inter_400Regular',
    fontSize:   12,
    color:      '#b45309',
    marginTop:  1,
  },
  actions: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
  },
  resendBtn: {
    paddingHorizontal: 10,
    paddingVertical:    4,
    backgroundColor:   '#fde68a',
    borderRadius:      6,
    minWidth:          44,
    alignItems:        'center',
  },
  resendText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize:   12,
    color:      '#92400e',
  },
  dismissBtn: {
    padding: 4,
  },
});

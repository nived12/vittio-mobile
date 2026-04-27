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

export function ConfirmationBanner() {
  const { t }    = useTranslation();
  const insets   = useSafeAreaInsets();
  const setHide  = useUIStore((s) => s.setHideConfirmationBanner);
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
    <View style={[styles.banner, { paddingTop: insets.top + 10 }]}>
      <View style={styles.left}>
        <Feather name="mail" size={16} color="#92400e" style={styles.icon} />
        <View style={styles.textBlock}>
          <Text style={styles.title}>{t('auth.confirmation.bannerTitle')}</Text>
          <Text style={styles.body}>
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
              ? <ActivityIndicator size="small" color="#92400e" />
              : <Text style={styles.resendText}>{t('auth.confirmation.resendButton')}</Text>
            }
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => setHide(true)}
          style={styles.dismissBtn}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        >
          <Feather name="x" size={16} color="#92400e" />
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
    backgroundColor:  '#fef3c7',
    borderBottomWidth: 1,
    borderBottomColor: '#fde68a',
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

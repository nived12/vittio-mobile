import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';

import { authApi } from '../../src/api/auth';
import { colors, spacing, textStyles } from '../../src/theme';

type ConfirmState = 'pending' | 'confirming' | 'confirmed' | 'expired';

export default function ConfirmEmailScreen() {
  const { t }    = useTranslation();
  const params   = useLocalSearchParams<{ token?: string; type?: string }>();
  const token    = params.token;
  const type     = params.type ?? 'confirmation'; // 'password_reset' | 'confirmation'

  const [state,       setState]      = useState<ConfirmState>('pending');
  const [isResending, setIsResending] = useState(false);
  const [resendSent,  setResendSent]  = useState(false);

  // Auto-confirm when a token is present in the URL
  useEffect(() => {
    if (token) {
      setState('confirming');
      authApi
        .confirmEmail(token)
        .then(() => setState('confirmed'))
        .catch(() => setState('expired'));
    }
  }, [token]);

  const handleResend = async () => {
    if (isResending) return;
    setIsResending(true);
    try {
      await authApi.resendConfirmation();
      setResendSent(true);
    } catch {
      setResendSent(false);
    } finally {
      setIsResending(false);
    }
  };

  // ── Confirming / loading ──────────────────────────────────────────────────
  if (state === 'confirming') {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
      </View>
    );
  }

  // ── Confirmed ─────────────────────────────────────────────────────────────
  if (state === 'confirmed') {
    return (
      <View style={styles.container}>
        <View style={[styles.iconCircle, styles.iconSuccess]}>
          <Feather name="check" size={32} color={colors.income} />
        </View>
        <Text style={styles.title}>{t('auth.confirmEmail.confirmedTitle')}</Text>
        <Text style={styles.subtitle}>{t('auth.confirmEmail.confirmedSubtitle')}</Text>
        <TouchableOpacity
          onPress={() => router.replace('/(auth)/login')}
          style={styles.button}
        >
          <Text style={styles.buttonText}>{t('auth.confirmEmail.continueToLogin')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Expired ───────────────────────────────────────────────────────────────
  if (state === 'expired') {
    return (
      <View style={styles.container}>
        <View style={[styles.iconCircle, styles.iconError]}>
          <Feather name="x" size={32} color={colors.expense} />
        </View>
        <Text style={styles.title}>{t('auth.confirmEmail.expiredTitle')}</Text>
        <Text style={styles.subtitle}>{t('auth.confirmEmail.expiredSubtitle')}</Text>
        <TouchableOpacity
          onPress={handleResend}
          style={styles.button}
          disabled={isResending || resendSent}
        >
          {isResending ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>
              {resendSent
                ? t('auth.confirmation.resendSuccess')
                : t('auth.confirmEmail.requestNewLink')}
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.replace('/(auth)/login')}
          style={styles.backLink}
        >
          <Text style={styles.backLinkText}>{t('auth.confirmEmail.backToLogin')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Pending (email sent but no token yet) ─────────────────────────────────
  return (
    <View style={styles.container}>
      <View style={[styles.iconCircle, styles.iconPrimary]}>
        <Feather name="mail" size={32} color={colors.brand.primary} />
      </View>
      <Text style={styles.title}>{t('auth.confirmEmail.title')}</Text>
      <Text style={styles.subtitle}>
        {type === 'password_reset'
          ? t('auth.confirmEmail.subtitlePasswordReset')
          : t('auth.confirmEmail.subtitle')}
      </Text>

      {!resendSent ? (
        <TouchableOpacity
          onPress={handleResend}
          style={styles.resendButton}
          disabled={isResending}
        >
          {isResending ? (
            <ActivityIndicator size="small" color={colors.brand.primary} />
          ) : (
            <Text style={styles.resendButtonText}>
              {t('auth.confirmEmail.resendButton')}
            </Text>
          )}
        </TouchableOpacity>
      ) : (
        <Text style={styles.resendSuccess}>
          {t('auth.confirmation.resendSuccess')}
        </Text>
      )}

      <TouchableOpacity
        onPress={() => router.replace('/(auth)/login')}
        style={styles.backLink}
      >
        <Text style={styles.backLinkText}>{t('auth.confirmEmail.backToLogin')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex:            1,
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: colors.bg.screen,
    paddingHorizontal: spacing.screenPaddingH,
  },
  iconCircle: {
    width:          80,
    height:         80,
    borderRadius:   40,
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   spacing.lg,
  },
  iconSuccess: {
    backgroundColor: colors.success.bg,
  },
  iconError: {
    backgroundColor: colors.error.bg,
  },
  iconPrimary: {
    backgroundColor: colors.brand.primaryLight,
  },
  title: {
    ...textStyles.headingLg,
    color:        colors.text.primary,
    textAlign:    'center',
    marginBottom: 8,
  },
  subtitle: {
    ...textStyles.bodyMd,
    color:        colors.text.secondary,
    textAlign:    'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  button: {
    height:          52,
    borderRadius:    12,
    backgroundColor: colors.brand.primary,
    alignItems:      'center',
    justifyContent:  'center',
    paddingHorizontal: 32,
    marginBottom:    spacing.md,
  },
  buttonText: {
    color:      '#ffffff',
    fontFamily: 'Inter_600SemiBold',
    fontSize:   16,
  },
  resendButton: {
    paddingVertical:   12,
    paddingHorizontal: 24,
  },
  resendButtonText: {
    ...textStyles.bodyMd,
    color: colors.brand.primary,
  },
  resendSuccess: {
    ...textStyles.bodyMd,
    color: colors.income,
  },
  backLink: {
    marginTop:      spacing.lg,
    paddingVertical: 12,
  },
  backLinkText: {
    ...textStyles.bodySm,
    color: colors.neutral[500],
  },
});

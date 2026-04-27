import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react-native';
import { colors, spacing, textStyles } from '../theme';
import { useBiometricLock } from '../hooks/useBiometricLock';

interface Props {
  onUnlock: () => void;
}

export function BiometricLockScreen({ onUnlock }: Props) {
  const { t }            = useTranslation();
  const { authenticate, isSupported } = useBiometricLock();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [failed,           setFailed]           = useState(false);

  const tryAuth = useCallback(async () => {
    // If biometrics aren't enrolled on this device, skip the lock
    if (!isSupported) {
      onUnlock();
      return;
    }
    setIsAuthenticating(true);
    setFailed(false);
    const success = await authenticate();
    setIsAuthenticating(false);
    if (success) {
      onUnlock();
    } else {
      setFailed(true);
    }
  }, [authenticate, isSupported, onUnlock]);

  // Auto-trigger on mount
  useEffect(() => {
    void tryAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.overlay}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Lock size={32} color={colors.brand.primary} strokeWidth={2} />
        </View>

        <Text style={styles.title}>{t('auth.biometric.lockTitle')}</Text>
        <Text style={styles.subtitle}>{t('auth.biometric.lockSubtitle')}</Text>

        {isAuthenticating ? (
          <ActivityIndicator
            size="large"
            color={colors.brand.primary}
            style={styles.spinner}
          />
        ) : (
          <TouchableOpacity
            style={styles.button}
            onPress={tryAuth}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>
              {failed
                ? t('auth.biometric.tryAgain')
                : t('auth.biometric.unlock')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bg.screen,
    zIndex:          999,
    alignItems:      'center',
    justifyContent:  'center',
  },
  content: {
    alignItems:      'center',
    paddingHorizontal: spacing.screenPaddingH,
  },
  iconCircle: {
    width:           80,
    height:          80,
    borderRadius:    40,
    backgroundColor: colors.brand.primaryLight,
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    spacing.lg,
  },
  title: {
    ...textStyles.headingLg,
    color:        colors.text.primary,
    marginBottom: spacing.xs,
    textAlign:    'center',
  },
  subtitle: {
    ...textStyles.bodyMd,
    color:        colors.text.secondary,
    marginBottom: spacing.xl,
    textAlign:    'center',
  },
  spinner: {
    marginTop: spacing.md,
  },
  button: {
    backgroundColor: colors.brand.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical:   spacing.md,
    borderRadius:      12,
    minWidth:          160,
    alignItems:        'center',
  },
  buttonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize:   16,
    color:      '#ffffff',
  },
});

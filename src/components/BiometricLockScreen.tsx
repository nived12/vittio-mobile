import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react-native';
import { spacing, textStyles } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { useBiometricLock } from '../hooks/useBiometricLock';

interface Props {
  onUnlock: () => void;
}

export function BiometricLockScreen({ onUnlock }: Props) {
  const { t }            = useTranslation();
  const { theme }        = useTheme();
  const { authenticate, status } = useBiometricLock();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [failed,           setFailed]           = useState(false);
  const autoTriggered = useRef(false);

  const tryAuth = useCallback(async () => {
    setIsAuthenticating(true);
    setFailed(false);
    const success = await authenticate();
    setIsAuthenticating(false);
    if (success) {
      onUnlock();
    } else {
      setFailed(true);
    }
  }, [authenticate, onUnlock]);

  // Keyed on status, not []: the hardware probe is async, so an effect that ran
  // on mount would read 'checking' and fall through the gate without prompting.
  useEffect(() => {
    if (status === 'checking' || autoTriggered.current) return;
    autoTriggered.current = true;
    if (status === 'unsupported') {
      onUnlock(); // Nothing enrolled on this device — never strand the user out.
      return;
    }
    void tryAuth();
  }, [status, tryAuth, onUnlock]);

  return (
    <View style={[styles.overlay, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: theme.primaryLight }]}>
          <Lock size={32} color={theme.primary} strokeWidth={2} />
        </View>

        <Text style={[styles.title, { color: theme.textPrimary }]}>
          {t('auth.biometric.lockTitle')}
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {t('auth.biometric.lockSubtitle')}
        </Text>

        {isAuthenticating || status === 'checking' ? (
          <ActivityIndicator
            size="large"
            color={theme.primary}
            style={styles.spinner}
          />
        ) : (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.primary }]}
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
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    spacing.lg,
  },
  title: {
    ...textStyles.headingLg,
    marginBottom: spacing.xs,
    textAlign:    'center',
  },
  subtitle: {
    ...textStyles.bodyMd,
    marginBottom: spacing.xl,
    textAlign:    'center',
  },
  spinner: {
    marginTop: spacing.md,
  },
  button: {
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

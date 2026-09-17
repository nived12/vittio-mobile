import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export type BiometricType = 'faceId' | 'touchId' | 'biometrics' | 'none';

/**
 * 'checking' exists because the hardware probe is a native round-trip. A plain
 * boolean starts false, and a caller that decides on mount reads "unsupported"
 * before the probe answers — which silently skipped the lock screen entirely.
 */
export type BiometricStatus = 'checking' | 'supported' | 'unsupported';

interface UseBiometricLockReturn {
  status:        BiometricStatus;
  isSupported:   boolean;
  biometricType: BiometricType;
  authenticate:  () => Promise<boolean>;
}

/**
 * Lazy-load expo-local-authentication so the app doesn't crash in Expo Go
 * (where native modules are unavailable). Returns null when not available.
 */
function getLocalAuth() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-local-authentication') as typeof import('expo-local-authentication');
  } catch {
    return null;
  }
}

export function useBiometricLock(): UseBiometricLockReturn {
  const { t } = useTranslation();
  const [status,        setStatus]        = useState<BiometricStatus>('checking');
  const [biometricType, setBiometricType] = useState<BiometricType>('none');
  const isSupported = status === 'supported';

  useEffect(() => {
    async function check() {
      const LA = getLocalAuth();
      if (!LA) {
        setStatus('unsupported'); // Expo Go or simulator without native module
        return;
      }

      try {
        const hasHardware = await LA.hasHardwareAsync();
        const isEnrolled  = await LA.isEnrolledAsync();
        const supported   = hasHardware && isEnrolled;
        setStatus(supported ? 'supported' : 'unsupported');

        if (supported) {
          const types = await LA.supportedAuthenticationTypesAsync();
          if (types.includes(LA.AuthenticationType.FACIAL_RECOGNITION)) {
            setBiometricType('faceId');
          } else if (types.includes(LA.AuthenticationType.FINGERPRINT)) {
            setBiometricType('touchId');
          } else {
            setBiometricType('biometrics');
          }
        }
      } catch {
        // Native module present but check failed — treat as unsupported
        setStatus('unsupported');
      }
    }
    void check();
  }, []);

  const authenticate = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return true; // Nothing to gate — let through

    const LA = getLocalAuth();
    if (!LA) return true;

    try {
      const result = await LA.authenticateAsync({
        promptMessage:         t('auth.biometric.prompt'),
        cancelLabel:           t('auth.biometric.cancel'),
        disableDeviceFallback: false,
      });
      return result.success;
    } catch {
      return false;
    }
  }, [isSupported, t]);

  return { status, isSupported, biometricType, authenticate };
}

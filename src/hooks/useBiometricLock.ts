import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export type BiometricType = 'faceId' | 'touchId' | 'biometrics' | 'none';

interface UseBiometricLockReturn {
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
  const [isSupported,   setIsSupported]   = useState(false);
  const [biometricType, setBiometricType] = useState<BiometricType>('none');

  useEffect(() => {
    async function check() {
      const LA = getLocalAuth();
      if (!LA) return; // Expo Go or simulator without native module

      try {
        const hasHardware = await LA.hasHardwareAsync();
        const isEnrolled  = await LA.isEnrolledAsync();
        const supported   = hasHardware && isEnrolled;
        setIsSupported(supported);

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
        setIsSupported(false);
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

  return { isSupported, biometricType, authenticate };
}

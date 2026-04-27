import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../api/auth';

/**
 * Returns a gate function. Call it with the action to run if the user is confirmed.
 * If unconfirmed, shows an Alert with a resend option instead.
 *
 * Usage:
 *   const requireConfirmed = useRequireConfirmed();
 *   <Button onPress={() => requireConfirmed(() => setShowModal(true))} />
 */
export function useRequireConfirmed(): (onConfirmed: () => void) => void {
  const { t } = useTranslation();
  const user  = useAuthStore((s) => s.user);

  return (onConfirmed: () => void) => {
    if (user?.confirmed) {
      onConfirmed();
      return;
    }

    Alert.alert(
      t('auth.confirmation.requiredTitle'),
      t('auth.confirmation.requiredBody'),
      [
        {
          text:    t('auth.confirmation.resendButton'),
          onPress: () => { void authApi.resendConfirmation(); },
        },
        { text: 'OK', style: 'cancel' },
      ],
    );
  };
}

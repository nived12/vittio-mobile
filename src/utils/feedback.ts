import { Alert, Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import i18n from '../i18n';
import { useAuthStore } from '../stores/authStore';

const SUPPORT_EMAIL = 'support@vitt.io';

type FeedbackKind = 'feedback' | 'bug';

function buildBody(kind: FeedbackKind): string {
  const user = useAuthStore.getState().user;
  const appVersion = Constants.expoConfig?.version ?? 'unknown';
  const buildNumber =
    Platform.OS === 'ios'
      ? Constants.expoConfig?.ios?.buildNumber
      : String(Constants.expoConfig?.android?.versionCode ?? '');
  const locale = i18n.language || 'es';

  const intro =
    kind === 'bug'
      ? i18n.t('settings.reportBug') + ':'
      : i18n.t('settings.sendFeedback') + ':';

  const separator =
    locale.startsWith('es')
      ? '\n\n---\nNo borres lo de abajo, nos ayuda a investigar.\n'
      : '\n\n---\nPlease keep the info below — it helps us investigate.\n';

  const context =
    `App: Vittio ${appVersion} (${buildNumber || '—'})\n` +
    `Platform: ${Platform.OS} ${Platform.Version}\n` +
    `User: ${user?.id ?? 'anonymous'}\n` +
    `Locale: ${locale}`;

  return `\n\n${intro}\n\n[ ]${separator}${context}`;
}

async function openMailto(subject: string, body: string): Promise<void> {
  const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;

  const can = await Linking.canOpenURL(url).catch(() => false);
  if (!can) {
    Alert.alert(
      i18n.t('settings.feedbackMailtoUnavailableTitle'),
      i18n.t('settings.feedbackMailtoUnavailableMessage', { email: SUPPORT_EMAIL })
    );
    return;
  }
  await Linking.openURL(url);
}

export function sendBetaFeedback(): Promise<void> {
  return openMailto('[Vittio Beta] Comentarios', buildBody('feedback'));
}

export function reportBetaBug(): Promise<void> {
  return openMailto('[Vittio Bug] Problema', buildBody('bug'));
}

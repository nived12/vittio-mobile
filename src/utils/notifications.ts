import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { registerDevice, unregisterDevice } from '../api/devices';

const PUSH_TOKEN_KEY = 'vittio_push_token';

async function storePushToken(token: string): Promise<void> {
  if (Platform.OS === 'web') return;
  await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
}

async function getStoredPushToken(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    return await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
  } catch {
    return null;
  }
}

async function clearStoredPushToken(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export async function registerForPushNotifications(): Promise<string | null> {
  // Web is handled separately via ServiceWorker
  if (Platform.OS === 'web') return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;

  if (existing !== 'granted') {
    const { status: requested } = await Notifications.requestPermissionsAsync();
    status = requested;
  }

  if (status !== 'granted') return null;

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as any).easConfig?.projectId;

    const tokenData = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();

    const pushToken = tokenData.data;
    const platform = Platform.OS as 'ios' | 'android';

    await registerDevice(pushToken, platform);
    await storePushToken(pushToken);

    return pushToken;
  } catch (error) {
    // console.error is not suppressed in production — visible in crash reporters.
    // Route to Sentry in Phase 14 instead of relying on console.
    console.error('Push token registration failed:', error);
    return null;
  }
}

export async function deregisterPushNotifications(): Promise<void> {
  try {
    const pushToken = await getStoredPushToken();
    if (!pushToken) return;

    await unregisterDevice(pushToken);
    await clearStoredPushToken();
  } catch (error) {
    // Best-effort — don't block logout
    if (__DEV__) { console.warn('Push deregistration failed:', error); }
  }
}

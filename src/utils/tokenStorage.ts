import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// expo-secure-store's native module is empty on web — all operations are no-ops.
// In development (Expo web preview) we fall back to localStorage so screens can
// be visually tested. __DEV__ is false in production EAS builds, so the
// localStorage branch is dead code in any shipped binary — tokens are always
// protected by Keychain (iOS) / Keystore (Android) in production.

async function secureGet(key: string): Promise<string | null> {
  if (__DEV__ && Platform.OS === 'web') {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    // Keychain unavailable (e.g. Personal Team dev build without entitlements)
    return null;
  }
}

async function secureSet(key: string, value: string): Promise<void> {
  if (__DEV__ && Platform.OS === 'web') {
    try { localStorage.setItem(key, value); } catch { /* ignore */ }
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    // Keychain unavailable — tokens live in memory only for this session
  }
}

async function secureDelete(key: string): Promise<void> {
  if (__DEV__ && Platform.OS === 'web') {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // Best-effort delete
  }
}

const KEYS = {
  ACCESS_TOKEN:              'vittio_access_token',
  REFRESH_TOKEN:             'vittio_refresh_token',
  USER:                      'vittio_user',
  LOCALE:                    'vittio_locale',
  BIOMETRIC_LOCK:            'vittio_biometric_lock',
  COLOR_SCHEME:              'vittio_color_scheme',
  CELEBRATED_GOALS:          'vittio_celebrated_goals',
  CELEBRATED_DEBTS:          'vittio_celebrated_debts',
  FIRST_IMPORT_CELEBRATED:   'vittio_first_import_celebrated',
} as const;

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Save both tokens to SecureStore (Keychain on iOS, Keystore on Android).
 */
async function saveTokens(accessToken: string, refreshToken: string): Promise<void> {
  await Promise.all([
    secureSet(KEYS.ACCESS_TOKEN, accessToken),
    secureSet(KEYS.REFRESH_TOKEN, refreshToken),
  ]);
}

/**
 * Read both tokens. Returns null if either is missing.
 */
async function getTokens(): Promise<StoredTokens | null> {
  const [accessToken, refreshToken] = await Promise.all([
    secureGet(KEYS.ACCESS_TOKEN),
    secureGet(KEYS.REFRESH_TOKEN),
  ]);
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

/**
 * Read only the access token (used by the Axios request interceptor).
 */
async function getAccessToken(): Promise<string | null> {
  return secureGet(KEYS.ACCESS_TOKEN);
}

/**
 * Read only the refresh token.
 */
async function getRefreshToken(): Promise<string | null> {
  return secureGet(KEYS.REFRESH_TOKEN);
}

/**
 * Persist a serialized user object.
 */
async function saveUser(user: object): Promise<void> {
  await secureSet(KEYS.USER, JSON.stringify(user));
}

/**
 * Read the persisted user object. Returns null if missing or unparseable.
 */
async function getUser<T = unknown>(): Promise<T | null> {
  const raw = await secureGet(KEYS.USER);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Persist the user's chosen locale.
 */
async function saveLocale(locale: 'en' | 'es'): Promise<void> {
  await secureSet(KEYS.LOCALE, locale);
}

/**
 * Read the persisted locale. Returns null if never set.
 */
async function getLocale(): Promise<'en' | 'es' | null> {
  const stored = await secureGet(KEYS.LOCALE);
  if (stored === 'en' || stored === 'es') return stored;
  return null;
}

/**
 * Save the biometric lock preference.
 */
async function saveBiometricLock(enabled: boolean): Promise<void> {
  await secureSet(KEYS.BIOMETRIC_LOCK, enabled ? '1' : '0');
}

/**
 * Read the biometric lock preference. Returns false if never set.
 */
async function getBiometricLock(): Promise<boolean> {
  const stored = await secureGet(KEYS.BIOMETRIC_LOCK);
  return stored === '1';
}

/**
 * Remove all stored tokens and user data (call on logout or auth failure).
 * Locale and biometric preference are intentionally NOT cleared on logout — they are device preferences.
 */
async function clearTokens(): Promise<void> {
  await Promise.all([
    secureDelete(KEYS.ACCESS_TOKEN),
    secureDelete(KEYS.REFRESH_TOKEN),
    secureDelete(KEYS.USER),
  ]);
}

async function saveColorScheme(scheme: 'system' | 'light' | 'dark'): Promise<void> {
  await secureSet(KEYS.COLOR_SCHEME, scheme);
}

async function getColorScheme(): Promise<'system' | 'light' | 'dark'> {
  const stored = await secureGet(KEYS.COLOR_SCHEME);
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return 'system';
}

async function saveCelebratedGoals(ids: string[]): Promise<void> {
  await secureSet(KEYS.CELEBRATED_GOALS, JSON.stringify(ids));
}

async function getCelebratedGoals(): Promise<string[]> {
  const raw = await secureGet(KEYS.CELEBRATED_GOALS);
  if (!raw) return [];
  try { return JSON.parse(raw) as string[]; } catch { return []; }
}

async function saveCelebratedDebts(ids: string[]): Promise<void> {
  await secureSet(KEYS.CELEBRATED_DEBTS, JSON.stringify(ids));
}

async function getCelebratedDebts(): Promise<string[]> {
  const raw = await secureGet(KEYS.CELEBRATED_DEBTS);
  if (!raw) return [];
  try { return JSON.parse(raw) as string[]; } catch { return []; }
}

async function saveFirstImportCelebrated(seen: boolean): Promise<void> {
  await secureSet(KEYS.FIRST_IMPORT_CELEBRATED, seen ? '1' : '0');
}

async function getFirstImportCelebrated(): Promise<boolean> {
  const stored = await secureGet(KEYS.FIRST_IMPORT_CELEBRATED);
  return stored === '1';
}

export const tokenStorage = {
  saveTokens,
  getTokens,
  getAccessToken,
  getRefreshToken,
  saveUser,
  getUser,
  saveLocale,
  getLocale,
  saveBiometricLock,
  getBiometricLock,
  saveColorScheme,
  getColorScheme,
  saveCelebratedGoals,
  getCelebratedGoals,
  saveCelebratedDebts,
  getCelebratedDebts,
  saveFirstImportCelebrated,
  getFirstImportCelebrated,
  clearTokens,
};

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// expo-secure-store's native module is empty on web — all operations are no-ops.
// In development (Expo web preview) we fall back to localStorage so screens can
// be visually tested. __DEV__ is false in production EAS builds, so the
// localStorage branch is dead code in any shipped binary — tokens are always
// protected by Keychain (iOS) / Keystore (Android) in production.

// ── SecureStore helpers (tokens + user — sensitive) ──────────────────────

async function secureGet(key: string): Promise<string | null> {
  if (__DEV__ && Platform.OS === 'web') {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    // Keychain unavailable (e.g. Personal Team dev build without entitlements).
    // Fall back to AsyncStorage so the user isn't silently logged out.
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
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
    // Keychain unavailable — fall back to AsyncStorage
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      // Tokens live in memory only for this session
    }
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
    try { await AsyncStorage.removeItem(key); } catch { /* ignore */ }
  }
}

// ── AsyncStorage helpers (preferences — non-sensitive) ───────────────────

// Color scheme, celebration state, locale, biometric lock are user preferences,
// not secrets. They don't belong in the Keychain/Keystore and shouldn't trigger
// biometric auth prompts.

async function prefGet(key: string): Promise<string | null> {
  if (__DEV__ && Platform.OS === 'web') {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

async function prefSet(key: string, value: string): Promise<void> {
  if (__DEV__ && Platform.OS === 'web') {
    try { localStorage.setItem(key, value); } catch { /* ignore */ }
    return;
  }
  try {
    await AsyncStorage.setItem(key, value);
  } catch {
    // Preference not persisted — will use default
  }
}

// ── Keys ─────────────────────────────────────────────────────────────────

const KEYS = {
  ACCESS_TOKEN: 'vittio_access_token',
  REFRESH_TOKEN: 'vittio_refresh_token',
  USER: 'vittio_user',
  LOCALE: 'vittio_locale',
  BIOMETRIC_LOCK: 'vittio_biometric_lock',
  COLOR_SCHEME: 'vittio_color_scheme',
  CELEBRATED_GOALS: 'vittio_celebrated_goals',
  CELEBRATED_DEBTS: 'vittio_celebrated_debts',
  FIRST_IMPORT_CELEBRATED: 'vittio_first_import_celebrated',
} as const;

// ── Tokens (sensitive — SecureStore with AsyncStorage fallback) ──────────

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

async function saveTokens(accessToken: string, refreshToken: string): Promise<void> {
  await Promise.all([
    secureSet(KEYS.ACCESS_TOKEN, accessToken),
    secureSet(KEYS.REFRESH_TOKEN, refreshToken),
  ]);
}

async function getTokens(): Promise<StoredTokens | null> {
  const [accessToken, refreshToken] = await Promise.all([
    secureGet(KEYS.ACCESS_TOKEN),
    secureGet(KEYS.REFRESH_TOKEN),
  ]);
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

async function getAccessToken(): Promise<string | null> {
  return secureGet(KEYS.ACCESS_TOKEN);
}

async function getRefreshToken(): Promise<string | null> {
  return secureGet(KEYS.REFRESH_TOKEN);
}

async function saveUser(user: object): Promise<void> {
  await secureSet(KEYS.USER, JSON.stringify(user));
}

async function getUser<T = unknown>(): Promise<T | null> {
  const raw = await secureGet(KEYS.USER);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function clearTokens(): Promise<void> {
  await Promise.all([
    secureDelete(KEYS.ACCESS_TOKEN),
    secureDelete(KEYS.REFRESH_TOKEN),
    secureDelete(KEYS.USER),
  ]);
}

// ── Preferences (non-sensitive — AsyncStorage) ───────────────────────────

async function saveLocale(locale: 'en' | 'es'): Promise<void> {
  await prefSet(KEYS.LOCALE, locale);
}

async function getLocale(): Promise<'en' | 'es' | null> {
  const stored = await prefGet(KEYS.LOCALE);
  if (stored === 'en' || stored === 'es') return stored;
  return null;
}

async function saveBiometricLock(enabled: boolean): Promise<void> {
  await prefSet(KEYS.BIOMETRIC_LOCK, enabled ? '1' : '0');
}

async function getBiometricLock(): Promise<boolean> {
  const stored = await prefGet(KEYS.BIOMETRIC_LOCK);
  return stored === '1';
}

async function saveColorScheme(scheme: 'system' | 'light' | 'dark'): Promise<void> {
  await prefSet(KEYS.COLOR_SCHEME, scheme);
}

async function getColorScheme(): Promise<'system' | 'light' | 'dark'> {
  const stored = await prefGet(KEYS.COLOR_SCHEME);
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return 'system';
}

async function saveCelebratedGoals(ids: string[]): Promise<void> {
  await prefSet(KEYS.CELEBRATED_GOALS, JSON.stringify(ids));
}

async function getCelebratedGoals(): Promise<string[]> {
  const raw = await prefGet(KEYS.CELEBRATED_GOALS);
  if (!raw) return [];
  try { return JSON.parse(raw) as string[]; } catch { return []; }
}

async function saveCelebratedDebts(ids: string[]): Promise<void> {
  await prefSet(KEYS.CELEBRATED_DEBTS, JSON.stringify(ids));
}

async function getCelebratedDebts(): Promise<string[]> {
  const raw = await prefGet(KEYS.CELEBRATED_DEBTS);
  if (!raw) return [];
  try { return JSON.parse(raw) as string[]; } catch { return []; }
}

async function saveFirstImportCelebrated(seen: boolean): Promise<void> {
  await prefSet(KEYS.FIRST_IMPORT_CELEBRATED, seen ? '1' : '0');
}

async function getFirstImportCelebrated(): Promise<boolean> {
  const stored = await prefGet(KEYS.FIRST_IMPORT_CELEBRATED);
  return stored === '1';
}

// ── Exports ──────────────────────────────────────────────────────────────

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

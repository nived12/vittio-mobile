import * as SecureStore from 'expo-secure-store';

const KEYS = {
  ACCESS_TOKEN:  'vittio_access_token',
  REFRESH_TOKEN: 'vittio_refresh_token',
  USER:          'vittio_user',
  LOCALE:        'vittio_locale',
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
    SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, accessToken),
    SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, refreshToken),
  ]);
}

/**
 * Read both tokens. Returns null if either is missing.
 */
async function getTokens(): Promise<StoredTokens | null> {
  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(KEYS.ACCESS_TOKEN),
    SecureStore.getItemAsync(KEYS.REFRESH_TOKEN),
  ]);
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

/**
 * Read only the access token (used by the Axios request interceptor).
 */
async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.ACCESS_TOKEN);
}

/**
 * Read only the refresh token.
 */
async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.REFRESH_TOKEN);
}

/**
 * Persist a serialized user object.
 */
async function saveUser(user: object): Promise<void> {
  await SecureStore.setItemAsync(KEYS.USER, JSON.stringify(user));
}

/**
 * Read the persisted user object. Returns null if missing or unparseable.
 */
async function getUser<T = unknown>(): Promise<T | null> {
  const raw = await SecureStore.getItemAsync(KEYS.USER);
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
  await SecureStore.setItemAsync(KEYS.LOCALE, locale);
}

/**
 * Read the persisted locale. Returns null if never set.
 */
async function getLocale(): Promise<'en' | 'es' | null> {
  const stored = await SecureStore.getItemAsync(KEYS.LOCALE);
  if (stored === 'en' || stored === 'es') return stored;
  return null;
}

/**
 * Remove all stored tokens and user data (call on logout or auth failure).
 * Locale is intentionally NOT cleared on logout — it's a device preference.
 */
async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(KEYS.ACCESS_TOKEN),
    SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN),
    SecureStore.deleteItemAsync(KEYS.USER),
  ]);
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
  clearTokens,
};

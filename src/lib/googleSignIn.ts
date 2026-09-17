import * as WebBrowser from 'expo-web-browser';
import * as ExpoLinking from 'expo-linking';
import { Linking } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { useAuthStore } from '../stores/authStore';

export const OAUTH_REDIRECT_URI = 'vittio://auth/callback';

export type GoogleSignInOutcome = 'success' | 'cancelled' | 'failed';

/**
 * MainActivity is singleTask and the app claims the `vittio` scheme, so on
 * Android the callback can be delivered to the activity as a new intent rather
 * than to the auth session — openAuthSessionAsync then resolves 'cancel' and
 * the tokens arrive through the Linking listener instead. Whichever path wins,
 * this runs once.
 */
let consumed = false;

function buildOAuthUrl(): string {
  const apiUrl = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3000/api/v1';
  const baseUrl = apiUrl.replace(/\/api\/v1\/?$/, '');
  return `${baseUrl}/auth/google_oauth2?mobile_redirect_uri=${encodeURIComponent(OAUTH_REDIRECT_URI)}`;
}

/** Exchange a `vittio://auth/callback` URL for a session. */
async function consumeCallbackUrl(url: string): Promise<GoogleSignInOutcome> {
  if (consumed) return 'success';

  const parsed = ExpoLinking.parse(url);
  const accessToken = parsed.queryParams?.['access_token'] as string | undefined;
  const refreshToken = parsed.queryParams?.['refresh_token'] as string | undefined;
  const expiresIn = parseInt((parsed.queryParams?.['expires_in'] as string) ?? '900', 10);
  const error = parsed.queryParams?.['error'] as string | undefined;

  if (error != null) {
    Sentry.captureMessage(`Google OAuth returned error: ${error}`, 'warning');
    return 'failed';
  }
  if (!accessToken || !refreshToken) return 'failed';

  consumed = true;
  await useAuthStore.getState().loginWithGoogle({
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: expiresIn,
    token_type: 'Bearer',
  });
  return 'success';
}

/**
 * Opens the Google flow and establishes the session. Navigation is deliberately
 * left to the root layout's auth guard — a router.replace here raced it.
 */
export async function signInWithGoogle(): Promise<GoogleSignInOutcome> {
  consumed = false;

  let resolveFromLink: ((url: string) => void) | null = null;
  const linkPromise = new Promise<string>((resolve) => { resolveFromLink = resolve; });
  const subscription = Linking.addEventListener('url', (event) => {
    if (event.url.startsWith(OAUTH_REDIRECT_URI)) resolveFromLink?.(event.url);
  });

  try {
    const result = await WebBrowser.openAuthSessionAsync(buildOAuthUrl(), OAUTH_REDIRECT_URI);

    if (result.type === 'success') return await consumeCallbackUrl(result.url);

    // Not success — the URL may still be arriving via the activity's intent.
    const raced = await Promise.race([
      linkPromise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
    ]);
    if (raced) return await consumeCallbackUrl(raced);

    // A real dismissal looks identical to a swallowed callback, so record which
    // one the browser reported rather than failing silently the way this did.
    Sentry.captureMessage(`Google OAuth did not complete: ${result.type}`, 'warning');
    return result.type === 'cancel' || result.type === 'dismiss' ? 'cancelled' : 'failed';
  } finally {
    subscription.remove();
  }
}

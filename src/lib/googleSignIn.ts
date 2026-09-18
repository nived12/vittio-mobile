import * as WebBrowser from 'expo-web-browser';
import * as ExpoLinking from 'expo-linking';
import { Linking } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { useAuthStore } from '../stores/authStore';

export const OAUTH_REDIRECT_URI = 'vittio://auth/callback';

export type GoogleSignInOutcome = 'success' | 'cancelled' | 'failed';

function buildOAuthUrl(): string {
  const apiUrl = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3000/api/v1';
  const baseUrl = apiUrl.replace(/\/api\/v1\/?$/, '');
  return `${baseUrl}/auth/google_oauth2?mobile_redirect_uri=${encodeURIComponent(OAUTH_REDIRECT_URI)}`;
}

/**
 * Exchange a `vittio://auth/callback` URL for a session. `claim` gates the two
 * delivery paths (see signInWithGoogle) so only the first one to arrive logs in.
 */
async function consumeCallbackUrl(
  url: string,
  claim: () => boolean,
): Promise<GoogleSignInOutcome> {
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
  if (!claim()) return 'success'; // The other path got here first.

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
  // MainActivity is singleTask and the app claims the `vittio` scheme, so on
  // Android the callback can reach the activity as a new intent rather than the
  // auth session — openAuthSessionAsync then resolves 'cancel' and the tokens
  // arrive through the Linking listener instead. Either path can win, so the
  // first to claim it logs in. Scoped per call, not module-level, so a second
  // concurrent sign-in cannot reset another's flag.
  let consumed = false;
  const claim = () => (consumed ? false : (consumed = true));

  let resolveFromLink: ((url: string) => void) | null = null;
  const linkPromise = new Promise<string>((resolve) => { resolveFromLink = resolve; });
  const subscription = Linking.addEventListener('url', (event) => {
    if (event.url.startsWith(OAUTH_REDIRECT_URI)) resolveFromLink?.(event.url);
  });

  try {
    const result = await WebBrowser.openAuthSessionAsync(buildOAuthUrl(), OAUTH_REDIRECT_URI);

    if (result.type === 'success') return await consumeCallbackUrl(result.url, claim);

    // Not success — the URL may still be arriving via the activity's intent.
    const raced = await Promise.race([
      linkPromise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
    ]);
    if (raced) return await consumeCallbackUrl(raced, claim);

    const cancelled = result.type === 'cancel' || result.type === 'dismiss';

    // Closing the sheet is a choice, not a fault: as an issue it is indistinguishable
    // from the swallowed-callback bug this instrumentation exists to catch. Keep it
    // as context for a later failure instead. The Linking race above has already had
    // its window, so a callback that was going to arrive has arrived by now.
    Sentry.addBreadcrumb({
      category: 'auth',
      level: cancelled ? 'info' : 'warning',
      message: `Google OAuth did not complete: ${result.type}`,
    });
    if (!cancelled) {
      Sentry.captureMessage(`Google OAuth did not complete: ${result.type}`, 'warning');
    }
    return cancelled ? 'cancelled' : 'failed';
  } finally {
    subscription.remove();
  }
}

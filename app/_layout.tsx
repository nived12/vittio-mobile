import React, { useEffect, useRef, useState } from 'react';
import * as Sentry from '@sentry/react-native';
import PostHog from 'posthog-react-native';

// Suppress noisy logs in production — console.error preserved so Sentry also
// captures it via its default breadcrumbs integration.
if (!__DEV__) {
  console.log = () => {};
  console.warn = () => {};
}

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enabled: !__DEV__,
  tracesSampleRate: 0.1,
  debug: false,
});

export const analytics = process.env.EXPO_PUBLIC_POSTHOG_KEY
  ? new PostHog(process.env.EXPO_PUBLIC_POSTHOG_KEY, { host: 'https://eu.i.posthog.com' })
  : null;
import { AppState, AppStateStatus, View } from 'react-native';
import { Slot, router, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as Font from 'expo-font';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, PERSIST_MAX_AGE } from '@/lib/queryClient';
import { queryPersister } from '@/lib/queryPersister';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableFreeze } from 'react-native-screens';
import * as SystemUI from 'expo-system-ui';
import * as WebBrowser from 'expo-web-browser';

// Match the splash background so there's no white flash during the
// splash-to-first-screen transition on Android.
SystemUI.setBackgroundColorAsync('#4f46e5');

// Dismisses a web-auth popup left open when the OAuth callback returns.
WebBrowser.maybeCompleteAuthSession();

// Freeze inactive screens so off-screen tabs don't re-render when state changes
// elsewhere. Critical for low-end Android perf in a 5-tab app.
enableFreeze(true);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../src/stores/authStore';
import { useUIStore } from '../src/stores/uiStore';
import { BiometricLockScreen } from '../src/components/BiometricLockScreen';
import { AnalyticsPrivacyNotice, OPT_OUT_KEY } from '../src/components/AnalyticsPrivacyNotice';
import { OfflineBanner } from '../src/components/OfflineBanner';
import { registerForPushNotifications } from '../src/utils/notifications';
import { ThemeProvider, useTheme } from '../src/theme/ThemeContext';
import '../src/i18n'; // Initialize i18next

// Show notifications as banners when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// ── Deep-link screen whitelist — only navigate to known in-app routes ─────
const ALLOWED_SCREENS = new Set([
  '/(app)',
  '/(app)/transactions',
  '/(app)/accounts',
  '/(app)/finances',
  '/(app)/profile',
  '/(app)/notification-preferences',
  '/(app)/categories',
  '/(app)/add',
]);

function isAllowedScreen(screen: string): boolean {
  if (ALLOWED_SCREENS.has(screen)) return true;
  // Allow detail screens with numeric IDs only.
  // Update the alternation if new finances sub-routes (e.g. budgets) are added.
  return /^\/(app)\/(transactions|accounts|finances\/(goals|debts|savings))\/\d+$/.test(screen);
}

// ── Splash screen — keep visible until hydration completes ─────────────────
SplashScreen.preventAutoHideAsync();

// ── Root layout ────────────────────────────────────────────────────────────

/**
 * `style="auto"` reads the *system* scheme rather than the app's own, so
 * app-level dark mode drew dark glyphs on a dark background. Follow the
 * resolved theme instead. Must sit inside ThemeProvider to read it.
 */
function ThemedStatusBar() {
  const { theme, isDark } = useTheme();

  // The window background is set to the splash indigo at module scope and then
  // never moves. Under edge-to-edge the system bars are transparent, so that
  // stale colour is what shows through them — visible as a pale strip along the
  // bottom once the keyboard has opened and resized the window. Track the theme
  // once the tree is up; the module-scope call still covers the splash hand-off.
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(theme.background);
  }, [theme.background]);

  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

/** GestureHandlerRootView is outside ThemeProvider, so the tree's own backdrop
 *  has to be painted from in here. Without it the bare window shows through. */
function ThemedRoot({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return <View style={{ flex: 1, backgroundColor: theme.background }}>{children}</View>;
}

function RootLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const hydrate = useAuthStore((s) => s.hydrate);
  const user = useAuthStore((s) => s.user);
  const hydrateLocale = useUIStore((s) => s.hydrateLocale);
  const hydrateBiometricLock = useUIStore((s) => s.hydrateBiometricLock);
  const hydrateNotificationPrefs = useUIStore((s) => s.hydrateNotificationPrefs);
  const hydrateColorScheme = useUIStore((s) => s.hydrateColorScheme);
  const hydrateCelebrationState = useUIStore((s) => s.hydrateCelebrationState);
  const biometricLock = useUIStore((s) => s.biometricLock);

  const segments = useSegments();
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const [showLock, setShowLock] = useState(false);
  // Nothing may render until Inter is registered. Text measured with the system
  // font and then drawn in Inter comes out wider than the frame it was given, so
  // the last glyph is clipped — "Agregar cuenta" rendered as "Agregar cuent".
  // It reached production because the mis-measured layout happens *behind* the
  // splash screen, and which elements lose the race varies per launch, so it
  // never reproduced the same way twice.
  const [fontsLoaded, setFontsLoaded] = useState(false);
  // The stored locale must be applied before the screen tree mounts. i18n starts
  // on the *device* language, so a tree rendered first captures those strings —
  // and anything memoized on the `t` identity (the tab bar titles) stays frozen
  // in the wrong language for the whole session.
  const [localeReady, setLocaleReady] = useState(false);
  // Separate from isHydrated: that flag belongs to the auth store, and the
  // preference reads run alongside it rather than before it. Gating the lock on
  // isHydrated alone would race an AsyncStorage read against a network call.
  const [prefsReady, setPrefsReady] = useState(false);
  const pushRegistered = useRef(false);
  const coldStartLockEvaluated = useRef(false);

  // ── 1. Load fonts + hydrate auth on mount ──────────────────────────────
  useEffect(() => {
    async function prepare() {
      try {
        await Font.loadAsync({
          Inter_400Regular,
          Inter_500Medium,
          Inter_600SemiBold,
          Inter_700Bold,
        });
      } catch (err) {
        // Deliberately swallowed. fontsLoaded gates the entire screen tree, so a
        // throw here without the finally below would strand every user on the
        // splash screen permanently. Falling back to the system font is ugly;
        // an app that never opens is not recoverable.
        Sentry.captureException(err);
      } finally {
        setFontsLoaded(true);
      }
      try {
        const [optedOut] = await Promise.all([
          AsyncStorage.getItem(OPT_OUT_KEY),
          hydrate(),
          hydrateLocale().finally(() => setLocaleReady(true)),
          hydrateBiometricLock(),
          hydrateColorScheme(),
          hydrateCelebrationState(),
        ]);
        if (optedOut === 'true') analytics?.optOut();
      } catch (err) {
        Sentry.captureException(err);
      } finally {
        setPrefsReady(true);
      }
    }
    prepare();
  }, [hydrate, hydrateLocale, hydrateBiometricLock, hydrateColorScheme, hydrateCelebrationState]);

  // ── 2. Once hydrated: hide splash + enforce auth routing ───────────────
  useEffect(() => {
    // fontsLoaded is checked here as well as at the render gate below. Font
    // loading currently resolves before hydrate() starts, so isHydrated alone
    // happens to be sufficient — but that is an ordering coincidence inside
    // prepare(), and relying on it is what shipped the clipping bug. Reordering
    // those awaits must not be able to uncover the splash over unmeasured text.
    if (!isHydrated || !fontsLoaded || !prefsReady) return;

    // Set before hideAsync, or the dashboard is briefly visible underneath.
    // A ref, not state: re-running this effect must not re-lock mid-session.
    if (!coldStartLockEvaluated.current) {
      coldStartLockEvaluated.current = true;
      if (biometricLock && isAuthenticated) setShowLock(true);
    }

    SplashScreen.hideAsync();

    const inAuth = segments[0] === '(auth)';
    const onConsentScreen = (segments as string[])[1] === 'consent';

    if (!isAuthenticated && !inAuth) {
      router.replace('/(auth)/login');
      return;
    }

    // Authenticated but consent not given — gate before dashboard
    if (isAuthenticated) {
      if (!user?.consent_current && !onConsentScreen) {
        router.replace('/(auth)/consent' as Parameters<typeof router.replace>[0]);
        return;
      }
    }

    if (isAuthenticated && inAuth && !onConsentScreen) {
      router.replace('/(app)');
    }
  }, [isAuthenticated, isHydrated, fontsLoaded, prefsReady, biometricLock, segments, user]);

  // ── 3. Register push + hydrate server-side notification prefs after auth ─
  useEffect(() => {
    if (!isAuthenticated || !isHydrated) return;
    void hydrateNotificationPrefs();
    if (!pushRegistered.current) {
      pushRegistered.current = true;
      void registerForPushNotifications();
    }
  }, [isAuthenticated, isHydrated, hydrateNotificationPrefs]);

  // ── 4. Handle notification tap → deep-link navigation ─────────────
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as {
        screen?: string;
        params?: Record<string, unknown>;
      };
      if (data?.screen && isAllowedScreen(data.screen)) {
        router.push(data.screen as Parameters<typeof router.push>[0]);
      }
    });
    return () => subscription.remove();
  }, []);

  // ── 5. Biometric lock on app resume from background ───────────────────
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        const wasBackground =
          appState.current === 'background' ||
          appState.current === 'inactive';
        const isNowActive = nextState === 'active';

        if (wasBackground && isNowActive && biometricLock && isAuthenticated) {
          setShowLock(true);
        }
        appState.current = nextState;
      },
    );
    return () => subscription.remove();
  }, [biometricLock, isAuthenticated]);

  // The splash screen is still up at this point, so returning null shows nothing
  // new — it only keeps the screen tree from mounting and measuring text before
  // Inter exists. Every hook above runs regardless, so prepare() still completes.
  if (!fontsLoaded || !localeReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{
              persister: queryPersister,
              maxAge: PERSIST_MAX_AGE,
              // Only persist successful queries — never write error/loading
              // states to disk where they'd rehydrate as broken screens.
              dehydrateOptions: {
                shouldDehydrateQuery: (query) => query.state.status === 'success',
              },
            }}
          >
            <ThemedStatusBar />
            <ThemedRoot>
              <Slot />
            </ThemedRoot>
            <OfflineBanner />
            {showLock && (
              <BiometricLockScreen onUnlock={() => setShowLock(false)} />
            )}
            {isAuthenticated && <AnalyticsPrivacyNotice />}
          </PersistQueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);

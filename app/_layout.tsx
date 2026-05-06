import React, { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAuthStore } from '../src/stores/authStore';
import { useUIStore } from '../src/stores/uiStore';
import { BiometricLockScreen } from '../src/components/BiometricLockScreen';
import { registerForPushNotifications } from '../src/utils/notifications';
import { ThemeProvider } from '../src/theme/ThemeContext';
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

// ── Splash screen — keep visible until hydration completes ─────────────────
SplashScreen.preventAutoHideAsync();

// ── TanStack Query client ──────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 2,
      refetchOnWindowFocus: true,
      networkMode: 'offlineFirst',
    },
    mutations: {
      networkMode: 'offlineFirst',
    },
  },
});

// ── Root layout ────────────────────────────────────────────────────────────

export default function RootLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const hydrate = useAuthStore((s) => s.hydrate);
  const hydrateLocale = useUIStore((s) => s.hydrateLocale);
  const hydrateBiometricLock = useUIStore((s) => s.hydrateBiometricLock);
  const hydrateNotificationPrefs = useUIStore((s) => s.hydrateNotificationPrefs);
  const hydrateColorScheme = useUIStore((s) => s.hydrateColorScheme);
  const hydrateCelebrationState = useUIStore((s) => s.hydrateCelebrationState);
  const biometricLock = useUIStore((s) => s.biometricLock);

  const segments = useSegments();
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const [showLock, setShowLock] = useState(false);
  const pushRegistered = useRef(false);

  // ── 1. Load fonts + hydrate auth on mount ──────────────────────────────
  useEffect(() => {
    async function prepare() {
      await Font.loadAsync({
        Inter_400Regular,
        Inter_500Medium,
        Inter_600SemiBold,
        Inter_700Bold,
      });
      await Promise.all([
        hydrate(),
        hydrateLocale(),
        hydrateBiometricLock(),
        hydrateColorScheme(),
        hydrateCelebrationState(),
      ]);
    }
    prepare();
  }, [hydrate, hydrateLocale, hydrateBiometricLock, hydrateColorScheme, hydrateCelebrationState]);

  // ── 2. Once hydrated: hide splash + enforce auth routing ───────────────
  useEffect(() => {
    if (!isHydrated) return;

    SplashScreen.hideAsync();

    const inAuth = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuth) {
      router.replace('/(auth)/login');
    }
    if (isAuthenticated && inAuth) {
      router.replace('/(app)');
    }
  }, [isAuthenticated, isHydrated, segments]);

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
      if (data?.screen) {
        router.push(data.screen as any);
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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <StatusBar style="auto" />
            <Slot />
            {showLock && (
              <BiometricLockScreen onUnlock={() => setShowLock(false)} />
            )}
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

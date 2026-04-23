import React, { useEffect } from 'react';
import { Slot, router, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
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
import '../src/i18n'; // Initialize i18next

// ── Splash screen — keep visible until hydration completes ─────────────────
SplashScreen.preventAutoHideAsync();

// ── TanStack Query client ──────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:              5 * 60 * 1000, // 5 minutes
      gcTime:                 10 * 60 * 1000, // 10 minutes
      retry:                  2,
      refetchOnWindowFocus:   true,
      networkMode:            'offlineFirst',
    },
    mutations: {
      networkMode: 'offlineFirst',
    },
  },
});

// ── Root layout ────────────────────────────────────────────────────────────

export default function RootLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrated      = useAuthStore((s) => s.isHydrated);
  const hydrate         = useAuthStore((s) => s.hydrate);
  const hydrateLocale   = useUIStore((s) => s.hydrateLocale);

  const segments = useSegments();

  // ── 1. Load fonts + hydrate auth on mount ──────────────────────────────
  useEffect(() => {
    async function prepare() {
      await Font.loadAsync({
        Inter_400Regular,
        Inter_500Medium,
        Inter_600SemiBold,
        Inter_700Bold,
      });
      await Promise.all([hydrate(), hydrateLocale()]);
    }
    prepare();
  }, [hydrate]);

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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="auto" />
          <Slot />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

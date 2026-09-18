import React from 'react';
import { Stack } from 'expo-router';
import { useStackScreenOptions } from '../../src/theme/useStackScreenOptions';

export default function AuthLayout() {
  const screenOptions = useStackScreenOptions();
  return (
    <Stack screenOptions={screenOptions}>
      {/* Login is the root — no entrance animation, appears instantly */}
      <Stack.Screen name="login" options={{ animation: 'none' }} />
      <Stack.Screen name="signup" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="forgot-password" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="confirm-email" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="consent" options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
    </Stack>
  );
}

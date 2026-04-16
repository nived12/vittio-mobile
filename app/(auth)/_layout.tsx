import React from 'react';
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Login is the root — no entrance animation, appears instantly */}
      <Stack.Screen name="login" options={{ animation: 'none' }} />
      <Stack.Screen name="signup" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="forgot-password" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="confirm-email" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}

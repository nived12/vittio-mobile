import { Stack } from 'expo-router';

export default function TransactionsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="new" options={{ presentation: 'card' }} />
      <Stack.Screen name="[id]" options={{ presentation: 'card' }} />
      <Stack.Screen name="select-category" options={{ presentation: 'card' }} />
    </Stack>
  );
}

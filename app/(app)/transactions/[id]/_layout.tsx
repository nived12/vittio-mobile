import { Stack } from 'expo-router';

export default function TransactionDetailLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ presentation: 'card' }} />
      <Stack.Screen name="edit" options={{ presentation: 'card' }} />
    </Stack>
  );
}

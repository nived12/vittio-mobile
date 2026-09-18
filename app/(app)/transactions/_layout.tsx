import { Stack } from 'expo-router';
import { useStackScreenOptions } from '../../../src/theme/useStackScreenOptions';

export default function TransactionsLayout() {
  const screenOptions = useStackScreenOptions();
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" />
      <Stack.Screen name="new" options={{ presentation: 'card' }} />
      <Stack.Screen name="[id]" options={{ presentation: 'card' }} />
      <Stack.Screen name="select-category" options={{ presentation: 'card' }} />
      <Stack.Screen name="candidates" options={{ presentation: 'card' }} />
    </Stack>
  );
}

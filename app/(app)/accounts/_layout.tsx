import { Stack } from 'expo-router';
import { useStackScreenOptions } from '../../../src/theme/useStackScreenOptions';

export default function AccountsLayout() {
  const screenOptions = useStackScreenOptions();
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" options={{ presentation: 'card' }} />
    </Stack>
  );
}

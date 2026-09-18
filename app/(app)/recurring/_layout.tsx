import { Stack } from 'expo-router';
import { useStackScreenOptions } from '../../../src/theme/useStackScreenOptions';

export default function RecurringLayout() {
  const screenOptions = useStackScreenOptions();
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}

import { Stack } from 'expo-router';
import { useStackScreenOptions } from '../../../../src/theme/useStackScreenOptions';

export default function TransactionDetailLayout() {
  const screenOptions = useStackScreenOptions();
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" options={{ presentation: 'card' }} />
      <Stack.Screen name="edit" options={{ presentation: 'card' }} />
    </Stack>
  );
}

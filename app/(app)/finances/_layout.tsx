import { Stack } from 'expo-router';
import { useStackScreenOptions } from '../../../src/theme/useStackScreenOptions';

export default function FinancesLayout() {
  const screenOptions = useStackScreenOptions();
  return <Stack screenOptions={screenOptions} />;
}

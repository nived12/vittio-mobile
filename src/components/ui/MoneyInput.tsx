import React from 'react';
import { StyleProp, StyleSheet, Text, TextInput, View, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

interface MoneyInputProps {
  /** Raw numeric string, e.g. "100000" or "1234.5" — never the formatted display. */
  value: string;
  onChangeText: (raw: string) => void;
  placeholder?: string;
  hasError?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

/** Digits and at most one decimal point, capped at two decimals. */
function sanitize(input: string): string {
  const cleaned = input.replace(/[^0-9.]/g, '');
  const [whole, ...rest] = cleaned.split('.');
  if (rest.length === 0) return whole;
  // `whole || '0'`: a bare "." reaches the API as parseFloat(".") === NaN, which
  // JSON serializes to null against a NOT NULL opening_balance.
  return `${whole || '0'}.${rest.join('').slice(0, 2)}`;
}

/** Group the whole part only — grouping the decimals would fight the user mid-type. */
function withSeparators(raw: string): string {
  if (raw === '') return '';
  const [whole, decimals] = raw.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decimals === undefined ? grouped : `${grouped}.${decimals}`;
}

/**
 * A money field that reads as money: a "$" sits inside the box and thousands are
 * grouped as you type. The parent keeps the plain numeric string, so submission and
 * validation are unchanged — only the display is formatted.
 */
export function MoneyInput({
  value,
  onChangeText,
  placeholder = '0.00',
  hasError = false,
  containerStyle,
}: MoneyInputProps) {
  const { theme, isDark } = useTheme();
  const inputBg = isDark ? theme.surfaceElevated : '#f1f5f9';
  // Matches s.inputError in the modals so a money field flags the same way as the rest.
  const borderCol = hasError ? '#e11d48' : isDark ? theme.border : '#e2e8f0';

  return (
    <View style={[s.row, { backgroundColor: inputBg, borderColor: borderCol }, containerStyle]}>
      <Text style={[s.symbol, { color: '#94a3b8' }]}>$</Text>
      <TextInput
        style={[s.input, { color: isDark ? theme.textPrimary : '#0f172a' }]}
        value={withSeparators(value)}
        onChangeText={(text) => onChangeText(sanitize(text))}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        keyboardType="decimal-pad"
      />
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  symbol: { fontFamily: 'Inter_400Regular', fontSize: 15 },
  input: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 15, padding: 0 },
});

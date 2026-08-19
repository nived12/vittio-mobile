import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { StatementFile } from '../../api/statementFiles';

const TINT: Record<StatementFile['status'], string> = {
  pending: '#f59e0b',
  processing: '#4f46e5',
  parsed: '#10b981',
  completed: '#10b981',
  error: '#e11d48',
};

export function StatementStatusPill({
  status,
  large = false,
}: {
  status: StatementFile['status'];
  large?: boolean;
}) {
  const { t } = useTranslation();
  const tint = TINT[status];
  const busy = status === 'pending' || status === 'processing';
  return (
    <View
      style={[
        styles.pill,
        large && styles.pillLarge,
        { backgroundColor: `${tint}1a` },
      ]}
    >
      {busy && <ActivityIndicator size="small" color={tint} style={styles.spinner} />}
      <Text style={[styles.text, large && styles.textLarge, { color: tint }]}>
        {t(`statement_files.status.${status}`)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  pillLarge: { paddingHorizontal: 14, paddingVertical: 8 },
  spinner: { marginRight: 6, transform: [{ scale: 0.7 }] },
  text: { fontSize: 12, fontWeight: '600' },
  textLarge: { fontSize: 14 },
});

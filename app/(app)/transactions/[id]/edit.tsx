import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTransaction } from '../../../../src/hooks/useTransactions';
import { AddEditTransactionModal } from '../../../../src/components/modals/AddEditTransactionModal';

export default function EditTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const txId = Number(id);
  const { data: tx, isLoading } = useTransaction(txId);

  if (isLoading || !tx) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <AddEditTransactionModal
      transaction={tx}
      onClose={() => router.back()}
    />
  );
}

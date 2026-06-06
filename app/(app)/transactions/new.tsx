import React from 'react';
import { router } from 'expo-router';
import { AddEditTransactionModal } from '../../../src/components/modals/AddEditTransactionModal';

export default function NewTransactionScreen() {
  return (
    <AddEditTransactionModal onClose={() => router.back()} />
  );
}

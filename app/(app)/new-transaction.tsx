import React, { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { AddEditTransactionModal } from '../../src/components/modals/AddEditTransactionModal';

export default function NewTransactionScreen() {
  // This route is a tab rather than a stack push, so React Navigation keeps it
  // mounted and the form came back holding the last transaction that was saved.
  // Remounting on blur beats clearing each field: a new field cannot be missed.
  const [formInstance, setFormInstance] = useState(0);

  useFocusEffect(
    useCallback(() => () => setFormInstance((n) => n + 1), []),
  );

  return (
    <AddEditTransactionModal key={formInstance} onClose={() => router.back()} />
  );
}

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { colors, spacing, textStyles } from '../../../src/theme';

export default function AccountDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Feather name="chevron-left" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Account</Text>
      </View>
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>Account {id} — Phase 4</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: colors.bg.screen,
  },
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.screenPaddingH,
    paddingTop:        spacing.md,
    paddingBottom:     spacing.sm,
    gap:               8,
  },
  backButton: {
    padding: 4,
  },
  title: {
    ...textStyles.headingLg,
    color: colors.text.primary,
  },
  placeholder: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
  },
  placeholderText: {
    ...textStyles.bodyMd,
    color: colors.text.muted,
  },
});

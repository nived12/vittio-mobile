import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { colors, spacing, textStyles } from '../../../src/theme';

export default function SettingsScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('profile.settings')}</Text>
      </View>
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>Settings — Phase 4</Text>
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
    paddingHorizontal: spacing.screenPaddingH,
    paddingTop:        spacing.md,
    paddingBottom:     spacing.sm,
  },
  title: {
    ...textStyles.displayLg,
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

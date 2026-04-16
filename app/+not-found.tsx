import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { colors, textStyles, spacing } from '../src/theme';

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>This screen doesn't exist.</Text>
      <Link href="/(app)" style={styles.link}>
        <Text style={styles.linkText}>Go to home screen</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex:            1,
    alignItems:      'center',
    justifyContent:  'center',
    padding:         spacing.lg,
    backgroundColor: colors.bg.screen,
  },
  title: {
    ...textStyles.headingLg,
    color: colors.text.primary,
  },
  link: {
    marginTop: spacing.md,
  },
  linkText: {
    ...textStyles.bodyLg,
    color: colors.text.link,
  },
});

import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { useAuthStore } from '../../../src/stores/authStore';
import { colors, spacing, textStyles } from '../../../src/theme';

export default function ProfileScreen() {
  const { t }    = useTranslation();
  const user     = useAuthStore((s) => s.user);
  const logout   = useAuthStore((s) => s.logout);

  const handleLogout = () => {
    Alert.alert(
      t('profile.logoutConfirmTitle'),
      t('profile.logoutConfirmMessage'),
      [
        { text: t('profile.logoutCancel'), style: 'cancel' },
        {
          text:    t('profile.logoutConfirm'),
          style:   'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('profile.title')}</Text>
      </View>

      {user != null && (
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user.first_name[0]}{user.last_name[0]}
            </Text>
          </View>
          <View>
            <Text style={styles.userName}>{user.full_name}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
          </View>
        </View>
      )}

      <TouchableOpacity
        onPress={handleLogout}
        style={styles.logoutButton}
        accessibilityRole="button"
        accessibilityLabel={t('profile.logout')}
      >
        <Feather name="log-out" size={18} color={colors.expense} style={styles.logoutIcon} />
        <Text style={styles.logoutText}>{t('profile.logout')}</Text>
      </TouchableOpacity>
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
  userCard: {
    flexDirection:    'row',
    alignItems:       'center',
    gap:               12,
    margin:           spacing.screenPaddingH,
    padding:          spacing.cardPadding,
    backgroundColor:  colors.bg.card,
    borderRadius:     12,
    borderWidth:      1,
    borderColor:      colors.border.default,
  },
  avatar: {
    width:           48,
    height:          48,
    borderRadius:    24,
    backgroundColor: colors.brand.primaryLight,
    alignItems:      'center',
    justifyContent:  'center',
  },
  avatarText: {
    fontFamily: 'Inter_700Bold',
    fontSize:   18,
    color:      colors.brand.primary,
  },
  userName: {
    ...textStyles.headingMd,
    color: colors.text.primary,
  },
  userEmail: {
    ...textStyles.bodySm,
    color: colors.text.secondary,
  },
  logoutButton: {
    flexDirection:    'row',
    alignItems:       'center',
    margin:           spacing.screenPaddingH,
    padding:          spacing.cardPadding,
    backgroundColor:  colors.bg.card,
    borderRadius:     12,
    borderWidth:      1,
    borderColor:      colors.border.default,
  },
  logoutIcon: {
    marginRight: 8,
  },
  logoutText: {
    ...textStyles.bodyMd,
    color: colors.expense,
  },
});

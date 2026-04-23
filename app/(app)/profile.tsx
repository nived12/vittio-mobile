import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/authStore';
import { useUIStore } from '../../src/stores/uiStore';
import { colors, spacing, textStyles } from '../../src/theme';

export default function ProfileScreen() {
  const { t }      = useTranslation();
  const user       = useAuthStore((s) => s.user);
  const logout     = useAuthStore((s) => s.logout);
  const locale             = useUIStore((s) => s.locale);
  const setLocale          = useUIStore((s) => s.setLocale);
  const openStatementUpload = useUIStore((s) => s.openStatementUpload);

  function toggleLanguage() {
    setLocale(locale === 'es' ? 'en' : 'es');
  }

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

      {/* Settings section */}
      <View style={styles.section}>
        {/* Language toggle */}
        <TouchableOpacity
          style={styles.settingsRow}
          onPress={toggleLanguage}
          accessibilityRole="button"
        >
          <View style={styles.settingsRowLeft}>
            <Feather name="globe" size={18} color={colors.text.secondary} style={styles.rowIcon} />
            <Text style={styles.settingsRowLabel}>{t('profile.language')}</Text>
          </View>
          <View style={styles.languageBadge}>
            <Text style={styles.languageBadgeText}>{locale === 'es' ? 'ES' : 'EN'}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.rowDivider} />

        {/* Statement upload */}
        <TouchableOpacity
          style={styles.settingsRow}
          onPress={openStatementUpload}
          accessibilityRole="button"
        >
          <View style={styles.settingsRowLeft}>
            <Feather name="upload" size={18} color={colors.text.secondary} style={styles.rowIcon} />
            <Text style={styles.settingsRowLabel}>{t('profile.statementUpload')}</Text>
          </View>
          <Feather name="chevron-right" size={16} color="#94a3b8" />
        </TouchableOpacity>
      </View>

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
  section: {
    margin: spacing.screenPaddingH,
    backgroundColor: colors.bg.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.cardPadding,
    minHeight: 52,
  },
  settingsRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowIcon: {
    width: 20,
    alignItems: 'center',
  },
  settingsRowLabel: {
    ...textStyles.bodyMd,
    color: colors.text.primary,
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.border.default,
    marginHorizontal: spacing.cardPadding,
  },
  languageBadge: {
    backgroundColor: colors.brand.primaryLight,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  languageBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: colors.brand.primary,
  },
  comingSoonBadge: {
    backgroundColor: '#fef9c3',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  comingSoonText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#854d0e',
  },
});

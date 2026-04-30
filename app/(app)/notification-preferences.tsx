import React, { useEffect, useState } from 'react';
import {
  Linking,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { ChevronLeft } from 'lucide-react-native';
import { useUIStore } from '../../src/stores/uiStore';
import { registerForPushNotifications } from '../../src/utils/notifications';
import { colors, spacing, textStyles } from '../../src/theme';

type PermissionStatus = 'granted' | 'denied' | 'undetermined';

export default function NotificationPreferencesScreen() {
  const { t } = useTranslation();
  const { notificationPrefs, setNotificationPref } = useUIStore();
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('undetermined');

  useEffect(() => {
    checkPermission();
  }, []);

  async function checkPermission() {
    const { status } = await Notifications.getPermissionsAsync();
    setPermissionStatus(status as PermissionStatus);
  }

  async function handleActivate() {
    const { status } = await Notifications.requestPermissionsAsync();
    setPermissionStatus(status as PermissionStatus);
    if (status === 'granted') {
      void registerForPushNotifications();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }

  function handleOpenSettings() {
    Linking.openSettings();
  }

  function handleToggle(key: 'statementImports' | 'goalMilestones' | 'debtReminders', value: boolean) {
    Haptics.selectionAsync();
    setNotificationPref(key, value);
  }

  const rows = [
    {
      key: 'statementImports' as const,
      icon: 'document-text-outline' as const,
      iconColor: '#10b981',
      title: t('notifications.statementImports.title'),
      subtitle: t('notifications.statementImports.subtitle'),
    },
    {
      key: 'goalMilestones' as const,
      icon: 'trophy-outline' as const,
      iconColor: '#f59e0b',
      title: t('notifications.goalMilestones.title'),
      subtitle: t('notifications.goalMilestones.subtitle'),
    },
    {
      key: 'debtReminders' as const,
      icon: 'alert-circle-outline' as const,
      iconColor: colors.expense,
      title: t('notifications.debtReminders.title'),
      subtitle: t('notifications.debtReminders.subtitle'),
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel={t('common.back')}
        >
          <ChevronLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('notifications.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Permission Banner */}
        {permissionStatus !== 'granted' && (
          <View style={styles.permissionBanner}>
            <Ionicons name="notifications-outline" size={22} color={colors.brand.primary} />
            <View style={styles.permissionTextBlock}>
              <Text style={styles.permissionTitle}>{t('notifications.permissionBanner.title')}</Text>
              {permissionStatus === 'denied' && (
                <Text style={styles.permissionSubtitle}>{t('notifications.permissionBanner.subtitleDenied')}</Text>
              )}
            </View>
            <TouchableOpacity
              onPress={permissionStatus === 'denied' ? handleOpenSettings : handleActivate}
              style={styles.permissionCta}
              accessibilityLabel={
                permissionStatus === 'denied'
                  ? t('notifications.permissionBanner.ctaSettings')
                  : t('notifications.permissionBanner.ctaEnable')
              }
            >
              <Text style={styles.permissionCtaText}>
                {permissionStatus === 'denied'
                  ? t('notifications.permissionBanner.ctaSettings')
                  : t('notifications.permissionBanner.ctaEnable')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Section label */}
        <Text style={styles.sectionLabel}>{t('notifications.sectionLabel')}</Text>

        {/* Toggle rows */}
        <View style={styles.card}>
          {rows.map((row, index) => (
            <React.Fragment key={row.key}>
              <View
                style={[
                  styles.row,
                  permissionStatus !== 'granted' && styles.rowDisabled,
                ]}
              >
                <View style={[styles.iconCircle, { backgroundColor: `${row.iconColor}1a` }]}>
                  <Ionicons name={row.icon} size={20} color={row.iconColor} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{row.title}</Text>
                  <Text style={styles.rowSubtitle}>{row.subtitle}</Text>
                </View>
                <Switch
                  value={notificationPrefs[row.key]}
                  onValueChange={(val) => handleToggle(row.key, val)}
                  trackColor={{ false: colors.border.default, true: colors.brand.primary }}
                  thumbColor="#ffffff"
                  disabled={permissionStatus !== 'granted'}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: notificationPrefs[row.key] }}
                  accessibilityLabel={`${row.title}, ${row.subtitle}`}
                />
              </View>
              {index < rows.length - 1 && <View style={styles.separator} />}
            </React.Fragment>
          ))}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>{t('notifications.footer')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.screen,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.bg.screen,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.xs,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    ...textStyles.headingLg,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  content: {
    paddingBottom: spacing.xl,
  },
  permissionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderRadius: 12,
  },
  permissionTextBlock: {
    flex: 1,
  },
  permissionTitle: {
    ...textStyles.bodyMd,
    color: colors.text.primary,
  },
  permissionSubtitle: {
    ...textStyles.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  permissionCta: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  permissionCtaText: {
    ...textStyles.bodyMd,
    color: colors.brand.primary,
    fontWeight: '700',
  },
  sectionLabel: {
    ...textStyles.caption,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginHorizontal: spacing.md,
    marginTop: spacing.xl,
    marginBottom: spacing.xs,
  },
  card: {
    marginHorizontal: spacing.md,
    backgroundColor: colors.bg.card,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    minHeight: 64,
  },
  rowDisabled: {
    opacity: 0.4,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  rowText: {
    flex: 1,
    marginRight: spacing.sm,
  },
  rowTitle: {
    ...textStyles.bodyMd,
    color: colors.text.primary,
  },
  rowSubtitle: {
    ...textStyles.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border.subtle,
    marginLeft: 64,
  },
  footer: {
    ...textStyles.caption,
    color: colors.text.muted,
    textAlign: 'center',
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
  },
});

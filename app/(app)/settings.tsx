import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import {
  Bell,
  Bug,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Moon,
  Sun,
  Trash2,
} from 'lucide-react-native';
import { useUIStore } from '../../src/stores/uiStore';
import i18n from '../../src/i18n';
import { spacing, textStyles } from '../../src/theme';
import { useTheme } from '../../src/theme/ThemeContext';
import { AnalyticsToggleRow } from '../../src/components/AnalyticsPrivacyNotice';
import { sendBetaFeedback, reportBetaBug } from '../../src/utils/feedback';

type Scheme = 'system' | 'light' | 'dark';
type Locale = 'es' | 'en';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();
  const bg = isDark ? theme.background : '#f8fafc';
  const surface = isDark ? theme.surface : '#ffffff';
  const surfaceEl = isDark ? theme.surfaceElevated : '#f1f5f9';
  const textPrimary = isDark ? theme.textPrimary : '#0f172a';
  const textSecondary = isDark ? theme.textSecondary : '#475569';
  const textMuted = isDark ? '#64748b' : '#94a3b8';
  const borderCol = isDark ? theme.border : '#e2e8f0';

  const locale = useUIStore((s) => s.locale);
  const setLocale = useUIStore((s) => s.setLocale);
  const colorScheme = useUIStore((s) => s.colorScheme);
  const setColorScheme = useUIStore((s) => s.setColorScheme);

  function handleLocale(next: Locale) {
    setLocale(next);
    void i18n.changeLanguage(next);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <ChevronLeft size={24} color={textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: textPrimary }]}>{t('settings.title')}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* PREFERENCES */}
        <Text style={[styles.sectionLabel, { color: textSecondary }]}>
          {t('settings.preferencesSection')}
        </Text>
        <View style={[styles.card, { backgroundColor: surface, borderColor: borderCol }]}>
          {/* Theme */}
          <View style={styles.rowBetween}>
            <View style={styles.rowLeading}>
              {colorScheme === 'dark' ? (
                <Moon size={20} color={textSecondary} />
              ) : (
                <Sun size={20} color={textSecondary} />
              )}
              <Text style={[styles.rowLabel, { color: textPrimary }]}>
                {t('settings.appearance')}
              </Text>
            </View>
            <View style={styles.segmented}>
              {(['system', 'light', 'dark'] as const).map((option) => {
                const active = colorScheme === option;
                const label =
                  option === 'system'
                    ? t('settings.schemeSystem')
                    : option === 'light'
                      ? t('settings.schemeLight')
                      : t('settings.schemeDark');
                return (
                  <TouchableOpacity
                    key={option}
                    onPress={() => setColorScheme(option as Scheme)}
                    style={[
                      styles.segment,
                      { backgroundColor: surfaceEl, borderColor: borderCol },
                      active && styles.segmentActive,
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        { color: textSecondary },
                        active && styles.segmentTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: borderCol }]} />

          {/* Language */}
          <View style={styles.rowBetween}>
            <Text style={[styles.rowLabel, { color: textPrimary }]}>
              {t('profile.language')}
            </Text>
            <View style={styles.segmented}>
              {(['es', 'en'] as const).map((lang) => {
                const active = locale === lang;
                return (
                  <TouchableOpacity
                    key={lang}
                    onPress={() => handleLocale(lang)}
                    style={[
                      styles.segment,
                      { backgroundColor: surfaceEl, borderColor: borderCol },
                      active && styles.segmentActive,
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        { color: textSecondary },
                        active && styles.segmentTextActive,
                      ]}
                    >
                      {lang.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: borderCol }]} />

          {/* Analytics */}
          <AnalyticsToggleRow style={styles.analyticsRow} />
        </View>

        {/* NOTIFICATIONS */}
        <Text style={[styles.sectionLabel, { color: textSecondary }]}>
          {t('settings.notificationsSection')}
        </Text>
        <View style={[styles.card, { backgroundColor: surface, borderColor: borderCol }]}>
          <TouchableOpacity
            style={styles.navRow}
            onPress={() => router.push('/(app)/notification-preferences')}
            accessibilityRole="button"
            accessibilityLabel={t('settings.notificationsRow')}
          >
            <View style={styles.rowLeading}>
              <Bell size={20} color={textSecondary} />
              <Text style={[styles.rowLabel, { color: textPrimary }]}>
                {t('settings.notificationsRow')}
              </Text>
            </View>
            <ChevronRight size={18} color={textMuted} />
          </TouchableOpacity>
        </View>

        {/* HELP & FEEDBACK */}
        <Text style={[styles.sectionLabel, { color: textSecondary }]}>
          {t('settings.helpSection')}
        </Text>
        <View style={[styles.card, { backgroundColor: surface, borderColor: borderCol }]}>
          <TouchableOpacity
            style={styles.navRow}
            onPress={sendBetaFeedback}
            accessibilityRole="button"
            accessibilityLabel={t('settings.sendFeedback')}
          >
            <View style={styles.rowLeading}>
              <MessageCircle size={20} color={textSecondary} />
              <Text style={[styles.rowLabel, { color: textPrimary }]}>
                {t('settings.sendFeedback')}
              </Text>
            </View>
            <ChevronRight size={18} color={textMuted} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: borderCol }]} />

          <TouchableOpacity
            style={styles.navRow}
            onPress={reportBetaBug}
            accessibilityRole="button"
            accessibilityLabel={t('settings.reportBug')}
          >
            <View style={styles.rowLeading}>
              <Bug size={20} color={textSecondary} />
              <Text style={[styles.rowLabel, { color: textPrimary }]}>
                {t('settings.reportBug')}
              </Text>
            </View>
            <ChevronRight size={18} color={textMuted} />
          </TouchableOpacity>
        </View>

        {/* ACCOUNT */}
        <Text style={[styles.sectionLabel, { color: textSecondary }]}>
          {t('settings.accountSection')}
        </Text>
        <View style={[styles.card, { backgroundColor: surface, borderColor: borderCol }]}>
          <TouchableOpacity
            style={styles.navRow}
            onPress={() => router.push('/(app)/delete-account')}
            accessibilityRole="button"
            accessibilityLabel={t('settings.deleteAccountRow')}
          >
            <View style={styles.rowLeading}>
              <Trash2 size={20} color="#e11d48" />
              <Text style={[styles.rowLabel, { color: '#e11d48' }]}>
                {t('settings.deleteAccountRow')}
              </Text>
            </View>
            <ChevronRight size={18} color="#e11d48" />
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPaddingH,
    paddingVertical: spacing.md,
    gap: 8,
  },
  backBtn: {
    padding: 4,
  },
  title: {
    ...textStyles.displayLg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenPaddingH,
    paddingTop: spacing.sm,
  },
  sectionLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    lineHeight: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.88, // 0.08em on 11px = 0.88
    marginTop: spacing.lg, // 24px section gap
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.cardPadding,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    gap: 12,
  },
  rowLeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 1,
  },
  rowLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 20,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    gap: 12,
  },
  segmented: {
    flexDirection: 'row',
    gap: 6,
  },
  segment: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  segmentText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  segmentTextActive: {
    color: '#ffffff',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  analyticsRow: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
});

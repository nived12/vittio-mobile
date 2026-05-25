import React, { useEffect, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { analytics } from '../../app/_layout';
import { useTheme } from '../theme/ThemeContext';
import { colors, spacing, textStyles } from '../theme';

const NOTICE_KEY = 'analytics_notice_shown';
export const OPT_OUT_KEY = 'analytics_opted_out';

export async function isAnalyticsEnabled(): Promise<boolean> {
  const optedOut = await AsyncStorage.getItem(OPT_OUT_KEY);
  return optedOut !== 'true';
}

export function AnalyticsPrivacyNotice() {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();
  const [visible, setVisible] = useState(false);
  const slideAnim = new Animated.Value(200);

  useEffect(() => {
    AsyncStorage.getItem(NOTICE_KEY).then((shown) => {
      if (!shown) setVisible(true);
    });
  }, []);

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 60,
        friction: 10,
      }).start();
    }
  }, [visible]);

  if (!visible) return null;

  async function dismiss() {
    await AsyncStorage.setItem(NOTICE_KEY, 'true');
    Animated.timing(slideAnim, {
      toValue: 200,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setVisible(false));
  }

  const cardBg = isDark ? theme.surface : '#ffffff';
  const textPrimary = isDark ? theme.textPrimary : '#0f172a';
  const textSecondary = isDark ? theme.textSecondary : '#64748b';

  return (
    <Animated.View
      style={[styles.sheet, { backgroundColor: cardBg, transform: [{ translateY: slideAnim }] }]}
      accessibilityViewIsModal
    >
      <View style={styles.handle} />
      <Text style={[styles.title, { color: textPrimary }]}>
        {t('analytics.notice.title')}
      </Text>
      <Text style={[styles.body, { color: textSecondary }]}>
        {t('analytics.notice.body')}
      </Text>
      <TouchableOpacity
        style={styles.btn}
        onPress={dismiss}
        accessibilityRole="button"
        accessibilityLabel={t('analytics.notice.cta')}
      >
        <Text style={styles.btnText}>{t('analytics.notice.cta')}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

interface AnalyticsToggleRowProps {
  style?: object;
}

export function AnalyticsToggleRow({ style }: AnalyticsToggleRowProps) {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    isAnalyticsEnabled().then(setEnabled);
  }, []);

  async function toggle(value: boolean) {
    setEnabled(value);
    await AsyncStorage.setItem(OPT_OUT_KEY, value ? 'false' : 'true');
    if (value) {
      analytics?.optIn();
    } else {
      analytics?.optOut();
    }
  }

  const textPrimary = isDark ? theme.textPrimary : '#0f172a';
  const textSecondary = isDark ? theme.textSecondary : '#64748b';

  return (
    <View style={[styles.toggleRow, style]}>
      <View style={styles.toggleLabels}>
        <Text style={[styles.toggleTitle, { color: textPrimary }]}>
          {t('analytics.toggle.label')}
        </Text>
        <Text style={[styles.toggleDesc, { color: textSecondary }]}>
          {t('analytics.toggle.description')}
        </Text>
      </View>
      <Switch
        value={enabled}
        onValueChange={toggle}
        trackColor={{ false: colors.borderNested?.default ?? '#e2e8f0', true: colors.brand.primary }}
        thumbColor="#ffffff"
        accessibilityLabel={t('analytics.toggle.label')}
        accessibilityHint={t('analytics.toggle.description')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: spacing.screenPaddingH,
    paddingBottom: 34,
    paddingTop: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 100,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...textStyles.displayMd,
    marginBottom: spacing.sm,
  },
  body: {
    ...textStyles.bodyMd,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  btn: {
    backgroundColor: colors.brand.primary,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  btnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#ffffff',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  toggleLabels: {
    flex: 1,
    paddingRight: spacing.md,
  },
  toggleTitle: {
    ...textStyles.bodyMd,
    fontFamily: 'Inter_500Medium',
  },
  toggleDesc: {
    ...textStyles.bodySm,
    marginTop: 2,
  },
});

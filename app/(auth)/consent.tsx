import React, { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { useTranslation } from 'react-i18next';

import { useAuthStore } from '../../src/stores/authStore';
import { legalApi } from '../../src/api/legal';
import { getApiErrorCode } from '../../src/api/client';
import { colors, spacing, textStyles } from '../../src/theme';
import { CURRENT_LEGAL_VERSION } from '../../src/constants/legal';

// ── URLs — will be live at vitt.io/legal/* once Phase 14 is deployed ──────
const LEGAL_URLS = {
  terms:    'https://vitt.io/legal/terms',
  privacy:  'https://vitt.io/legal/privacy',
  financial: 'https://vitt.io/legal/financial_data',
};

interface ConsentItem {
  key: 'terms' | 'privacy' | 'financial';
  titleKey: string;
  url: string;
}

const CONSENT_ITEMS: ConsentItem[] = [
  { key: 'terms',     titleKey: 'consent.terms',     url: LEGAL_URLS.terms },
  { key: 'privacy',   titleKey: 'consent.privacy',   url: LEGAL_URLS.privacy },
  { key: 'financial', titleKey: 'consent.financial', url: LEGAL_URLS.financial },
];

export default function ConsentScreen() {
  const { t } = useTranslation();
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);

  const [checked, setChecked] = useState<Record<string, boolean>>({
    terms: false,
    privacy: false,
    financial: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allChecked = Object.values(checked).every(Boolean);

  function toggleItem(key: string) {
    Haptics.selectionAsync();
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function openDoc(url: string) {
    await WebBrowser.openBrowserAsync(url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
    });
  }

  async function handleAccept() {
    if (!allChecked) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);
    setError(null);
    try {
      await legalApi.accept();
      // Update local user state so the routing guard reflects consent immediately
      if (user) {
        setUser({ ...user, legal_version_accepted: CURRENT_LEGAL_VERSION });
      }
      router.replace('/(app)');
    } catch (err) {
      const code = getApiErrorCode(err);
      setError(code === 'UNAUTHORIZED' ? t('errors.sessionExpired') : t('consent.acceptError'));
      setIsLoading(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Text style={styles.shieldIcon}>🛡️</Text>
        </View>
        <Text style={styles.title}>{t('consent.title')}</Text>
        <Text style={styles.subtitle}>{t('consent.subtitle')}</Text>
      </View>

      {/* Consent items */}
      <View style={styles.itemsContainer}>
        {CONSENT_ITEMS.map((item) => (
          <Pressable
            key={item.key}
            style={[styles.item, checked[item.key] && styles.itemChecked]}
            onPress={() => toggleItem(item.key)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: checked[item.key] }}
          >
            {/* Checkbox */}
            <View style={[styles.checkbox, checked[item.key] && styles.checkboxChecked]}>
              {checked[item.key] && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </View>

            {/* Label + read link */}
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>{t(item.titleKey)}</Text>
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation?.(); openDoc(item.url); }}
                hitSlop={8}
              >
                <Text style={styles.readLink}>{t('consent.readLink')}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        ))}
      </View>

      {/* Error */}
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      {/* Accept button */}
      <TouchableOpacity
        style={[styles.button, (!allChecked || isLoading) && styles.buttonDisabled]}
        onPress={handleAccept}
        disabled={!allChecked || isLoading}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>{t('consent.accept')}</Text>
        )}
      </TouchableOpacity>

      {/* Version notice */}
      <Text style={styles.version}>
        {t('consent.version', { version: CURRENT_LEGAL_VERSION })}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.screenPaddingH,
    paddingTop: Platform.OS === 'ios' ? 80 : 40,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  shieldIcon: {
    fontSize: 28,
  },
  title: {
    ...textStyles.headingLg,
    textAlign: 'center',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...textStyles.bodyMd,
    textAlign: 'center',
    color: colors.text.secondary,
  },
  itemsContainer: {
    gap: spacing.listItemGap,
    marginBottom: spacing.lg,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.listItemGap,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  itemChecked: {
    borderColor: '#4f46e5',
    backgroundColor: '#eef2ff',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    ...textStyles.bodyMd,
    fontFamily: 'Inter_500Medium',
    color: colors.text.primary,
    marginBottom: 2,
  },
  readLink: {
    ...textStyles.caption,
    color: '#4f46e5',
  },
  errorText: {
    ...textStyles.caption,
    color: colors.negative,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  button: {
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    ...textStyles.headingSm,
    color: '#fff',
  },
  version: {
    ...textStyles.caption,
    color: colors.text.muted,
    textAlign: 'center',
  },
});

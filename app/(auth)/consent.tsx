import React, { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { useTranslation } from 'react-i18next';
import { ShieldCheck } from 'lucide-react-native';

import { useAuthStore } from '../../src/stores/authStore';
import { legalApi } from '../../src/api/legal';
import { getApiErrorCode } from '../../src/api/client';
import { spacing, textStyles } from '../../src/theme';
import { useTheme } from '../../src/theme/ThemeContext';
// Derive legal doc base from the API URL so dev and prod resolve automatically.
// Dev:  http://192.168.86.38:3000/api/v1  → http://192.168.86.38:3000/legal/*
// Prod: https://vitt.io/api/v1            → https://vitt.io/legal/*
const _apiUrl = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3000/api/v1';
const _legalBase = _apiUrl.replace(/\/api\/v1\/?$/, '');
const LEGAL_URLS = {
  terms:     `${_legalBase}/legal/terms`,
  privacy:   `${_legalBase}/legal/privacy`,
  financial: `${_legalBase}/legal/financial_data`,
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
  const { theme } = useTheme();
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);

  const [checked, setChecked] = useState<Record<string, boolean>>({
    terms: false,
    privacy: false,
    financial: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptedVersion, setAcceptedVersion] = useState<string | null>(null);

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
      const response = await legalApi.accept();
      const version = response.data.data.version;
      if (user) {
        setUser({ ...user, legal_version_accepted: version, consent_current: true });
      }
      setAcceptedVersion(version);
      setIsLoading(false);
      router.replace('/(app)');
    } catch (err) {
      const code = getApiErrorCode(err);
      setError(code === 'UNAUTHORIZED' ? t('errors.sessionExpired') : t('consent.acceptError'));
      setIsLoading(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        backgroundColor: theme.background,
        paddingHorizontal: spacing.screenPaddingH,
        paddingTop: Platform.OS === 'ios' ? 80 : 40,
        paddingBottom: 40,
      }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
        <View style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: theme.primaryLight,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.md,
        }}>
          <ShieldCheck size={28} color={theme.primary} />
        </View>
        <Text style={{ ...textStyles.headingLg, textAlign: 'center', color: theme.textPrimary, marginBottom: spacing.sm }}>
          {t('consent.title')}
        </Text>
        <Text style={{ ...textStyles.bodyMd, textAlign: 'center', color: theme.textSecondary }}>
          {t('consent.subtitle')}
        </Text>
      </View>

      {/* Consent items */}
      <View style={{ gap: spacing.listItemGap, marginBottom: spacing.lg }}>
        {CONSENT_ITEMS.map((item) => (
          <Pressable
            key={item.key}
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: spacing.listItemGap,
              padding: spacing.md,
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: checked[item.key] ? theme.primary : theme.border,
              backgroundColor: checked[item.key] ? theme.primaryLight : theme.surface,
            }}
            onPress={() => toggleItem(item.key)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: checked[item.key] }}
          >
            {/* Checkbox */}
            <View style={{
              width: 20,
              height: 20,
              borderRadius: 4,
              borderWidth: 1.5,
              borderColor: checked[item.key] ? theme.primary : theme.border,
              marginTop: 2,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: checked[item.key] ? theme.primary : 'transparent',
            }}>
              {checked[item.key] && (
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700', lineHeight: 14 }}>✓</Text>
              )}
            </View>

            {/* Label + read link */}
            <View style={{ flex: 1 }}>
              <Text style={{ ...textStyles.bodyMd, fontFamily: 'Inter_500Medium', color: theme.textPrimary, marginBottom: 2 }}>
                {t(item.titleKey)}
              </Text>
              <Pressable
                onPress={() => openDoc(item.url)}
                hitSlop={8}
                accessibilityLabel={t('consent.readLinkA11y', { doc: t(item.titleKey) })}
              >
                <Text style={{ ...textStyles.caption, color: theme.primary }}>
                  {t('consent.readLink')}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        ))}
      </View>

      {/* Error */}
      {error && (
        <Text style={{ ...textStyles.caption, color: theme.negative, textAlign: 'center', marginBottom: spacing.md }}>
          {error}
        </Text>
      )}

      {/* Accept button */}
      <Pressable
        style={{
          backgroundColor: theme.primary,
          borderRadius: 12,
          paddingVertical: spacing.md,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.md,
          opacity: !allChecked || isLoading ? 0.4 : 1,
        }}
        onPress={handleAccept}
        disabled={!allChecked || isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ ...textStyles.headingSm, color: '#fff' }}>{t('consent.accept')}</Text>
        )}
      </Pressable>

      {/* Version notice — shown once the API confirms the accepted version */}
      {acceptedVersion && (
        <Text style={{ ...textStyles.caption, color: theme.textDisabled, textAlign: 'center' }}>
          {t('consent.version', { version: acceptedVersion })}
        </Text>
      )}
    </ScrollView>
  );
}

import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { CaretLeft, Check } from 'phosphor-react-native';
import { useAuthStore } from '../../src/stores/authStore';
import { createCheckoutSession, fetchPortalUrl, fetchSubscriptionStatus } from '../../src/api/subscription';
import { authApi } from '../../src/api/auth';
import { useUIStore } from '../../src/stores/uiStore';
import { useTheme } from '../../src/theme/ThemeContext';
import { colors } from '../../src/theme/colors';
import { spacing, textStyles } from '../../src/theme';

// ── UsageRow ───────────────────────────────────────────────────────────────

function UsageRow({
  label, used, limit, trackBg,
}: { label: string; used: number; limit: number; trackBg: string }) {
  const pct   = limit > 0 ? Math.min(used / limit, 1) : 0;
  const color = pct >= 1 ? colors.negative : pct >= 0.8 ? colors.warning : colors.primary;
  return (
    <View style={styles.usageRow}>
      <View style={styles.usageHeader}>
        <Text style={styles.usageLabel}>{label}</Text>
        <Text style={[styles.usageCount, { color }]}>{used}/{limit}</Text>
      </View>
      <View style={[styles.usageTrack, { backgroundColor: trackBg }]}>
        <View style={[styles.usageFill, { width: `${pct * 100}%` as `${number}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

// SUCCESS_URL and CANCEL_URL are intentionally web URLs pointing to the Rails app.
// WebBrowser.openBrowserAsync resolves when the user closes the in-app browser,
// at which point the app polls fetchSubscriptionStatus() to detect payment success.
// A custom URL scheme is not required for this flow.
const _apiUrl = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3000/api/v1';
const _appBase = _apiUrl.replace(/\/api\/v1\/?$/, '');
const SUCCESS_URL = `${_appBase}/subscription?success=1`;
const CANCEL_URL  = `${_appBase}/subscription`;

// ── Screen ─────────────────────────────────────────────────────────────────

export default function PremiumScreen() {
  const { t } = useTranslation();
  const setUser = useAuthStore((s) => s.setUser);
  const user    = useAuthStore((s) => s.user);
  const { showToast } = useUIStore();
  const { theme, isDark } = useTheme();

  const [loadingInterval, setLoadingInterval] = useState<'month' | 'year' | null>(null);
  const [loadingPortal, setLoadingPortal]     = useState(false);

  const bg            = isDark ? theme.background  : '#f8fafc';
  const surface       = isDark ? theme.surface     : '#ffffff';
  const textPrimary   = isDark ? theme.textPrimary : '#0f172a';
  const textSecondary = isDark ? theme.textSecondary : '#64748b';
  const borderCol     = isDark ? theme.border      : '#e2e8f0';
  const usageTrackBg  = isDark ? theme.border      : '#e2e8f0';

  // Banner colors — dark-mode aware
  const trialBannerBg    = isDark ? '#78350f' : '#fef3c7';
  const trialBannerText  = isDark ? '#fde68a' : '#92400e';
  const expiredBannerBg  = isDark ? '#7f1d1d' : '#fee2e2';
  const expiredBannerText = isDark ? '#fecaca' : '#991b1b';
  const activeBannerBg   = isDark ? '#064e3b' : '#d1fae5';
  const activeBannerText = isDark ? '#6ee7b7' : '#065f46';

  const status      = user?.subscription_status ?? 'none';
  const isActive    = status === 'active';
  const isOnTrial   = status === 'trial_active';
  const trialEndsAt = user?.trial_ends_at ?? null;

  const trialDaysLeft = (() => {
    if (!trialEndsAt) return 0;
    const diff = new Date(trialEndsAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  })();

  const features = t('premium.features', { returnObjects: true }) as string[];

  async function handleSubscribe(interval: 'month' | 'year') {
    setLoadingInterval(interval);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const url = await createCheckoutSession(interval, SUCCESS_URL, CANCEL_URL);
      await WebBrowser.openBrowserAsync(url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      });
      // Browser closed — check if payment succeeded
      const subscriptionStatus = await fetchSubscriptionStatus();
      if (subscriptionStatus.status === 'active') {
        // Refresh the full user profile so usage counters are also up-to-date
        const freshUser = await authApi.me();
        setUser(freshUser);
        showToast(t('premium.toastSuccess'), 'success');
        router.replace('/(app)');
      }
    } catch {
      showToast(t('premium.toastCheckoutError'), 'error');
    } finally {
      setLoadingInterval(null);
    }
  }

  async function handleManage() {
    setLoadingPortal(true);
    try {
      const url = await fetchPortalUrl(CANCEL_URL);
      await WebBrowser.openBrowserAsync(url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      });
    } catch {
      showToast(t('premium.toastPortalError'), 'error');
    } finally {
      setLoadingPortal(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderCol }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={8}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel={t('premium.backButton')}
        >
          <CaretLeft size={24} color={textPrimary} weight="bold" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>{t('premium.headerTitle')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Status banner */}
        {isOnTrial && (
          <View style={[styles.banner, { backgroundColor: trialBannerBg }]}>
            <Text style={[styles.bannerText, { color: trialBannerText }]}>
              {trialDaysLeft > 0
                ? t('premium.trial.daysRemaining', { count: trialDaysLeft })
                : t('premium.trial.ending')}
            </Text>
          </View>
        )}
        {!isOnTrial && !isActive && (
          <View style={[styles.banner, { backgroundColor: expiredBannerBg }]}>
            <Text style={[styles.bannerText, { color: expiredBannerText }]}>
              {t('premium.bannerExpired')}
            </Text>
          </View>
        )}
        {isActive && (
          <View style={[styles.banner, { backgroundColor: activeBannerBg }]}>
            <Text style={[styles.bannerText, { color: activeBannerText, fontWeight: '600' }]}>
              {t('premium.bannerActive')}
            </Text>
          </View>
        )}

        {/* Trial usage bars */}
        {isOnTrial && user && (
          <View style={[styles.usageCard, { backgroundColor: surface, borderColor: borderCol }]}>
            <Text style={[styles.usageTitle, { color: textSecondary }]}>{t('premium.usageTitle')}</Text>
            <UsageRow
              label={t('premium.usageStatements')}
              used={user.statement_files_used}
              limit={user.statement_files_limit}
              trackBg={usageTrackBg}
            />
            <UsageRow
              label={t('premium.usageAi')}
              used={user.ai_calls_used}
              limit={user.ai_calls_limit}
              trackBg={usageTrackBg}
            />
          </View>
        )}

        {/* Hero */}
        <Text style={[styles.heroTitle, { color: textPrimary }]}>
          {t('premium.heroTitle')}
        </Text>
        <Text style={[styles.heroSubtitle, { color: textSecondary }]}>
          {t('premium.heroSubtitle')}
        </Text>

        {/* Feature list */}
        <View style={[styles.featureCard, { backgroundColor: surface, borderColor: borderCol }]}>
          {features.map((feature) => (
            <View key={feature} style={styles.featureRow}>
              <View style={styles.featureIconWrap}>
                <Check size={16} color="#10b981" weight="bold" />
              </View>
              <Text style={[styles.featureText, { color: textPrimary }]}>{feature}</Text>
            </View>
          ))}
        </View>

        {/* Plan cards */}
        {!isActive && (
          <View style={styles.planRow}>
            {/* Monthly */}
            <TouchableOpacity
              style={[styles.planCard, { backgroundColor: surface, borderColor: borderCol }]}
              onPress={() => handleSubscribe('month')}
              disabled={loadingInterval !== null || loadingPortal}
              activeOpacity={0.8}
            >
              <Text style={[styles.planLabel, { color: textSecondary }]}>{t('premium.monthly.label')}</Text>
              <Text style={[styles.planPrice, { color: textPrimary }]}>$149</Text>
              <Text style={[styles.planUnit, { color: textSecondary }]}>{t('premium.monthly.unit')}</Text>
              <View style={[styles.planCta, { borderColor: colors.primary }]}>
                {loadingInterval === 'month' ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={styles.planCtaText}>{t('premium.monthly.cta')}</Text>
                )}
              </View>
            </TouchableOpacity>

            {/* Annual — highlighted */}
            <TouchableOpacity
              style={styles.planCardAnnual}
              onPress={() => handleSubscribe('year')}
              disabled={loadingInterval !== null || loadingPortal}
              activeOpacity={0.8}
            >
              <View style={styles.savingsBadge}>
                <Text style={styles.savingsBadgeText}>{t('premium.annual.savingsBadge')}</Text>
              </View>
              <Text style={styles.planLabelAnnual}>{t('premium.annual.label')}</Text>
              <Text style={styles.planPriceAnnual}>$99</Text>
              <Text style={styles.planUnitAnnual}>{t('premium.annual.unit')}</Text>
              <Text style={styles.planAnnualTotal}>{t('premium.annual.total')}</Text>
              <View style={styles.planCtaAnnual}>
                {loadingInterval === 'year' ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.planCtaAnnualText}>{t('premium.annual.cta')}</Text>
                )}
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* IVA note */}
        {!isActive && (
          <Text style={[styles.ivaNote, { color: textSecondary }]}>
            {t('premium.ivaNote')}
          </Text>
        )}

        {/* Manage subscription (active users) */}
        {isActive && (
          <TouchableOpacity
            style={[styles.manageBtn, { borderColor: borderCol, backgroundColor: surface }]}
            onPress={handleManage}
            disabled={loadingPortal}
            activeOpacity={0.8}
          >
            {loadingPortal ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[styles.manageBtnText, { color: colors.primary }]}>
                {t('premium.manageBtn')}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea:   { flex: 1 },
  header:     {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderBottomWidth: 1,
  },
  backBtn:       { padding: 4 },
  headerTitle:   { ...textStyles.bodyLg, fontWeight: '600', flex: 1, textAlign: 'center' },
  headerSpacer:  { width: 32 },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },

  banner:     { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, marginBottom: spacing.md },
  bannerText: { fontSize: 14, fontWeight: '500', textAlign: 'center' },

  heroTitle:    { ...textStyles.headingMd, textAlign: 'center', marginBottom: spacing.sm },
  heroSubtitle: { ...textStyles.bodyLg, textAlign: 'center', marginBottom: spacing.lg },

  featureCard:    { borderRadius: 16, borderWidth: 1, padding: spacing.md, marginBottom: spacing.lg },
  featureRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  featureIconWrap: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#d1fae5', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  featureText:    { flex: 1, fontSize: 14, lineHeight: 20 },

  planRow:  { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  planCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 2,
    padding: spacing.md,
    alignItems: 'center',
  },
  planCardAnnual: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 2,
    padding: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    position: 'relative',
  },
  planLabel:       { fontSize: 11, fontWeight: '600', letterSpacing: 0.8, marginBottom: 8 },
  planLabelAnnual: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8, marginBottom: 8, color: '#c7d2fe' },
  planPrice:       { fontSize: 32, fontWeight: '700', lineHeight: 36 },
  planPriceAnnual: { fontSize: 32, fontWeight: '700', lineHeight: 36, color: '#ffffff' },
  planUnit:        { fontSize: 13, marginBottom: 16 },
  planUnitAnnual:  { fontSize: 13, marginBottom: 4, color: '#c7d2fe' },
  planAnnualTotal: { fontSize: 12, color: '#a5b4fc', marginBottom: 12 },
  planCta: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    minWidth: 90,
    minHeight: 36,
    justifyContent: 'center',
  },
  planCtaText:    { color: colors.primary, fontSize: 13, fontWeight: '600' },
  planCtaAnnual: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    minWidth: 90,
    minHeight: 36,
    justifyContent: 'center',
  },
  planCtaAnnualText: { color: '#ffffff', fontSize: 13, fontWeight: '600' },
  savingsBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#10b981',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  savingsBadgeText: { color: '#ffffff', fontSize: 11, fontWeight: '700' },

  ivaNote:     { textAlign: 'center', fontSize: 12, marginBottom: spacing.md },

  manageBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  manageBtnText: { fontSize: 15, fontWeight: '600' },

  usageCard:  { borderRadius: 12, borderWidth: 1, padding: spacing.md, marginBottom: spacing.md, gap: 12 },
  usageTitle: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8, marginBottom: 4 },
  usageRow:   { gap: 6 },
  usageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  usageLabel:  { fontSize: 13, fontWeight: '500' },
  usageCount:  { fontSize: 13, fontWeight: '600' },
  usageTrack:  { height: 4, borderRadius: 2, overflow: 'hidden' },
  usageFill:   { height: 4, borderRadius: 2 },
});

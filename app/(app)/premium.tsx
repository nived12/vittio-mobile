import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
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
import { ChevronLeft, Check } from 'lucide-react-native';
import { useAuthStore } from '../../src/stores/authStore';
import { CheckoutResult, createCheckoutSession, fetchPortalUrl, fetchSubscriptionStatus } from '../../src/api/subscription';
import { authApi } from '../../src/api/auth';
import { useUIStore } from '../../src/stores/uiStore';
import { useTheme } from '../../src/theme/ThemeContext';
import { colors } from '../../src/theme/colors';
import { spacing, textStyles } from '../../src/theme';
import {
  PremiumPackage,
  getPremiumPackages,
  identifyPurchaser,
  purchasePremium,
  purchasesAvailable,
  restorePremium,
} from '../../src/lib/purchases';

// ── UsageRow ───────────────────────────────────────────────────────────────

function UsageRow({
  label, used, limit, trackBg, labelColor,
}: {
  label: string;
  used: number;
  limit: number;
  trackBg: string;
  labelColor?: string;
}) {
  const pct      = limit > 0 ? Math.min(used / limit, 1) : 0;
  const pctRound = Math.round(pct * 100);
  const color    = pct >= 1 ? colors.negative : pct >= 0.8 ? colors.warning : colors.primary;
  const fillAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: pct,
      duration: 320,
      easing: Easing.bezier(0.32, 0.72, 0, 1),
      useNativeDriver: false,
    }).start();
  }, [pct, fillAnim]);

  const fillWidth = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.usageRow}>
      <View style={styles.usageHeader}>
        <Text style={[styles.usageLabel, labelColor ? { color: labelColor } : undefined]}>{label}</Text>
        <Text style={[styles.usagePercent, { color }]}>{pctRound}%</Text>
      </View>
      <View style={[styles.usageTrack, { backgroundColor: trackBg }]}>
        <Animated.View style={[styles.usageFill, { width: fillWidth, backgroundColor: color }]} />
      </View>
    </View>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

// SUCCESS_URL points to a public Rails page (no auth required) so the in-app browser
// shows "Payment successful" instead of the web login page after Stripe redirects.
// CANCEL_URL points to the subscription page — it will redirect to login (fine, user cancelled).
// After browser close the app retries fetchSubscriptionStatus() to account for webhook delay.
const _apiUrl = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3000/api/v1';
const _appBase = _apiUrl.replace(/\/api\/v1\/?$/, '');
const SUCCESS_URL       = `${_appBase}/checkout/success`;
const CANCEL_URL        = `${_appBase}/subscription`;
const MONTHLY_PRICE_MXN = 99;
const ANNUAL_PRICE_MXN  = 75;

// Stripe webhooks land in 2-5s after the browser closes. RevenueCat's take longer:
// a measured sandbox purchase confirmed at 18:06:05 and the webhook arrived at
// 18:06:14 — nine seconds, one second past the old 5x1.5s window. Missing it tells
// a buyer their purchase is still "activating" when it already succeeded, which to
// an App Review tester looks like a purchase that did nothing.
//
// Callers pass their own budget; the loop exits as soon as the server says active,
// so a longer window costs nothing in the common case.
const STRIPE_POLL = { attempts: 5, delayMs: 1500 };
const IAP_POLL = { attempts: 15, delayMs: 2000 };

async function pollUntilActive(attempts = 5, delayMs = 1500): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    const s = await fetchSubscriptionStatus();
    if (s.status === 'active') return true;
    if (i < attempts - 1) await new Promise<void>((r) => setTimeout(r, delayMs));
  }
  return false;
}

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

  // iOS sells Premium through Apple IAP and nothing else (Guideline 3.1.1): App Store
  // packages, real StoreKit prices, and no reference to the web — naming or linking to
  // web checkout from inside the app is steering under 3.1.3. Web and Android keep the
  // Stripe paywall. Expo web reports 'web', so the e2e suite exercises the Stripe path.
  const isIOS = Platform.OS === 'ios';

  const status      = user?.subscription_status ?? 'none';
  const isActive    = status === 'active';
  const isOnTrial   = status === 'trial_active';
  const trialEndsAt = user?.trial_ends_at ?? null;
  const currentInterval = user?.subscription_interval ?? null;
  // Whoever sold the subscription owns it. Apple-billed users must never be sent to
  // Stripe: the server refuses, and there is no way to cancel an App Store plan for them.
  const billedByApple = user?.billing_source === 'apple';

  const [packages, setPackages]         = useState<PremiumPackage[] | null>(null);
  const [packagesFailed, setPackagesFailed] = useState(false);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [restoring, setRestoring]       = useState(false);

  const showIapPaywall = isIOS && !isActive;

  // Prices come from StoreKit, never from a constant — a subscriber on a retired
  // price is not paying today's number, and Apple localises the string for us.
  const userId = user?.id;
  const loadPackages = useCallback(async () => {
    if (!purchasesAvailable()) {
      setPackagesFailed(true);
      return;
    }
    setPackagesFailed(false);
    setPackages(null);
    try {
      // The auth paths configure the SDK, but this screen is the only thing that
      // breaks if one ever forgets — so it does not rely on them.
      if (userId) await identifyPurchaser(userId);
      const pkgs = await getPremiumPackages();
      setPackages(pkgs);
      setPackagesFailed(pkgs.length === 0);
    } catch {
      setPackagesFailed(true);
    }
  }, [userId]);

  useEffect(() => {
    if (!showIapPaywall) return;
    void loadPackages();
  }, [showIapPaywall, loadPackages]);

  const trialDaysLeft = (() => {
    if (!trialEndsAt) return 0;
    const diff = new Date(trialEndsAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  })();

  const raw = t('premium.features', { returnObjects: true });
  const features: string[] = Array.isArray(raw) ? raw : [];

  async function handleSubscribe(interval: 'month' | 'year') {
    setLoadingInterval(interval);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const result: CheckoutResult = await createCheckoutSession(interval, SUCCESS_URL, CANCEL_URL);

      if (result.kind === 'switched') {
        // Direct plan swap — no browser session needed
        const freshUser = await authApi.me();
        setUser(freshUser);
        showToast(t('premium.toastSwitched'), 'success');
        router.replace('/(app)');
        return;
      }

      // New subscription — open Stripe Checkout in browser
      await WebBrowser.openBrowserAsync(result.url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      });
      // Browser closed — poll for active status (webhook may take a few seconds)
      const isNowActive = await pollUntilActive(STRIPE_POLL.attempts, STRIPE_POLL.delayMs);
      const freshUser   = await authApi.me();
      setUser(freshUser);
      showToast(
        isNowActive ? t('premium.toastSuccess') : t('premium.toastProcessing'),
        isNowActive ? 'success' : 'info',
      );
      router.replace('/(app)');
    } catch {
      showToast(t('premium.toastCheckoutError'), 'error');
    } finally {
      setLoadingInterval(null);
    }
  }

  // App Store purchase. The RevenueCat webhook is what actually grants premium, so
  // the client waits on the server rather than trusting the StoreKit callback.
  async function handleIapPurchase(pkg: PremiumPackage) {
    setPurchasingId(pkg.id);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const outcome = await purchasePremium(pkg.id);
      if (outcome === 'cancelled') return;

      const isNowActive = await pollUntilActive(IAP_POLL.attempts, IAP_POLL.delayMs);
      const freshUser   = await authApi.me();
      setUser(freshUser);
      showToast(
        isNowActive ? t('premium.toastSuccess') : t('premium.purchasePending'),
        isNowActive ? 'success' : 'info',
      );
      router.replace('/(app)');
    } catch {
      showToast(t('premium.purchaseError'), 'error');
    } finally {
      setPurchasingId(null);
    }
  }

  // Apple requires a restore path for anyone reinstalling or on a second device.
  async function handleRestore() {
    setRestoring(true);
    try {
      const restored = await restorePremium();
      const freshUser = await authApi.me();
      setUser(freshUser);
      if (restored || freshUser.subscription_status === 'active') {
        showToast(t('premium.restoreSuccess'), 'success');
        router.replace('/(app)');
      } else {
        showToast(t('premium.restoreNone'), 'info');
      }
    } catch {
      showToast(t('premium.restoreError'), 'error');
    } finally {
      setRestoring(false);
    }
  }

  async function handleManage() {
    setLoadingPortal(true);
    try {
      const url = await fetchPortalUrl(CANCEL_URL);
      await WebBrowser.openBrowserAsync(url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      });
      // Refresh state after portal closes — user may have cancelled or changed plan
      const freshUser = await authApi.me();
      setUser(freshUser);
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
          <ChevronLeft size={24} color={textPrimary} />
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
              labelColor={textPrimary}
            />
            <UsageRow
              label={t('premium.usageAi')}
              used={user.ai_calls_used}
              limit={user.ai_calls_limit}
              trackBg={usageTrackBg}
              labelColor={textPrimary}
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
              <View style={[styles.featureIconWrap, { backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : '#d1fae5' }]}>
                <Check size={16} color="#10b981" />
              </View>
              <Text style={[styles.featureText, { color: textPrimary }]}>{feature}</Text>
            </View>
          ))}
        </View>

        {/* iOS paywall — App Store IAP, priced by StoreKit. This is what satisfies 3.1.1. */}
        {showIapPaywall && (
          <>
            {packages === null && !packagesFailed && (
              <ActivityIndicator style={styles.iapLoader} size="small" color={colors.primary} />
            )}

            {/* A dead end here reads to App Review as "no purchase path", so the
                failure state always offers a way back to one. */}
            {packagesFailed && (
              <>
                <Text style={[styles.iosInfo, { color: textSecondary }]}>
                  {t('premium.plansUnavailable')}
                </Text>
                <TouchableOpacity
                  style={[styles.manageBtn, { borderColor: borderCol, backgroundColor: surface }]}
                  onPress={() => loadPackages()}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                >
                  <Text style={[styles.manageBtnText, { color: colors.primary }]}>
                    {t('premium.retryPlans')}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {packages?.map((pkg) => {
              const annual = pkg.interval === 'year';
              return (
                <TouchableOpacity
                  key={pkg.id}
                  style={[
                    styles.iapCard,
                    annual
                      ? styles.iapCardAnnual
                      : { backgroundColor: surface, borderColor: borderCol },
                  ]}
                  onPress={() => handleIapPurchase(pkg)}
                  disabled={purchasingId !== null || restoring}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                >
                  <Text style={[styles.planLabel, annual ? styles.planLabelAnnual : { color: textSecondary }]}>
                    {annual ? t('premium.annual.label') : t('premium.monthly.label')}
                  </Text>
                  {/* Store-formatted and already localised — never reformat it. */}
                  <Text style={[styles.planPrice, annual ? styles.planPriceAnnual : { color: textPrimary }]}>
                    {pkg.priceString}
                  </Text>
                  <Text style={[styles.planUnit, annual ? styles.planUnitAnnual : { color: textSecondary }]}>
                    {annual ? t('premium.storePricePerYear') : t('premium.storePricePerMonth')}
                  </Text>
                  <View style={annual ? styles.planCtaAnnual : [styles.planCta, { borderColor: colors.primary }]}>
                    {purchasingId === pkg.id ? (
                      <ActivityIndicator size="small" color={annual ? '#ffffff' : colors.primary} />
                    ) : (
                      <Text style={annual ? styles.planCtaAnnualText : styles.planCtaText}>
                        {t('premium.subscribeCta')}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}

            <Text style={[styles.ivaNote, { color: textSecondary }]}>{t('premium.ivaNote')}</Text>

            {/* Required by Apple, so it stays visible even when the offering fetch
                failed — restore can still succeed. Hidden only when the SDK cannot
                run at all, where it could do nothing but throw. */}
            {purchasesAvailable() && (
            <TouchableOpacity
              style={styles.restoreBtn}
              onPress={handleRestore}
              disabled={restoring || purchasingId !== null}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              {restoring ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.restoreBtnText, { color: colors.primary }]}>
                  {t('premium.restoreBtn')}
                </Text>
              )}
            </TouchableOpacity>
            )}
          </>
        )}

        {/* Active on iOS: the banner above says everything. No manage button and no
            mention of the web, whichever processor bills them — that is 3.1.3 steering. */}

        {/* Plan cards — shown to non-subscribers (both cards) and active subscribers (switch
            card only). Never to an Apple-billed user: their plan changes belong to Apple. */}
        {!isIOS && !billedByApple && (!isActive || currentInterval === 'month') && (
          <View style={styles.planRow}>
            {/* Monthly — hidden for active monthly subscribers */}
            {!isActive && (
              <TouchableOpacity
                style={[styles.planCard, { backgroundColor: surface, borderColor: borderCol }]}
                onPress={() => handleSubscribe('month')}
                disabled={loadingInterval !== null || loadingPortal}
                activeOpacity={0.8}
              >
                <Text style={[styles.planLabel, { color: textSecondary }]}>{t('premium.monthly.label')}</Text>
                <Text style={[styles.planPrice, { color: textPrimary }]}>${MONTHLY_PRICE_MXN}</Text>
                <Text style={[styles.planUnit, { color: textSecondary }]}>{t('premium.monthly.unit')}</Text>
                <View style={[styles.planCta, { borderColor: colors.primary }]}>
                  {loadingInterval === 'month' ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text style={styles.planCtaText}>{t('premium.monthly.cta')}</Text>
                  )}
                </View>
              </TouchableOpacity>
            )}

            {/* Annual — highlighted; shown to all non-subscribers and active monthly subscribers */}
            {(!isActive || currentInterval === 'month') && (
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
                <Text style={styles.planPriceAnnual}>${ANNUAL_PRICE_MXN}</Text>
                <Text style={styles.planUnitAnnual}>{t('premium.annual.unit')}</Text>
                <Text style={styles.planAnnualTotal}>{t('premium.annual.total')}</Text>
                <View style={styles.planCtaAnnual}>
                  {loadingInterval === 'year' ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.planCtaAnnualText}>
                      {isActive ? t('premium.switchToAnnual') : t('premium.annual.cta')}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Switch to monthly — shown only to active annual Stripe subscribers */}
        {!isIOS && !billedByApple && isActive && currentInterval === 'year' && (
          <TouchableOpacity
            style={[styles.planCard, { backgroundColor: surface, borderColor: borderCol, flex: 0, width: '100%' }]}
            onPress={() => handleSubscribe('month')}
            disabled={loadingInterval !== null || loadingPortal}
            activeOpacity={0.8}
          >
            <Text style={[styles.planLabel, { color: textSecondary }]}>{t('premium.monthly.label')}</Text>
            <Text style={[styles.planPrice, { color: textPrimary }]}>${MONTHLY_PRICE_MXN}</Text>
            <Text style={[styles.planUnit, { color: textSecondary }]}>{t('premium.monthly.unit')}</Text>
            <View style={[styles.planCta, { borderColor: colors.primary }]}>
              {loadingInterval === 'month' ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={styles.planCtaText}>{t('premium.switchToMonthly')}</Text>
              )}
            </View>
          </TouchableOpacity>
        )}

        {/* IVA note — shown whenever plan cards are visible */}
        {!isIOS && !billedByApple && (!isActive || currentInterval !== null) && (
          <Text style={[styles.ivaNote, { color: textSecondary }]}>
            {t('premium.ivaNote')}
          </Text>
        )}

        {/* Apple-billed, seen outside iOS. Naming Apple and linking out is fine here —
            the anti-steering rules govern the app, not the web. */}
        {!isIOS && billedByApple && (
          <>
            <Text style={[styles.iosInfo, { color: textSecondary }]}>
              {t('premium.appleManaged')}
            </Text>
            <TouchableOpacity
              style={[styles.manageBtn, { borderColor: borderCol, backgroundColor: surface }]}
              onPress={() => WebBrowser.openBrowserAsync('https://apps.apple.com/account/subscriptions')}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              <Text style={[styles.manageBtnText, { color: colors.primary }]}>
                {t('premium.appleManageBtn')}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* Manage subscription — Stripe billing portal, so never for Apple-billed users,
            and never on iOS (an external payment link-out). */}
        {!isIOS && !billedByApple && isActive && (
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
  featureIconWrap: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
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
  iosInfo:     { textAlign: 'center', fontSize: 13, lineHeight: 19, marginTop: spacing.sm, marginBottom: spacing.md },

  manageBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  manageBtnText: { fontSize: 15, fontWeight: '600' },

  // App Store paywall — full-width stacked cards rather than the side-by-side pair,
  // since StoreKit price strings are long and must not be truncated.
  iapLoader: { marginVertical: spacing.lg },
  iapCard: {
    borderRadius: 16,
    borderWidth: 2,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  iapCardAnnual: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  restoreBtn: { paddingVertical: 14, alignItems: 'center', marginTop: spacing.xs, minHeight: 44 },
  restoreBtnText: { fontSize: 15, fontWeight: '600' },

  usageCard:  { borderRadius: 12, borderWidth: 1, padding: spacing.md, marginBottom: spacing.md, gap: 12 },
  usageTitle: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8, marginBottom: 4 },
  usageRow:    { gap: 6 },
  usageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  usageLabel:  { fontSize: 13, fontWeight: '500' },
  usagePercent: { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  usageTrack:  { height: 6, borderRadius: 999, overflow: 'hidden' },
  usageFill:   { height: 6, borderRadius: 999 },
});

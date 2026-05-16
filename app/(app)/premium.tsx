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
import { CaretLeft, Check } from 'phosphor-react-native';
import { useAuthStore } from '../../src/stores/authStore';
import { createCheckoutSession, fetchPortalUrl, fetchSubscriptionStatus } from '../../src/api/subscription';
import { useUIStore } from '../../src/stores/uiStore';
import { useTheme } from '../../src/theme/ThemeContext';
import { spacing, textStyles } from '../../src/theme';

// ── UsageRow ───────────────────────────────────────────────────────────────

function UsageRow({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct   = limit > 0 ? Math.min(used / limit, 1) : 0;
  const color = pct >= 1 ? '#e11d48' : pct >= 0.8 ? '#d97706' : '#4f46e5';
  return (
    <View style={styles.usageRow}>
      <View style={styles.usageHeader}>
        <Text style={styles.usageLabel}>{label}</Text>
        <Text style={[styles.usageCount, { color }]}>{used}/{limit}</Text>
      </View>
      <View style={styles.usageTrack}>
        <View style={[styles.usageFill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

const _apiUrl = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3000/api/v1';
const _appBase = _apiUrl.replace(/\/api\/v1\/?$/, '');
const SUCCESS_URL = `${_appBase}/subscription?success=1`;
const CANCEL_URL  = `${_appBase}/subscription`;

const FEATURES = [
  'Importar estados de cuenta (PDF/CSV)',
  'Entrada de transacciones por voz',
  'Escaneo de recibos con cámara',
  'Asistente IA personalizado (próximamente)',
];

// ── Screen ─────────────────────────────────────────────────────────────────

export default function PremiumScreen() {
  const user    = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const { showToast } = useUIStore();
  const { theme, isDark } = useTheme();

  const [loadingInterval, setLoadingInterval] = useState<'month' | 'year' | null>(null);
  const [loadingPortal, setLoadingPortal]     = useState(false);

  const bg            = isDark ? theme.background  : '#f8fafc';
  const surface       = isDark ? theme.surface     : '#ffffff';
  const textPrimary   = isDark ? theme.textPrimary : '#0f172a';
  const textSecondary = isDark ? theme.textSecondary : '#64748b';
  const borderCol     = isDark ? theme.border      : '#e2e8f0';

  const status      = user?.subscription_status ?? 'none';
  const isActive    = status === 'active';
  const isOnTrial   = status === 'trial_active';
  const trialEndsAt = user?.trial_ends_at ?? null;

  const trialDaysLeft = (() => {
    if (!trialEndsAt) return 0;
    const diff = new Date(trialEndsAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  })();

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
        if (user) setUser({ ...user, subscription_status: 'active' });
        showToast('¡Bienvenido a Premium! Tu suscripción ya está activa.', 'success');
        router.replace('/(app)');
      }
    } catch {
      showToast('No se pudo abrir el proceso de pago. Intenta de nuevo.', 'error');
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
      showToast('No se pudo abrir el portal de suscripción.', 'error');
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
          accessibilityLabel="Volver"
        >
          <CaretLeft size={24} color={textPrimary} weight="bold" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>Vittio Premium</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Status banner */}
        {isOnTrial && (
          <View style={styles.trialBanner}>
            <Text style={styles.trialBannerText}>
              {trialDaysLeft > 0
                ? `${trialDaysLeft} día${trialDaysLeft !== 1 ? 's' : ''} restantes en tu prueba gratuita`
                : 'Tu prueba gratuita está por terminar'}
            </Text>
          </View>
        )}
        {!isOnTrial && !isActive && (
          <View style={styles.expiredBanner}>
            <Text style={styles.expiredBannerText}>Tu prueba gratuita ha terminado</Text>
          </View>
        )}
        {isActive && (
          <View style={styles.activeBanner}>
            <Text style={styles.activeBannerText}>Ya eres usuario Premium ✓</Text>
          </View>
        )}

        {/* Trial usage bars */}
        {isOnTrial && user && (
          <View style={[styles.usageCard, { backgroundColor: surface, borderColor: borderCol }]}>
            <Text style={[styles.usageTitle, { color: textSecondary }]}>USO DE PRUEBA</Text>
            <UsageRow
              label="Estados de cuenta"
              used={user.statement_files_used}
              limit={user.statement_files_limit}
            />
            <UsageRow
              label="Usos de IA (voz + cámara)"
              used={user.ai_calls_used}
              limit={user.ai_calls_limit}
            />
          </View>
        )}

        {/* Hero */}
        <Text style={[styles.heroTitle, { color: textPrimary }]}>
          Desbloquea todo el potencial de Vittio
        </Text>
        <Text style={[styles.heroSubtitle, { color: textSecondary }]}>
          Importa estados de cuenta, usa IA y mucho más.
        </Text>

        {/* Feature list */}
        <View style={[styles.featureCard, { backgroundColor: surface, borderColor: borderCol }]}>
          {FEATURES.map((feature) => (
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
              <Text style={[styles.planLabel, { color: textSecondary }]}>MENSUAL</Text>
              <Text style={[styles.planPrice, { color: textPrimary }]}>$149</Text>
              <Text style={[styles.planUnit, { color: textSecondary }]}>MXN/mes</Text>
              <View style={[styles.planCta, { borderColor: '#4f46e5' }]}>
                {loadingInterval === 'month' ? (
                  <ActivityIndicator size="small" color="#4f46e5" />
                ) : (
                  <Text style={styles.planCtaText}>Suscribirse</Text>
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
                <Text style={styles.savingsBadgeText}>-33%</Text>
              </View>
              <Text style={styles.planLabelAnnual}>ANUAL</Text>
              <Text style={styles.planPriceAnnual}>$99</Text>
              <Text style={styles.planUnitAnnual}>MXN/mes</Text>
              <Text style={styles.planAnnualTotal}>$1,188 MXN/año</Text>
              <View style={styles.planCtaAnnual}>
                {loadingInterval === 'year' ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.planCtaAnnualText}>Ahorra $600/año</Text>
                )}
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* IVA note */}
        {!isActive && (
          <Text style={[styles.ivaNote, { color: textSecondary }]}>
            IVA incluido · Cancela cuando quieras
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
              <ActivityIndicator size="small" color="#4f46e5" />
            ) : (
              <Text style={[styles.manageBtnText, { color: '#4f46e5' }]}>
                Gestionar suscripción
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

  trialBanner:      { backgroundColor: '#fef3c7', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, marginBottom: spacing.md },
  trialBannerText:  { color: '#92400e', fontSize: 14, fontWeight: '500', textAlign: 'center' },
  expiredBanner:    { backgroundColor: '#fee2e2', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, marginBottom: spacing.md },
  expiredBannerText: { color: '#991b1b', fontSize: 14, fontWeight: '500', textAlign: 'center' },
  activeBanner:     { backgroundColor: '#d1fae5', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, marginBottom: spacing.md },
  activeBannerText: { color: '#065f46', fontSize: 14, fontWeight: '600', textAlign: 'center' },

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
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
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
  planCtaText:    { color: '#4f46e5', fontSize: 13, fontWeight: '600' },
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
  usageTrack:  { height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', overflow: 'hidden' },
  usageFill:   { height: 4, borderRadius: 2 },
});

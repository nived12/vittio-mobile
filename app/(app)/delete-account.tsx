import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { CaretLeft, Trash, X, CheckCircle, Warning } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { deleteAccount } from '../../src/api/user';
import { useAuthStore } from '../../src/stores/authStore';
import { useUIStore } from '../../src/stores/uiStore';
import { useTheme } from '../../src/theme/ThemeContext';
import { colors, spacing, textStyles } from '../../src/theme';

export default function DeleteAccountScreen() {
  const { t, i18n } = useTranslation();
  const { showToast } = useUIStore();
  const { theme, isDark } = useTheme();
  const logout = useAuthStore((s) => s.logout);

  const [step, setStep] = useState<'info' | 'confirm'>('info');
  const [confirmText, setConfirmText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const confirmWord = useMemo(
    () => (i18n.language.startsWith('es') ? 'ELIMINAR' : 'DELETE'),
    [i18n.language],
  );
  const canSubmit = confirmText.trim() === confirmWord && !submitting;

  const bg = isDark ? theme.background : '#f8fafc';
  const surface = isDark ? theme.surface : '#ffffff';
  const textPrimary = isDark ? theme.textPrimary : '#0f172a';
  const textSecondary = isDark ? theme.textSecondary : '#64748b';
  const borderCol = isDark ? theme.border : '#e2e8f0';

  async function handleDelete() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await deleteAccount();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await logout();
      // logout resets the auth store; the root layout will redirect to /(auth)/login
      showToast(t('account.successToast'), 'success');
    } catch (err) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setSubmitting(false);
      Alert.alert(t('account.errorTitle'), t('account.errorBody'));
    }
  }

  function back() {
    if (step === 'confirm') {
      setStep('info');
      setConfirmText('');
    } else {
      router.back();
    }
  }

  const deleteItems = [
    t('account.deleteItems.transactions'),
    t('account.deleteItems.bankAccounts'),
    t('account.deleteItems.goalsEtc'),
    t('account.deleteItems.recurring'),
    t('account.deleteItems.assistant'),
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={back} disabled={submitting} accessibilityRole="button">
            <Text style={[styles.backText, { color: colors.brand.primary }]}>
              <CaretLeft size={14} color={colors.brand.primary} weight="regular" />{' '}
              {step === 'confirm' ? t('account.back') : t('account.cancelNav')}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {step === 'info' ? (
            <>
              <View style={styles.iconContainer}>
                <Trash size={32} color="#ef4444" weight="regular" />
              </View>
              <Text style={[styles.title, { color: textPrimary }]}>
                {t('account.deleteTitle')}
              </Text>
              <Text style={[styles.subtitle, { color: textSecondary }]}>
                {t('account.deleteSubtitle')}
              </Text>

              <View style={[styles.card, { backgroundColor: surface, borderColor: borderCol }]}>
                <Text style={[styles.cardLabel, { color: textSecondary }]}>
                  {t('account.willBeDeleted')}
                </Text>
                {deleteItems.map((item, i) => (
                  <View key={i} style={styles.listItem}>
                    <X size={14} color="#ef4444" weight="bold" />
                    <Text style={[styles.listText, { color: textPrimary }]}>{item}</Text>
                  </View>
                ))}
              </View>

              <View style={[styles.card, styles.cardSuccess]}>
                <Text style={[styles.cardLabel, { color: '#15803d' }]}>
                  {t('account.willBeRetained')}
                </Text>
                <View style={styles.listItem}>
                  <CheckCircle size={14} color="#10b981" weight="bold" />
                  <Text style={[styles.listText, { color: '#374151' }]}>
                    {t('account.retainItems.legalConsent')}
                  </Text>
                </View>
              </View>

              <View style={[styles.card, styles.cardWarning]}>
                <View style={styles.listItem}>
                  <Warning size={14} color="#f59e0b" weight="bold" />
                  <Text style={[styles.warningText, { color: '#92400e' }]}>
                    {t('account.subscriptionWarning')}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.continueBtn}
                onPress={() => setStep('confirm')}
                accessibilityRole="button"
              >
                <Text style={styles.continueBtnText}>{t('account.continueToDelete')}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={[styles.title, { color: textPrimary, marginTop: spacing.xl }]}>
                {t('account.confirmTitle')}
              </Text>
              <Text style={[styles.subtitle, { color: textSecondary, marginBottom: spacing.xl }]}>
                {t('account.confirmSubtitle')}
              </Text>

              <TextInput
                style={[
                  styles.confirmInput,
                  { backgroundColor: isDark ? theme.surfaceElevated : '#f1f5f9', color: textPrimary, borderColor: borderCol },
                ]}
                value={confirmText}
                onChangeText={setConfirmText}
                placeholder={t('account.confirmPlaceholder')}
                placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                autoCapitalize="characters"
                autoCorrect={false}
                accessibilityLabel={t('account.confirmInputLabel')}
                accessibilityHint={t('account.confirmInputHint')}
                editable={!submitting}
              />

              <TouchableOpacity
                style={[styles.deleteBtn, !canSubmit && styles.deleteBtnDisabled]}
                onPress={handleDelete}
                disabled={!canSubmit}
                accessibilityRole="button"
                accessibilityLabel={t('account.confirmButtonA11y')}
                accessibilityState={{ disabled: !canSubmit }}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.deleteBtnText}>{t('account.confirmButton')}</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: spacing.screenPaddingH,
    paddingVertical: spacing.md,
  },
  backText: {
    ...textStyles.bodyMd,
    fontFamily: 'Inter_500Medium',
  },
  scrollContent: {
    paddingHorizontal: spacing.screenPaddingH,
    paddingBottom: 40,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  title: {
    ...textStyles.displayMd,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...textStyles.bodyMd,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  cardSuccess: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  cardWarning: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  cardLabel: {
    ...textStyles.label,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 11,
    marginBottom: 12,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 10,
  },
  listText: {
    ...textStyles.bodyMd,
    flex: 1,
  },
  warningText: {
    ...textStyles.bodySm,
    flex: 1,
  },
  continueBtn: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  continueBtnText: {
    color: '#ef4444',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  confirmInput: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    textAlign: 'center',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    letterSpacing: 2,
    marginBottom: spacing.lg,
  },
  deleteBtn: {
    height: 52,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnDisabled: {
    backgroundColor: '#e2e8f0',
  },
  deleteBtnText: {
    color: '#ffffff',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
});

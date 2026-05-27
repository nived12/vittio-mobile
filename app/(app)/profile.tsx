import React, { useEffect, useState } from 'react';
import {
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
import { CaretLeft } from 'phosphor-react-native';
import { useAuthStore } from '../../src/stores/authStore';
import { useUpdateUser } from '../../src/hooks/useUser';
import { useUIStore } from '../../src/stores/uiStore';
import { colors, spacing, textStyles } from '../../src/theme';
import { useTheme } from '../../src/theme/ThemeContext';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { showToast } = useUIStore();
  const user = useAuthStore((s) => s.user);
  const { theme, isDark } = useTheme();
  const bg = isDark ? theme.background : '#f8fafc';
  const surface = isDark ? theme.surface : '#ffffff';
  const surfaceEl = isDark ? theme.surfaceElevated : '#f1f5f9';
  const textPrimary = isDark ? theme.textPrimary : '#0f172a';
  const textSecondary = isDark ? theme.textSecondary : '#64748b';
  const borderCol = isDark ? theme.border : '#e2e8f0';
  const mutedCol = isDark ? '#64748b' : '#94a3b8';

  const [firstName, setFirstName] = useState(user?.first_name ?? '');
  const [lastName, setLastName] = useState(user?.last_name ?? '');
  const [attempted, setAttempted] = useState(false);

  const updateUserMutation = useUpdateUser();

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name);
      setLastName(user.last_name);
    }
  }, [user?.first_name, user?.last_name]);

  const firstNameError = attempted && firstName.trim().length === 0;
  const lastNameError = attempted && lastName.trim().length === 0;

  async function handleSave() {
    setAttempted(true);
    if (firstName.trim().length === 0 || lastName.trim().length === 0) return;

    try {
      await updateUserMutation.mutateAsync({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });
      showToast(t('settings.profileSaved'), 'success');
    } catch {
      showToast(t('settings.profileSaveError'), 'error');
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
        >
          <CaretLeft size={24} color={textPrimary} weight="regular" />
        </TouchableOpacity>
        <Text style={[styles.title, { color: textPrimary }]}>{t('settings.editProfileTitle')}</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.card, { backgroundColor: surface, borderColor: borderCol }]}>
            <Text style={[styles.fieldLabel, { color: textSecondary }]}>{t('settings.firstNameLabel')}</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: surfaceEl, color: textPrimary, borderColor: borderCol }, firstNameError && styles.textInputError]}
              value={firstName}
              onChangeText={setFirstName}
              placeholder={t('auth.signup.firstNamePlaceholder')}
              placeholderTextColor={mutedCol}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
            />
            {firstNameError && (
              <Text style={styles.errorText}>{t('auth.errors.firstNameRequired')}</Text>
            )}

            <View style={styles.fieldSpacer} />

            <Text style={[styles.fieldLabel, { color: textSecondary }]}>{t('settings.lastNameLabel')}</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: surfaceEl, color: textPrimary, borderColor: borderCol }, lastNameError && styles.textInputError]}
              value={lastName}
              onChangeText={setLastName}
              placeholder={t('auth.signup.lastNamePlaceholder')}
              placeholderTextColor={mutedCol}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
            />
            {lastNameError && (
              <Text style={styles.errorText}>{t('auth.errors.lastNameRequired')}</Text>
            )}

            <View style={styles.fieldSpacer} />

            <Text style={[styles.fieldLabel, { color: textSecondary }]}>{t('settings.emailLabel')}</Text>
            <View style={[styles.textInput, styles.readOnlyInput, { backgroundColor: surfaceEl, borderColor: borderCol }]}>
              <Text style={[styles.readOnlyText, { color: textSecondary }]}>{user?.email}</Text>
            </View>
            <Text style={[styles.fieldHint, { color: mutedCol }]}>{t('settings.emailHint')}</Text>

            <TouchableOpacity
              style={[styles.saveBtn, updateUserMutation.isPending && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={updateUserMutation.isPending}
              accessibilityRole="button"
            >
              <Text style={styles.saveBtnText}>
                {updateUserMutation.isPending ? t('common.loading') : t('settings.saveProfile')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingHorizontal: spacing.screenPaddingH,
    paddingVertical: spacing.md,
    gap: 8,
  },
  backBtn: {
    padding: 4,
  },
  title: {
    ...textStyles.displayLg,
    color: colors.text.primary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenPaddingH,
    paddingTop: spacing.sm,
  },
  card: {
    backgroundColor: colors.bg.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderNested.default,
    padding: spacing.cardPadding,
  },
  fieldLabel: {
    ...textStyles.label,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 11,
  },
  textInput: {
    backgroundColor: colors.bg.surface2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderNested.default,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...textStyles.bodyMd,
    color: colors.text.primary,
  },
  textInputError: {
    borderColor: colors.borderNested.error,
    backgroundColor: colors.error.bg,
  },
  readOnlyInput: {
    justifyContent: 'center',
    opacity: 0.7,
  },
  readOnlyText: {
    ...textStyles.bodyMd,
    color: colors.text.secondary,
  },
  fieldHint: {
    ...textStyles.bodySm,
    color: colors.text.muted,
    marginTop: 4,
  },
  fieldSpacer: {
    height: spacing.md,
  },
  errorText: {
    ...textStyles.bodySm,
    color: colors.expense,
    marginTop: 4,
  },
  saveBtn: {
    backgroundColor: colors.brand.primary,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#ffffff',
  },
});

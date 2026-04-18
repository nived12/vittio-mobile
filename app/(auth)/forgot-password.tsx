import React, { useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';

import { authApi } from '../../src/api/auth';
import { colors, components, spacing, textStyles } from '../../src/theme';

const forgotSchema = z.object({
  email: z.string().email('Enter a valid email address').toLowerCase().trim(),
});

type ForgotFormValues = z.infer<typeof forgotSchema>;

export default function ForgotPasswordScreen() {
  const { t }      = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [sent,      setSent]      = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  });

  const emailValue = watch('email');
  const canSubmit  = emailValue.length > 0;

  const onSubmit = async (values: ForgotFormValues) => {
    if (isLoading) return;
    setIsLoading(true);
    Keyboard.dismiss();
    try {
      await authApi.forgotPassword(values.email);
      setSent(true);
    } catch {
      setSent(true); // Don't reveal whether email exists
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successIcon}>
          <Feather name="mail" size={32} color={colors.brand.primary} />
        </View>
        <Text style={styles.successTitle}>{t('auth.forgotPassword.successMessage')}</Text>
        <TouchableOpacity
          onPress={() => router.replace('/(auth)/login')}
          style={styles.backLink}
        >
          <Text style={styles.backLinkText}>{t('auth.forgotPassword.backToLogin')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel={t('auth.forgotPassword.backToLogin')}
          >
            <Feather name="chevron-left" size={24} color={colors.text.primary} />
          </TouchableOpacity>

          <Text style={styles.heading} accessibilityRole="header">
            {t('auth.forgotPassword.title')}
          </Text>
          <Text style={styles.subtitle}>{t('auth.forgotPassword.subtitle')}</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t('auth.forgotPassword.emailLabel')}</Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value, ref } }) => (
                <>
                  <TextInput
                    ref={ref}
                    style={[styles.input, errors.email ? styles.inputError : null]}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder={t('auth.forgotPassword.emailPlaceholder')}
                    placeholderTextColor={colors.neutral[400]}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    textContentType="emailAddress"
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit(onSubmit)}
                    editable={!isLoading}
                    accessibilityLabel="Email address"
                  />
                  {errors.email?.message != null && (
                    <Text style={styles.fieldError}>{errors.email.message}</Text>
                  )}
                </>
              )}
            />
          </View>

          <Pressable
            onPress={canSubmit && !isLoading ? handleSubmit(onSubmit) : undefined}
            disabled={!canSubmit || isLoading}
            accessibilityRole="button"
            accessibilityLabel={t('auth.forgotPassword.submitButton')}
            style={[
              styles.submitButton,
              (!canSubmit || isLoading) && styles.submitButtonDisabled,
            ]}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={[styles.submitButtonText, (!canSubmit || isLoading) && styles.submitButtonTextDisabled]}>
                {t('auth.forgotPassword.submitButton')}
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    flexGrow:          1,
    backgroundColor:   colors.bg.screen,
    paddingHorizontal: spacing.screenPaddingH,
    paddingBottom:     spacing.xl,
  },
  backButton: {
    marginTop:      spacing.md,
    paddingVertical: 8,
    paddingRight:   16,
    alignSelf:      'flex-start',
  },
  heading: {
    ...textStyles.displayLg,
    color:        colors.text.primary,
    marginTop:    spacing.lg,
    marginBottom: 8,
  },
  subtitle: {
    ...textStyles.bodyMd,
    color:        colors.text.secondary,
    marginBottom: spacing.xl,
  },
  fieldGroup: { marginBottom: spacing.formFieldGap },
  fieldLabel: { ...components.input.label, marginBottom: 6 },
  fieldError: { ...components.input.errorText },
  input: {
    height:           components.input.height,
    borderRadius:     components.input.borderRadius,
    borderWidth:      1,
    borderColor:      components.input.resting.borderColor,
    backgroundColor:  components.input.resting.backgroundColor,
    paddingHorizontal: components.input.paddingH,
    fontFamily:       components.input.fontFamily,
    fontSize:         components.input.fontSize,
    color:            components.input.resting.color,
  },
  inputError: {
    borderColor:     components.input.error.borderColor,
    backgroundColor: components.input.error.backgroundColor,
  },
  submitButton: {
    height:          components.button.heightLg,
    borderRadius:    components.button.borderRadius,
    backgroundColor: colors.brand.primary,
    alignItems:      'center',
    justifyContent:  'center',
    marginTop:       spacing.lg,
  },
  submitButtonDisabled: {
    backgroundColor: components.button.primary.disabledBg,
  },
  submitButtonText: {
    ...textStyles.bodyLg,
    fontFamily: 'Inter_600SemiBold',
    color:      '#ffffff',
  },
  submitButtonTextDisabled: {
    color: components.button.primary.disabledColor,
  },
  // Success state
  successContainer: {
    flex:            1,
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: colors.bg.screen,
    paddingHorizontal: spacing.screenPaddingH,
  },
  successIcon: {
    width:           72,
    height:          72,
    borderRadius:    36,
    backgroundColor: colors.brand.primaryLight,
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    spacing.lg,
  },
  successTitle: {
    ...textStyles.headingLg,
    color:     colors.text.primary,
    textAlign: 'center',
  },
  backLink: {
    marginTop:      spacing.xl,
    paddingVertical: 12,
  },
  backLinkText: {
    ...textStyles.bodyMd,
    color: colors.brand.primary,
  },
});

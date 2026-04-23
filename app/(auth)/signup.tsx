import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
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
import * as Haptics from 'expo-haptics';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';

import { useAuthStore } from '../../src/stores/authStore';
import { getApiErrorCode, getApiErrorDetails } from '../../src/api/client';
import { colors, components, spacing, textStyles } from '../../src/theme';
import {
  PasswordStrengthBar,
  calculateStrength,
} from '../../src/components/ui/PasswordStrengthBar';

// ── Validation schema ──────────────────────────────────────────────────────

const signupSchema = z
  .object({
    first_name:            z.string().min(1, 'First name is required'),
    last_name:             z.string().min(1, 'Last name is required'),
    email:                 z.string().email('Enter a valid email address').toLowerCase().trim(),
    password:              z.string().min(8, 'Password must be at least 8 characters'),
    password_confirmation: z.string(),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: 'Passwords do not match',
    path:    ['password_confirmation'],
  });

type SignupFormValues = z.infer<typeof signupSchema>;

// ── Screen ─────────────────────────────────────────────────────────────────

export default function SignupScreen() {
  const { t }     = useTranslation();
  const signup    = useAuthStore((s) => s.signup);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [showPassword,         setShowPassword]         = useState(false);
  const [showConfirmPassword,  setShowConfirmPassword]  = useState(false);
  const [passwordStrength,     setPasswordStrength]     = useState<0|1|2|3|4>(0);

  // ── Refs ─────────────────────────────────────────────────────────────────
  const scrollViewRef      = useRef<ScrollView>(null);
  const lastNameRef        = useRef<TextInput>(null);
  const emailRef           = useRef<TextInput>(null);
  const passwordRef        = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  // ── Form ─────────────────────────────────────────────────────────────────
  const {
    control,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      first_name:            '',
      last_name:             '',
      email:                 '',
      password:              '',
      password_confirmation: '',
    },
  });

  const passwordValue = watch('password');

  useEffect(() => {
    setPasswordStrength(calculateStrength(passwordValue));
  }, [passwordValue]);

  const allFieldsFilled =
    watch('first_name').length > 0 &&
    watch('last_name').length > 0 &&
    watch('email').length > 0 &&
    passwordValue.length > 0 &&
    watch('password_confirmation').length > 0;

  // ── Submit ────────────────────────────────────────────────────────────────
  const onSubmit = async (values: SignupFormValues) => {
    if (isLoading) return;
    Keyboard.dismiss();

    try {
      await signup(values);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(app)');
    } catch (err) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const code    = getApiErrorCode(err);
      const details = getApiErrorDetails(err);

      if (code === 'VALIDATION_ERROR' && details.length > 0) {
        // Map server field errors back to form fields
        const fieldNames: (keyof SignupFormValues)[] = [
          'first_name',
          'last_name',
          'email',
          'password',
          'password_confirmation',
        ];

        details.forEach((detail) => {
          const field = detail.field as keyof SignupFormValues;
          if (fieldNames.includes(field)) {
            setError(field, { message: detail.message });
          }
        });

        // Scroll to the first error field
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      } else {
        setError('email', {
          message: t('errors.UNKNOWN_ERROR'),
        });
      }
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back button */}
          <TouchableOpacity
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t('auth.signup.backToLogin')}
            style={styles.backButton}
          >
            <Feather name="chevron-left" size={24} color={colors.text.primary} />
          </TouchableOpacity>

          {/* Title */}
          <Text style={styles.heading} accessibilityRole="header">
            {t('auth.signup.title')}
          </Text>
          <Text style={styles.subtitle}>{t('auth.signup.subtitle')}</Text>

          {/* First + Last name row */}
          <View style={styles.nameRow}>
            <View style={styles.nameField}>
              <Text style={styles.fieldLabel}>{t('auth.signup.firstNameLabel')}</Text>
              <Controller
                control={control}
                name="first_name"
                render={({ field: { onChange, onBlur, value, ref } }) => (
                  <>
                    <TextInput
                      ref={ref}
                      style={[styles.input, errors.first_name ? styles.inputError : null]}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder={t('auth.signup.firstNamePlaceholder')}
                      placeholderTextColor={colors.neutral[400]}
                      autoCapitalize="words"
                      autoComplete="given-name"
                      textContentType="givenName"
                      returnKeyType="next"
                      onSubmitEditing={() => lastNameRef.current?.focus()}
                      editable={!isLoading}
                      accessibilityLabel="First name"
                      accessibilityHint="Enter your first name"
                    />
                    {errors.first_name?.message != null && (
                      <Text style={styles.fieldError}>{errors.first_name.message}</Text>
                    )}
                  </>
                )}
              />
            </View>

            <View style={styles.nameField}>
              <Text style={styles.fieldLabel}>{t('auth.signup.lastNameLabel')}</Text>
              <Controller
                control={control}
                name="last_name"
                render={({ field: { onChange, onBlur, value } }) => (
                  <>
                    <TextInput
                      ref={lastNameRef}
                      style={[styles.input, errors.last_name ? styles.inputError : null]}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder={t('auth.signup.lastNamePlaceholder')}
                      placeholderTextColor={colors.neutral[400]}
                      autoCapitalize="words"
                      autoComplete="family-name"
                      textContentType="familyName"
                      returnKeyType="next"
                      onSubmitEditing={() => emailRef.current?.focus()}
                      editable={!isLoading}
                      accessibilityLabel="Last name"
                      accessibilityHint="Enter your last name"
                    />
                    {errors.last_name?.message != null && (
                      <Text style={styles.fieldError}>{errors.last_name.message}</Text>
                    )}
                  </>
                )}
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t('auth.signup.emailLabel')}</Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <>
                  <TextInput
                    ref={emailRef}
                    style={[styles.input, errors.email ? styles.inputError : null]}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder={t('auth.signup.emailPlaceholder')}
                    placeholderTextColor={colors.neutral[400]}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    textContentType="emailAddress"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    editable={!isLoading}
                    accessibilityLabel="Email address"
                    accessibilityHint="Enter your email address"
                  />
                  {errors.email?.message != null && (
                    <Text style={styles.fieldError}>{errors.email.message}</Text>
                  )}
                </>
              )}
            />
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t('auth.signup.passwordLabel')}</Text>
            <View style={[styles.inputWrapper, errors.password ? styles.inputWrapperError : null]}>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    ref={passwordRef}
                    style={styles.inputInner}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="••••••••"
                    placeholderTextColor={colors.neutral[400]}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="new-password"
                    textContentType="none"
                    returnKeyType="next"
                    onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                    editable={!isLoading}
                    accessibilityLabel="Password"
                    accessibilityHint="Must be at least 8 characters"
                  />
                )}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword((v) => !v)}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? t('auth.signup.hidePassword') : t('auth.signup.showPassword')}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Feather name={showPassword ? 'eye-off' : 'eye'} size={20} color={colors.neutral[400]} />
              </TouchableOpacity>
            </View>
            {passwordValue.length > 0 && <PasswordStrengthBar strength={passwordStrength} />}
            {errors.password?.message != null && (
              <Text style={styles.fieldError}>{errors.password.message}</Text>
            )}
          </View>

          {/* Confirm password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t('auth.signup.confirmPasswordLabel')}</Text>
            <View style={[styles.inputWrapper, errors.password_confirmation ? styles.inputWrapperError : null]}>
              <Controller
                control={control}
                name="password_confirmation"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    ref={confirmPasswordRef}
                    style={styles.inputInner}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="••••••••"
                    placeholderTextColor={colors.neutral[400]}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="new-password"
                    textContentType="none"
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit(onSubmit)}
                    editable={!isLoading}
                    accessibilityLabel="Confirm password"
                    accessibilityHint="Re-enter your password"
                  />
                )}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword((v) => !v)}
                accessibilityRole="button"
                accessibilityLabel={showConfirmPassword ? t('auth.signup.hideConfirmPassword') : t('auth.signup.showConfirmPassword')}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Feather name={showConfirmPassword ? 'eye-off' : 'eye'} size={20} color={colors.neutral[400]} />
              </TouchableOpacity>
            </View>
            {errors.password_confirmation?.message != null && (
              <Text style={styles.fieldError}>{errors.password_confirmation.message}</Text>
            )}
          </View>

          {/* Submit */}
          <View style={styles.submitContainer}>
            <Pressable
              onPress={allFieldsFilled && !isLoading ? handleSubmit(onSubmit) : undefined}
              disabled={!allFieldsFilled || isLoading}
              accessibilityRole="button"
              accessibilityLabel={t('auth.signup.submitButton')}
              accessibilityHint="Double tap to create your account"
              accessibilityState={{ disabled: !allFieldsFilled || isLoading, busy: isLoading }}
              style={[
                styles.submitButton,
                (!allFieldsFilled || isLoading) && styles.submitButtonDisabled,
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={[styles.submitButtonText, (!allFieldsFilled || isLoading) && styles.submitButtonTextDisabled]}>
                  {t('auth.signup.submitButton')}
                </Text>
              )}
            </Pressable>
          </View>

          {/* Terms */}
          <Text style={styles.termsText}>
            {t('auth.signup.termsNotice')}{' '}
            <Text
              style={styles.termsLink}
              onPress={() => Linking.openURL(process.env['EXPO_PUBLIC_TERMS_URL'] ?? 'https://vitt.io/terms')}
              accessibilityRole="link"
              accessibilityLabel={t('auth.signup.termsLink')}
              accessibilityHint="Opens Terms of Service in browser"
            >
              {t('auth.signup.termsLink')}
            </Text>
            {' '}{t('auth.signup.andConnector')}{' '}
            <Text
              style={styles.termsLink}
              onPress={() => Linking.openURL(process.env['EXPO_PUBLIC_PRIVACY_URL'] ?? 'https://vitt.io/privacy')}
              accessibilityRole="link"
              accessibilityLabel={t('auth.signup.privacyLink')}
              accessibilityHint="Opens Privacy Policy in browser"
            >
              {t('auth.signup.privacyLink')}
            </Text>
          </Text>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
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

  // Name row
  nameRow: {
    flexDirection:  'row',
    gap:             8,
    marginBottom:   spacing.formFieldGap,
  },
  nameField: {
    flex: 1,
  },

  // Generic field
  fieldGroup: {
    marginBottom: spacing.formFieldGap,
  },
  fieldLabel: {
    ...components.input.label,
    marginBottom: 6,
  },
  fieldError: {
    ...components.input.errorText,
  },

  // Input
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
  inputWrapper: {
    flexDirection:   'row',
    alignItems:      'center',
    height:          components.input.height,
    borderRadius:    components.input.borderRadius,
    borderWidth:     1,
    borderColor:     components.input.resting.borderColor,
    backgroundColor: components.input.resting.backgroundColor,
    paddingLeft:     components.input.paddingH,
    paddingRight:    8,
    overflow:        'hidden',
  },
  inputWrapperError: {
    borderColor:     components.input.error.borderColor,
    backgroundColor: components.input.error.backgroundColor,
  },
  inputInner: {
    flex:              1,
    fontFamily:        components.input.fontFamily,
    fontSize:          components.input.fontSize,
    color:             components.input.resting.color,
    paddingHorizontal: components.input.paddingH,
  },
  eyeButton: {
    padding:        8,
    alignItems:     'center',
    justifyContent: 'center',
  },

  // Submit
  submitContainer: {
    marginTop: spacing.lg,
  },
  submitButton: {
    height:          components.button.heightLg,
    borderRadius:    components.button.borderRadius,
    backgroundColor: colors.brand.primary,
    alignItems:      'center',
    justifyContent:  'center',
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

  // Terms
  termsText: {
    ...textStyles.caption,
    color:       colors.neutral[400],
    textAlign:   'center',
    marginTop:   spacing.md,
    marginBottom: spacing.lg,
    lineHeight:  18,
  },
  termsLink: {
    color: colors.brand.primary,
  },
});

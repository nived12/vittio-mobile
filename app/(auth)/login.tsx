import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
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
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';
import { Image } from 'react-native';

import { useAuthStore } from '../../src/stores/authStore';
import { getApiErrorCode, isApiError } from '../../src/api/client';
import { authApi } from '../../src/api/auth';
import { colors, components, spacing, textStyles } from '../../src/theme';

// ── Validation schema ──────────────────────────────────────────────────────

const loginSchema = z.object({
  email:    z.string().email('Enter a valid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// ── Types ──────────────────────────────────────────────────────────────────

type ErrorVariant =
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_NOT_CONFIRMED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'NETWORK_ERROR'
  | null;

// ── Screen ─────────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const { t }       = useTranslation();
  const login       = useAuthStore((s) => s.login);
  const isLoading   = useAuthStore((s) => s.isLoading);

  const [showPassword,    setShowPassword]    = useState(false);
  const [errorCode,       setErrorCode]       = useState<ErrorVariant>(null);
  const [resendSuccess,   setResendSuccess]   = useState(false);

  // ── Refs ─────────────────────────────────────────────────────────────────
  const passwordRef = useRef<TextInput>(null);

  // ── Animations ───────────────────────────────────────────────────────────
  const logoOpacity   = useRef(new Animated.Value(0)).current;
  const formOpacity   = useRef(new Animated.Value(0)).current;
  const formShake     = useRef(new Animated.Value(0)).current;
  const errorSlideY   = useRef(new Animated.Value(12)).current;
  const errorOpacity  = useRef(new Animated.Value(0)).current;

  // ── Form ─────────────────────────────────────────────────────────────────
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const emailValue    = watch('email');
  const passwordValue = watch('password');
  const canSubmit     = emailValue.length > 0 && passwordValue.length > 0;

  // ── Entrance animation ────────────────────────────────────────────────────
  useEffect(() => {
    Animated.stagger(50, [
      Animated.timing(logoOpacity, {
        toValue:         1,
        duration:        250,
        useNativeDriver: true,
      }),
      Animated.timing(formOpacity, {
        toValue:         1,
        duration:        250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [formOpacity, logoOpacity]);

  // ── Error toast animation ─────────────────────────────────────────────────
  useEffect(() => {
    if (errorCode) {
      errorSlideY.setValue(12);
      errorOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(errorSlideY, {
          toValue:        0,
          damping:        15,
          stiffness:      200,
          useNativeDriver: true,
        }),
        Animated.timing(errorOpacity, {
          toValue:         1,
          duration:        250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.timing(errorOpacity, {
        toValue:         0,
        duration:        200,
        useNativeDriver: true,
      }).start();
    }
  }, [errorCode, errorOpacity, errorSlideY]);

  // ── Shake animation ───────────────────────────────────────────────────────
  function triggerShake() {
    Animated.sequence([
      Animated.timing(formShake, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(formShake, { toValue:  8, duration: 50, useNativeDriver: true }),
      Animated.timing(formShake, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(formShake, { toValue:  6, duration: 50, useNativeDriver: true }),
      Animated.timing(formShake, { toValue: -4, duration: 50, useNativeDriver: true }),
      Animated.timing(formShake, { toValue:  4, duration: 50, useNativeDriver: true }),
      Animated.timing(formShake, { toValue:  0, duration: 50, useNativeDriver: true }),
    ]).start();
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  const onSubmit = async (values: LoginFormValues) => {
    if (isLoading) return;
    setErrorCode(null);
    Keyboard.dismiss();

    try {
      await login(values.email, values.password);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(app)');
    } catch (err) {
      const code = getApiErrorCode(err);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      triggerShake();

      if (
        code === 'INVALID_CREDENTIALS' ||
        code === 'EMAIL_NOT_CONFIRMED'  ||
        code === 'RATE_LIMIT_EXCEEDED'
      ) {
        setErrorCode(code as ErrorVariant);
      } else if (!isApiError(err)) {
        setErrorCode('NETWORK_ERROR');
      } else {
        setErrorCode('INVALID_CREDENTIALS');
      }

      passwordRef.current?.focus();
    }
  };

  // ── Resend confirmation ───────────────────────────────────────────────────
  const handleResendConfirmation = async () => {
    try {
      await authApi.resendConfirmation();
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 3000);
    } catch {
      // Silent fail — the user can try again
    }
  };

  // ── Error message ─────────────────────────────────────────────────────────
  function getErrorMessage(): string {
    switch (errorCode) {
      case 'INVALID_CREDENTIALS':
        return t('auth.errors.INVALID_CREDENTIALS');
      case 'EMAIL_NOT_CONFIRMED':
        return resendSuccess
          ? t('auth.errors.confirmationSent')
          : t('auth.errors.EMAIL_NOT_CONFIRMED');
      case 'RATE_LIMIT_EXCEEDED':
        return t('auth.errors.RATE_LIMIT_EXCEEDED');
      case 'NETWORK_ERROR':
        return t('auth.errors.NETWORK_ERROR');
      default:
        return '';
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Logo ── */}
          <Animated.View style={[styles.logoContainer, { opacity: logoOpacity }]}>
            <Image
              source={require('../../assets/images/vittio_logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
              accessibilityLabel="Vittio"
            />
          </Animated.View>

          {/* ── Form ── */}
          <Animated.View
            style={[
              styles.formContainer,
              {
                opacity:   formOpacity,
                transform: [{ translateX: formShake }],
              },
            ]}
          >
            {/* Heading */}
            <Text
              style={styles.heading}
              accessibilityRole="header"
            >
              {t('auth.login.title')}
            </Text>
            <Text style={styles.subtitle}>{t('auth.login.subtitle')}</Text>

            {/* Email field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                {t('auth.login.emailLabel')}
              </Text>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value, ref } }) => (
                  <TextInput
                    ref={ref}
                    style={[
                      styles.input,
                      errors.email ? styles.inputError : null,
                    ]}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder={t('auth.login.emailPlaceholder')}
                    placeholderTextColor={colors.neutral[400]}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    textContentType="emailAddress"
                    editable={!isLoading}
                    accessibilityLabel={t('common.back')}
                    accessibilityHint="Enter the email address associated with your account"
                  />
                )}
              />
            </View>

            {/* Password field */}
            <View style={styles.fieldGroup}>
              <View style={styles.passwordLabelRow}>
                <Text style={styles.fieldLabel}>
                  {t('auth.login.passwordLabel')}
                </Text>
              </View>
              <View style={styles.inputWrapper}>
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      ref={passwordRef}
                      style={[
                        styles.input,
                        styles.inputWithRight,
                        errors.password ? styles.inputError : null,
                      ]}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="••••••••"
                      placeholderTextColor={colors.neutral[400]}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="current-password"
                      returnKeyType="done"
                      onSubmitEditing={handleSubmit(onSubmit)}
                      textContentType="password"
                      editable={!isLoading}
                      accessibilityLabel="Password"
                      accessibilityHint="Enter your account password"
                    />
                  )}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword((v) => !v)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showPassword
                      ? t('auth.login.hidePassword')
                      : t('auth.login.showPassword')
                  }
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Feather
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color={colors.neutral[400]}
                  />
                </TouchableOpacity>
              </View>

              {/* Forgot password */}
              <TouchableOpacity
                onPress={() => router.push('/(auth)/forgot-password')}
                accessibilityRole="link"
                accessibilityLabel="Forgot your password?"
                accessibilityHint="Opens password reset screen"
                style={styles.forgotLink}
                disabled={isLoading}
              >
                <Text style={styles.forgotLinkText}>
                  {t('auth.login.forgotPassword')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Submit button */}
            <View style={styles.submitContainer}>
              <Pressable
                onPress={canSubmit && !isLoading ? handleSubmit(onSubmit) : undefined}
                disabled={!canSubmit || isLoading}
                accessibilityRole="button"
                accessibilityLabel={t('auth.login.submitButton')}
                accessibilityHint="Double tap to sign in to your account"
                accessibilityState={{ disabled: !canSubmit || isLoading, busy: isLoading }}
                style={[
                  styles.submitButton,
                  (!canSubmit || isLoading) && styles.submitButtonDisabled,
                ]}
              >
                {isLoading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text
                    style={[
                      styles.submitButtonText,
                      (!canSubmit || isLoading) && styles.submitButtonTextDisabled,
                    ]}
                  >
                    {t('auth.login.submitButton')}
                  </Text>
                )}
              </Pressable>

              {/* Error toast */}
              {errorCode != null && (
                <Animated.View
                  style={[
                    styles.errorToast,
                    {
                      transform: [{ translateY: errorSlideY }],
                      opacity:   errorOpacity,
                    },
                  ]}
                  accessibilityLiveRegion="assertive"
                >
                  <Feather
                    name="alert-circle"
                    size={16}
                    color={colors.error.icon}
                    style={styles.errorIcon}
                  />
                  <View style={styles.errorTextContainer}>
                    <Text style={styles.errorToastText}>{getErrorMessage()}</Text>
                    {errorCode === 'EMAIL_NOT_CONFIRMED' && !resendSuccess && (
                      <TouchableOpacity
                        onPress={handleResendConfirmation}
                        accessibilityRole="button"
                        style={styles.resendButton}
                      >
                        <Text style={styles.resendButtonText}>
                          {t('auth.errors.resendConfirmation')}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </Animated.View>
              )}
            </View>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('auth.login.orDivider')}</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Sign up link */}
            <View style={styles.signUpRow}>
              <Text style={styles.signUpText}>{t('auth.login.noAccount')}</Text>
              <TouchableOpacity
                onPress={() => router.push('/(auth)/signup')}
                accessibilityRole="link"
                accessibilityLabel="Sign up for a new account"
                accessibilityHint="Opens account creation screen"
                disabled={isLoading}
              >
                <Text style={styles.signUpLink}>{t('auth.login.signUpLink')}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
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
    paddingBottom:     spacing.lg,
  },

  // Logo
  logoContainer: {
    alignItems:  'center',
    marginTop:   64,
    marginBottom: spacing.xxl,
  },
  logoImage: {
    width:  180,
    height: 60,
  },


  // Form
  formContainer: {
    flex: 1,
  },
  heading: {
    ...textStyles.headingLg,
    color:        colors.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    ...textStyles.bodyMd,
    color:        colors.text.secondary,
    marginBottom: spacing.xl,
  },

  // Field
  fieldGroup: {
    marginBottom: spacing.formFieldGap,
  },
  fieldLabel: {
    ...components.input.label,
    marginBottom: 6,
  },
  passwordLabelRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   6,
  },

  // Input
  input: {
    height:       components.input.height,
    borderRadius: components.input.borderRadius,
    borderWidth:  1,
    borderColor:  components.input.resting.borderColor,
    backgroundColor: components.input.resting.backgroundColor,
    paddingHorizontal: components.input.paddingH,
    fontFamily:   components.input.fontFamily,
    fontSize:     components.input.fontSize,
    color:        components.input.resting.color,
  },
  inputWithRight: {
    flex:         1,
    borderRadius: 0, // overridden by wrapper
  },
  inputError: {
    backgroundColor: components.input.error.backgroundColor,
    borderColor:     components.input.error.borderColor,
  },
  inputWrapper: {
    flexDirection:  'row',
    alignItems:     'center',
    height:          components.input.height,
    borderRadius:    components.input.borderRadius,
    borderWidth:     1,
    borderColor:     components.input.resting.borderColor,
    backgroundColor: components.input.resting.backgroundColor,
    paddingLeft:     components.input.paddingH,
    paddingRight:    8,
    overflow:        'hidden',
  },
  eyeButton: {
    padding:    8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Forgot password
  forgotLink: {
    alignSelf:  'flex-end',
    marginTop:  10,
    paddingVertical: 8,
  },
  forgotLinkText: {
    ...textStyles.bodySm,
    color: colors.text.link,
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

  // Error toast
  errorToast: {
    flexDirection:    'row',
    alignItems:       'flex-start',
    marginTop:        spacing.md,
    padding:          12,
    borderRadius:     10,
    borderWidth:      1,
    borderColor:      colors.error.border,
    backgroundColor:  components.toast.error.backgroundColor,
  },
  errorIcon: {
    marginRight: 8,
    marginTop:   2,
  },
  errorTextContainer: {
    flex: 1,
  },
  errorToastText: {
    fontFamily: 'Inter_400Regular',
    fontSize:   13,
    lineHeight: 18,
    color:      components.toast.error.textColor,
  },
  resendButton: {
    marginTop: 6,
  },
  resendButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize:   13,
    color:      colors.brand.primary,
  },

  // Divider
  divider: {
    flexDirection:  'row',
    alignItems:     'center',
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex:            1,
    height:          1,
    backgroundColor: colors.border.default,
  },
  dividerText: {
    ...textStyles.bodySm,
    color:           colors.neutral[400],
    marginHorizontal: 12,
  },

  // Sign up
  signUpRow: {
    flexDirection:  'row',
    justifyContent: 'center',
    alignItems:     'center',
    gap:             4,
    marginBottom:   spacing.lg,
  },
  signUpText: {
    ...textStyles.bodySm,
    color: colors.text.secondary,
  },
  signUpLink: {
    ...textStyles.bodySm,
    fontFamily: 'Inter_600SemiBold',
    color:      colors.brand.primary,
  },
});

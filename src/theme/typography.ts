import { Platform } from 'react-native';

export const fontFamily = {
  regular:  Platform.select({ ios: 'Inter_400Regular', android: 'Inter_400Regular', default: 'Inter_400Regular' })!,
  medium:   Platform.select({ ios: 'Inter_500Medium',  android: 'Inter_500Medium',  default: 'Inter_500Medium' })!,
  semibold: Platform.select({ ios: 'Inter_600SemiBold', android: 'Inter_600SemiBold', default: 'Inter_600SemiBold' })!,
  bold:     Platform.select({ ios: 'Inter_700Bold',    android: 'Inter_700Bold',    default: 'Inter_700Bold' })!,
} as const;

// All sizes in sp (respects OS font scaling)
export const fontSize = {
  displayXl: 32, // balance hero number
  displayLg: 28, // screen title, dashboard heading
  displayMd: 24, // section totals, large card values
  headingLg: 20, // card titles, group headers
  headingMd: 17, // row titles, form labels
  bodyLg:    16, // primary body text, input text
  bodyMd:    15, // transaction descriptions, secondary body
  bodySm:    13, // metadata, captions, help text
  caption:   12, // timestamps, tags, badges
  label:     11, // tab bar labels, all-caps micro labels
} as const;

export const lineHeight = {
  displayXl: 38,
  displayLg: 34,
  displayMd: 30,
  headingLg: 26,
  headingMd: 22,
  bodyLg:    22,
  bodyMd:    20,
  bodySm:    18,
  caption:   16,
  label:     14,
} as const;

export const fontWeight = {
  light:    '300' as const,
  regular:  '400' as const,
  medium:   '500' as const,
  semibold: '600' as const,
  bold:     '700' as const,
} as const;

// Pre-composed text styles (use these in components)
export const textStyles = {
  displayXl: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.displayXl,
    lineHeight: lineHeight.displayXl,
    fontVariant: ['tabular-nums'] as const, // financial amounts
  },
  displayLg: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.displayLg,
    lineHeight: lineHeight.displayLg,
  },
  displayMd: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.displayMd,
    lineHeight: lineHeight.displayMd,
  },
  headingLg: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.headingLg,
    lineHeight: lineHeight.headingLg,
  },
  headingMd: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.headingMd,
    lineHeight: lineHeight.headingMd,
  },
  bodyLg: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyLg,
    lineHeight: lineHeight.bodyLg,
  },
  bodyMd: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyMd,
    lineHeight: lineHeight.bodyMd,
  },
  bodySm: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodySm,
    lineHeight: lineHeight.bodySm,
  },
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
  },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.label,
    lineHeight: lineHeight.label,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
  },
  // Financial amount styles (always tabular-nums)
  amountLg: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.displayLg,
    lineHeight: lineHeight.displayLg,
    fontVariant: ['tabular-nums'] as const,
  },
  amountMd: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.headingMd,
    lineHeight: lineHeight.headingMd,
    fontVariant: ['tabular-nums'] as const,
  },
  amountSm: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyMd,
    lineHeight: lineHeight.bodyMd,
    fontVariant: ['tabular-nums'] as const,
  },
} as const;

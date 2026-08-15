import React from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { ArrowDown } from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { enUS, es } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import type { TransferCandidate } from '../../api/transferCandidates';
import { formatCurrency } from '../../utils/format';
import { useTheme } from '../../theme/ThemeContext';
import { Springs } from '../../theme/animations';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { textStyles } from '../../theme/typography';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.35;
const VELOCITY_THRESHOLD = 800;
const TINT_TRAVEL = SCREEN_WIDTH * 0.15;
const EXIT_MS = 220;

export type CandidateDecision = 'link' | 'dismiss';

interface Props {
  candidate: TransferCandidate;
  onDecide: (decision: CandidateDecision) => void;
  /** Cards behind the top one render static and inert. */
  interactive?: boolean;
  stackIndex?: number;
}

export function TransferCandidateCard({
  candidate,
  onDecide,
  interactive = true,
  stackIndex = 0,
}: Props) {
  const { t, i18n } = useTranslation();
  const { theme, isDark } = useTheme();

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const dateLocale = i18n.language.startsWith('es') ? es : enUS;
  const formatDate = (iso: string) => format(parseISO(iso), 'd MMM yyyy', { locale: dateLocale });

  function commit(decision: CandidateDecision) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onDecide(decision);
  }

  // Swipe is an accelerator, never the only route — the two buttons below do exactly the
  // same thing and carry the accessibility labels.
  const pan = Gesture.Pan()
    .enabled(interactive)
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.2;
    })
    .onEnd((event) => {
      const passed =
        Math.abs(event.translationX) > SWIPE_THRESHOLD ||
        Math.abs(event.velocityX) > VELOCITY_THRESHOLD;

      if (!passed) {
        translateX.value = withSpring(0, Springs.modal);
        translateY.value = withSpring(0, Springs.modal);
        return;
      }

      const decision: CandidateDecision = event.translationX > 0 ? 'link' : 'dismiss';
      translateX.value = withTiming(
        Math.sign(event.translationX) * SCREEN_WIDTH * 1.4,
        { duration: EXIT_MS, easing: Easing.out(Easing.cubic) },
        (finished) => {
          if (finished) runOnJS(commit)(decision);
        },
      );
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${interpolate(translateX.value, [-SCREEN_WIDTH, 0, SCREEN_WIDTH], [-8, 0, 8])}deg` },
    ],
  }));

  const linkTint = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [TINT_TRAVEL, SWIPE_THRESHOLD], [0, 1], 'clamp'),
  }));

  const dismissTint = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, -TINT_TRAVEL], [1, 0], 'clamp'),
  }));

  const gapLabel =
    candidate.days_apart === 0
      ? t('transferCandidates.sameDay')
      : t('transferCandidates.daysApart', { count: candidate.days_apart });

  const gapTint = candidate.days_apart === 0
    ? { backgroundColor: isDark ? 'rgba(16,185,129,0.18)' : '#d1fae5', color: theme.positive }
    : { backgroundColor: isDark ? 'rgba(245,158,11,0.18)' : '#fef3c7', color: theme.warning };

  const accountLabel = `${candidate.outgoing.bank_account.name} → ${candidate.incoming.bank_account.name}`;

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[
          styles.card,
          { backgroundColor: theme.surface, borderColor: theme.border, top: stackIndex * 8 },
          cardStyle,
        ]}
        accessibilityLabel={t('transferCandidates.cardLabel', {
          amount: formatCurrency(candidate.amount, i18n.language),
          accounts: accountLabel,
          gap: gapLabel,
        })}
      >
        <Animated.View
          pointerEvents="none"
          style={[styles.tint, { backgroundColor: theme.positive }, linkTint]}
        />
        <Animated.View
          pointerEvents="none"
          style={[styles.tint, { backgroundColor: theme.negative }, dismissTint]}
        />

        <Text style={[text.amount, { color: theme.textPrimary }]}>
          {formatCurrency(candidate.amount, i18n.language)}
        </Text>
        <View style={[styles.gapPill, { backgroundColor: gapTint.backgroundColor }]}>
          <Text style={[text.gapText, { color: gapTint.color }]}>{gapLabel}</Text>
        </View>

        <Side
          label={t('transferCandidates.from')}
          accountName={candidate.outgoing.bank_account.name}
          date={formatDate(candidate.outgoing.date)}
          description={candidate.outgoing.description}
        />

        <ArrowDown size={20} color={theme.primary} style={styles.arrow} />

        <Side
          label={t('transferCandidates.to')}
          accountName={candidate.incoming.bank_account.name}
          date={formatDate(candidate.incoming.date)}
          description={candidate.incoming.description}
        />

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.dismissButton, { borderColor: theme.border }]}
            onPress={() => commit('dismiss')}
            accessibilityRole="button"
            accessibilityLabel={t('transferCandidates.dismissLabel', { accounts: accountLabel })}
          >
            <Text style={[text.buttonText, { color: theme.textSecondary }]}>
              {t('transferCandidates.dismiss')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.primary }]}
            onPress={() => commit('link')}
            accessibilityRole="button"
            accessibilityLabel={t('transferCandidates.linkLabel', { accounts: accountLabel })}
          >
            <Text style={[text.buttonText, text.linkButtonText]}>
              {t('transferCandidates.link')}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

function Side({
  label,
  accountName,
  date,
  description,
}: {
  label: string;
  accountName: string;
  date: string;
  description: string;
}) {
  const { theme } = useTheme();

  return (
    <View style={styles.side}>
      <Text style={[text.sideLabel, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[text.account, { color: theme.textPrimary }]}>{accountName}</Text>
      <Text style={[text.meta, { color: theme.textSecondary }]}>{date}</Text>
      <Text style={[text.meta, { color: theme.textSecondary }]} numberOfLines={2} ellipsizeMode="tail">
        {description}
      </Text>
    </View>
  );
}

// View and text styles are deliberately in separate StyleSheets. Mixing them widens every
// value to `ViewStyle | TextStyle | ImageStyle`, and Reanimated's Animated.View rejects
// that union — which is why `styles` here holds only what a View consumes.
const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
  },
  gapPill: {
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginTop: spacing.xs,
  },
  side: {
    marginTop: spacing.md,
  },
  arrow: {
    alignSelf: 'center',
    marginTop: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  button: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissButton: {
    borderWidth: 1,
  },
});

const text = StyleSheet.create({
  amount: {
    ...textStyles.amountMd,
    // Restated as a mutable array. textStyles.amountMd declares it `as const`, and a
    // readonly tuple is not assignable to TextStyle's FontVariant[], which widens the
    // whole StyleSheet to ViewStyle | TextStyle | ImageStyle. Every other amount in the
    // app sets fontVariant inline for the same reason (AmountDisplay, BalanceCard).
    fontVariant: ['tabular-nums' as const],
  },
  gapText: {
    ...textStyles.caption,
  },
  sideLabel: {
    ...textStyles.label,
    letterSpacing: 0.6,
  },
  account: {
    ...textStyles.bodyMd,
    fontWeight: '600',
    marginTop: 2,
  },
  meta: {
    ...textStyles.bodySm,
  },
  buttonText: {
    ...textStyles.bodyMd,
    fontWeight: '600',
  },
  linkButtonText: {
    color: '#ffffff',
  },
});

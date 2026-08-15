import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
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
import { shadows } from '../../theme/shadows';
import { textStyles } from '../../theme/typography';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;
const VELOCITY_THRESHOLD = 700;
const STAMP_TRAVEL = SCREEN_WIDTH * 0.12;
const EXIT_MS = 220;

export type CandidateDecision = 'link' | 'dismiss';

interface Props {
  candidate: TransferCandidate;
  onDecide: (decision: CandidateDecision) => void;
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
  const formatDate = (iso: string) => format(parseISO(iso), "d 'de' MMMM", { locale: dateLocale });

  function commit(decision: CandidateDecision) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onDecide(decision);
  }

  const pan = Gesture.Pan()
    .enabled(interactive)
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.15;
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
        Math.sign(event.translationX) * SCREEN_WIDTH * 1.5,
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
      { rotate: `${interpolate(translateX.value, [-SCREEN_WIDTH, 0, SCREEN_WIDTH], [-10, 0, 10])}deg` },
    ],
  }));

  // The stamps are the whole reason a swipe feels decisive rather than accidental: the
  // verdict appears while the finger is still down, so a wrong direction is obvious
  // before release. Borrowed straight from the LIKE/NOPE convention.
  const linkStamp = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [STAMP_TRAVEL, SWIPE_THRESHOLD], [0, 1], 'clamp'),
  }));

  const dismissStamp = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, -STAMP_TRAVEL], [1, 0], 'clamp'),
  }));

  const gapLabel =
    candidate.days_apart === 0
      ? t('transferCandidates.sameDay')
      : t('transferCandidates.daysApart', { count: candidate.days_apart });

  const gapTint = candidate.days_apart === 0
    ? { bg: isDark ? 'rgba(16,185,129,0.18)' : '#d1fae5', fg: theme.positive }
    : { bg: isDark ? 'rgba(245,158,11,0.18)' : '#fef3c7', fg: theme.warning };

  const accountLabel = `${candidate.outgoing.bank_account.name} → ${candidate.incoming.bank_account.name}`;
  const behind = stackIndex > 0;

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        pointerEvents={behind ? 'none' : 'auto'}
        style={[
          styles.card,
          { backgroundColor: theme.surface, borderColor: theme.border },
          // The top card sits in normal flow so it gives the deck its height; the one
          // behind is absolute and nudged down, which is what makes this read as a stack.
          behind && styles.behindCard,
          // translateY has to out-run the shrink or the card behind never shows: scaling
          // about the centre already lifts its bottom edge by half the height lost.
          behind && { transform: [{ scale: 1 - stackIndex * 0.05 }, { translateY: stackIndex * 34 }] },
          !behind && cardStyle,
        ]}
        accessibilityLabel={t('transferCandidates.cardLabel', {
          amount: formatCurrency(candidate.amount, i18n.language),
          accounts: accountLabel,
          gap: gapLabel,
        })}
      >
        <Animated.View style={[styles.stamp, styles.stampLeft, { borderColor: theme.positive }, linkStamp]}>
          <Text style={[text.stampText, { color: theme.positive }]}>
            {t('transferCandidates.stampLink')}
          </Text>
        </Animated.View>
        <Animated.View style={[styles.stamp, styles.stampRight, { borderColor: theme.negative }, dismissStamp]}>
          <Text style={[text.stampText, { color: theme.negative }]}>
            {t('transferCandidates.stampDismiss')}
          </Text>
        </Animated.View>

        <View style={[styles.gapPill, { backgroundColor: gapTint.bg }]}>
          <Text style={[text.gapText, { color: gapTint.fg }]}>{gapLabel}</Text>
        </View>

        <Text style={[text.amount, { color: theme.textPrimary }]}>
          {formatCurrency(candidate.amount, i18n.language)}
        </Text>

        <Side
          label={t('transferCandidates.from')}
          accent={theme.negative}
          accountName={candidate.outgoing.bank_account.name}
          date={formatDate(candidate.outgoing.date)}
          description={candidate.outgoing.description}
        />

        <View style={styles.arrowRow}>
          <View style={[styles.arrowCircle, { backgroundColor: theme.surfaceElevated }]}>
            <ArrowDown size={16} color={theme.textSecondary} />
          </View>
        </View>

        <Side
          label={t('transferCandidates.to')}
          accent={theme.positive}
          accountName={candidate.incoming.bank_account.name}
          date={formatDate(candidate.incoming.date)}
          description={candidate.incoming.description}
        />
      </Animated.View>
    </GestureDetector>
  );
}

function Side({
  label,
  accent,
  accountName,
  date,
  description,
}: {
  label: string;
  accent: string;
  accountName: string;
  date: string;
  description: string;
}) {
  const { theme } = useTheme();

  return (
    <View style={[styles.side, { backgroundColor: theme.surfaceElevated, borderLeftColor: accent }]}>
      <Text style={[text.sideLabel, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[text.account, { color: theme.textPrimary }]} numberOfLines={1}>
        {accountName}
      </Text>
      <Text style={[text.date, { color: theme.textSecondary }]}>{date}</Text>
      <Text style={[text.description, { color: theme.textSecondary }]} numberOfLines={2} ellipsizeMode="tail">
        {description}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Kept deliberately compact. Descriptions run long (bank statements are verbose), and a
  // card taller than the centred content area overflows it in both directions — which put
  // the card over the screen header.
  card: {
    borderRadius: radius.xxl,
    borderWidth: 1,
    padding: spacing.md,
    ...shadows.lg,
  },
  behindCard: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    // No negative zIndex: the deck renders back-to-front, so this card is painted first
    // and sits underneath naturally. A zIndex of -1 dropped it out of view on iOS.
    opacity: 0.55,
  },
  stamp: {
    position: 'absolute',
    top: spacing.lg,
    zIndex: 2,
    borderWidth: 3,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  stampLeft: {
    left: spacing.lg,
    transform: [{ rotate: '-14deg' }],
  },
  stampRight: {
    right: spacing.lg,
    transform: [{ rotate: '14deg' }],
  },
  gapPill: {
    alignSelf: 'center',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  side: {
    borderRadius: radius.lg,
    borderLeftWidth: 3,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  arrowRow: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  arrowCircle: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const text = StyleSheet.create({
  stampText: {
    ...textStyles.label,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 1.5,
  },
  gapText: {
    ...textStyles.caption,
    fontWeight: '600',
  },
  amount: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    fontVariant: ['tabular-nums' as const],
  },
  sideLabel: {
    ...textStyles.label,
    letterSpacing: 0.8,
  },
  account: {
    ...textStyles.bodyMd,
    fontWeight: '600',
    marginTop: 2,
  },
  date: {
    ...textStyles.bodySm,
  },
  description: {
    ...textStyles.caption,
    marginTop: 2,
  },
});

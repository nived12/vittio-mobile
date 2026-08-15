import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { Check, CheckCircle2, ChevronLeft, RotateCcw, X } from 'lucide-react-native';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { SkeletonBox } from '../../../src/components/ui/SkeletonLoader';
import {
  TransferCandidateCard,
  type CandidateDecision,
} from '../../../src/components/ui/TransferCandidateCard';
import {
  useResolveTransferCandidates,
  useTransferCandidates,
} from '../../../src/hooks/useTransferCandidates';
import { useUIStore } from '../../../src/stores/uiStore';
import { useTheme } from '../../../src/theme/ThemeContext';
import { spacing } from '../../../src/theme/spacing';
import { radius } from '../../../src/theme/radius';
import { shadows } from '../../../src/theme/shadows';
import { textStyles } from '../../../src/theme/typography';

interface Decision {
  candidateId: number;
  decision: CandidateDecision;
}

export default function TransferCandidatesScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const showToast = useUIStore((s) => s.showToast);

  const { data: candidates, isLoading, isError, refetch } = useTransferCandidates();
  const resolve = useResolveTransferCandidates();

  // Decisions live here and nowhere else until the user saves. A dismissed pair is
  // rejected permanently — the reconciler never re-offers one — so a mis-swipe must not
  // be a write. Leaving the screen discards them and changes nothing, which is the safe
  // direction to fail in.
  const [decisions, setDecisions] = useState<Decision[]>([]);

  const remaining = useMemo(() => {
    const decided = new Set(decisions.map((d) => d.candidateId));
    return (candidates ?? []).filter((c) => !decided.has(c.id));
  }, [candidates, decisions]);

  const linkedIds = decisions.filter((d) => d.decision === 'link').map((d) => d.candidateId);
  const dismissedIds = decisions.filter((d) => d.decision === 'dismiss').map((d) => d.candidateId);
  const total = candidates?.length ?? 0;
  const topCandidate = remaining[0];

  function decide(candidateId: number, decision: CandidateDecision) {
    setDecisions((prev) => [...prev, { candidateId, decision }]);
  }

  // Submitted once, when the deck runs out. Until then every decision is undoable and
  // nothing has been written — which matters because dismissing is permanent and the
  // reconciler never re-offers a rejected pair. The ref guards against a second fire from
  // a re-render while the request is in flight.
  const submitted = useRef(false);

  useEffect(() => {
    if (submitted.current) return;
    if (decisions.length === 0 || remaining.length > 0) return;

    submitted.current = true;
    resolve.mutate(
      { accepted_ids: linkedIds, rejected_ids: dismissedIds },
      {
        onSuccess: (result) => {
          showToast(t('transferCandidates.saved', { count: result.linked_count }), 'success');
          router.back();
        },
        onError: () => {
          // Let them try again: the decisions are still in state, so the deck is not lost.
          submitted.current = false;
          showToast(t('transferCandidates.saveFailed'), 'error');
        },
      },
    );
  }, [decisions.length, remaining.length, linkedIds, dismissedIds, resolve, showToast, t]);

  function body() {
    if (isLoading) {
      return <SkeletonBox width="100%" height={420} borderRadius={radius.xxl} />;
    }

    if (isError) {
      return (
        <EmptyState
          icon="AlertCircle"
          title={t('transferCandidates.error.title')}
          subtitle={t('transferCandidates.error.subtitle')}
          ctaLabel={t('common.retry')}
          onCta={() => refetch()}
        />
      );
    }

    if (total === 0) {
      return (
        <EmptyState
          icon="ArrowLeftRight"
          title={t('transferCandidates.empty.title')}
          subtitle={t('transferCandidates.empty.subtitle')}
        />
      );
    }

    if (remaining.length === 0) {
      return (
        <View style={[styles.summary, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <CheckCircle2 size={36} color={theme.positive} />
          <Text style={[styles.summaryText, { color: theme.textPrimary }]}>
            {t('transferCandidates.summary', {
              linked: linkedIds.length,
              dismissed: dismissedIds.length,
            })}
          </Text>
          <Text style={[styles.summaryHint, { color: theme.textSecondary }]}>
            {t('transferCandidates.summaryHint')}
          </Text>
        </View>
      );
    }

    // Back-to-front: the card behind is drawn first and absolutely positioned, the top
    // card last and in normal flow so it gives the deck its height.
    return (
      <View style={styles.deck}>
        {remaining
          .slice(0, 2)
          .reverse()
          .map((candidate, index, arr) => (
            <TransferCandidateCard
              key={candidate.id}
              candidate={candidate}
              interactive={index === arr.length - 1 && !resolve.isPending}
              stackIndex={arr.length - 1 - index}
              onDecide={(decision) => decide(candidate.id, decision)}
            />
          ))}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: theme.background },
      ]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <ChevronLeft size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.textPrimary }]} accessibilityRole="header">
          {t('transferCandidates.title')}
        </Text>
        {total > 0 && (
          <Text style={[styles.progress, { color: theme.textSecondary }]}>
            {t('transferCandidates.progress', {
              current: Math.min(decisions.length + 1, total),
              total,
            })}
          </Text>
        )}
      </View>

      <View style={styles.content}>{body()}</View>

      {topCandidate && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.circleButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => decide(topCandidate.id, 'dismiss')}
            disabled={resolve.isPending}
            accessibilityRole="button"
            accessibilityLabel={t('transferCandidates.dismissLabel', {
              accounts: `${topCandidate.outgoing.bank_account.name} → ${topCandidate.incoming.bank_account.name}`,
            })}
          >
            <X size={28} color={theme.negative} strokeWidth={2.5} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.circleButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => decide(topCandidate.id, 'link')}
            disabled={resolve.isPending}
            accessibilityRole="button"
            accessibilityLabel={t('transferCandidates.linkLabel', {
              accounts: `${topCandidate.outgoing.bank_account.name} → ${topCandidate.incoming.bank_account.name}`,
            })}
          >
            <Check size={28} color={theme.positive} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      )}

      {/* Fixed height so the deck above never shifts as this slot changes. Nothing is
          written until the deck runs out, so the only caution worth showing is on the last
          card, where the next swipe is the one that commits. */}
      <View style={styles.footer}>
        {resolve.isPending ? (
          <ActivityIndicator color={theme.primary} />
        ) : (
          <>
            {remaining.length === 1 && (
              <Text style={[styles.hint, { color: theme.textSecondary }]}>
                {t('transferCandidates.lastCardHint')}
              </Text>
            )}
            {decisions.length > 0 && remaining.length > 0 && (
              <TouchableOpacity
                onPress={() => setDecisions((prev) => prev.slice(0, -1))}
                style={[styles.undoPill, { backgroundColor: theme.surface, borderColor: theme.border }]}
                accessibilityRole="button"
                accessibilityLabel={t('transferCandidates.undo')}
              >
                <RotateCcw size={16} color={theme.textPrimary} />
                <Text style={[styles.undoText, { color: theme.textPrimary }]}>
                  {t('transferCandidates.undo')}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...textStyles.headingMd,
    flex: 1,
  },
  progress: {
    ...textStyles.bodySm,
    fontVariant: ['tabular-nums' as const],
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    // Deliberately not `overflow: hidden` — that would clip the card mid-swipe as it
    // flies off screen. Card height is bounded instead: descriptions cap at two lines.
  },
  deck: {
    justifyContent: 'center',
  },
  summary: {
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.xxl,
    borderWidth: 1,
    padding: spacing.xl,
  },
  summaryText: {
    ...textStyles.bodyMd,
    fontWeight: '600',
    textAlign: 'center',
  },
  summaryHint: {
    ...textStyles.bodySm,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
    paddingTop: spacing.lg,
  },
  circleButton: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  // Fixed height reserved whether or not it has content, so the deck never jumps when the
  // hint or the undo pill appears. Kept tight: this space is subtracted from the centred
  // area above, and an over-generous footer pushes the card off centre.
  footer: {
    // Sized for its fullest state — the last card shows the hint *and* the undo pill, and
    // at 72 with an 8pt gap those two sat on top of each other and of the buttons above.
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    // Clears the tab bar and its floating action button, which sit above this screen.
    marginBottom: 40,
  },
  hint: {
    ...textStyles.caption,
    textAlign: 'center',
  },
  undoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    borderWidth: 1,
    ...shadows.sm,
  },
  undoText: {
    ...textStyles.bodyMd,
    fontWeight: '600',
  },
});

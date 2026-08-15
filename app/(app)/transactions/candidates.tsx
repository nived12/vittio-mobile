import React, { useMemo, useState } from 'react';
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
import { ChevronLeft, RotateCcw } from 'lucide-react-native';
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
  // be a write. Leaving the screen discards the decisions and changes nothing, which is
  // the safe direction to fail in.
  const [decisions, setDecisions] = useState<Decision[]>([]);

  const remaining = useMemo(() => {
    const decided = new Set(decisions.map((d) => d.candidateId));
    return (candidates ?? []).filter((c) => !decided.has(c.id));
  }, [candidates, decisions]);

  const linkedIds = decisions.filter((d) => d.decision === 'link').map((d) => d.candidateId);
  const dismissedIds = decisions.filter((d) => d.decision === 'dismiss').map((d) => d.candidateId);

  function decide(candidateId: number, decision: CandidateDecision) {
    setDecisions((prev) => [...prev, { candidateId, decision }]);
  }

  function undo() {
    setDecisions((prev) => prev.slice(0, -1));
  }

  function save() {
    resolve.mutate(
      { accepted_ids: linkedIds, rejected_ids: dismissedIds },
      {
        onSuccess: (result) => {
          showToast(t('transferCandidates.saved', { count: result.linked_count }), 'success');
          router.back();
        },
        // Decisions are deliberately left in state on failure so a retry does not mean
        // deciding all over again.
        onError: () => showToast(t('transferCandidates.saveFailed'), 'error'),
      },
    );
  }

  const header = (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.backButton}
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
      >
        <ChevronLeft size={24} color={theme.textPrimary} />
      </TouchableOpacity>
      <View style={styles.headerText}>
        <Text style={[styles.title, { color: theme.textPrimary }]} accessibilityRole="header">
          {t('transferCandidates.title')}
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {t('transferCandidates.subtitle')}
        </Text>
        <Text style={[styles.warning, { color: theme.warning }]}>
          {t('transferCandidates.dismissWarning')}
        </Text>
      </View>
    </View>
  );

  function body() {
    if (isLoading) {
      return (
        <View style={styles.stack}>
          <SkeletonBox width="100%" height={280} borderRadius={radius.xl} />
        </View>
      );
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

    if ((candidates ?? []).length === 0) {
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
        <View style={styles.summary}>
          <Text style={[styles.summaryText, { color: theme.textPrimary }]}>
            {t('transferCandidates.summary', {
              linked: linkedIds.length,
              dismissed: dismissedIds.length,
            })}
          </Text>
        </View>
      );
    }

    // Only the top card is interactive; the one behind it is a depth cue.
    return (
      <View style={styles.stack}>
        {remaining
          .slice(0, 2)
          .reverse()
          .map((candidate, index, arr) => {
            const isTop = index === arr.length - 1;
            return (
              <TransferCandidateCard
                key={candidate.id}
                candidate={candidate}
                interactive={isTop && !resolve.isPending}
                stackIndex={arr.length - 1 - index}
                onDecide={(decision) => decide(candidate.id, decision)}
              />
            );
          })}
      </View>
    );
  }

  const hasDecisions = decisions.length > 0;

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: theme.background },
      ]}
    >
      {header}
      <View style={styles.content}>{body()}</View>

      {hasDecisions && (
        <View style={[styles.footer, { borderTopColor: theme.border, backgroundColor: theme.surface }]}>
          <TouchableOpacity
            onPress={undo}
            disabled={resolve.isPending}
            style={styles.undoButton}
            accessibilityRole="button"
            accessibilityLabel={t('transferCandidates.undo')}
          >
            <RotateCcw size={16} color={theme.textSecondary} />
            <Text style={[styles.undoText, { color: theme.textSecondary }]}>
              {t('transferCandidates.undo')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={save}
            disabled={resolve.isPending}
            style={[styles.saveButton, { backgroundColor: theme.primary }]}
            accessibilityRole="button"
            accessibilityLabel={t('transferCandidates.save', { count: decisions.length })}
          >
            {resolve.isPending ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.saveText}>
                {t('transferCandidates.save', { count: decisions.length })}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    paddingHorizontal: spacing.screenPaddingH,
    paddingTop: spacing.screenPaddingTop,
  },
  backButton: {
    width: 44,
    height: 44,
    marginLeft: -spacing.sm,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...textStyles.headingMd,
  },
  subtitle: {
    ...textStyles.bodySm,
    marginTop: 2,
  },
  warning: {
    ...textStyles.caption,
    marginTop: spacing.xs,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.screenPaddingH,
  },
  stack: {
    minHeight: 320,
    justifyContent: 'center',
  },
  summary: {
    alignItems: 'center',
  },
  summaryText: {
    ...textStyles.bodyMd,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.screenPaddingH,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 44,
    paddingRight: spacing.sm,
  },
  undoText: {
    ...textStyles.bodyMd,
  },
  saveButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    ...textStyles.bodyMd,
    fontWeight: '600',
    color: '#ffffff',
  },
});

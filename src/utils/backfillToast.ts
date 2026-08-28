import i18n from '../i18n';
import { useUIStore } from '../stores/uiStore';

export interface BackfillSummary {
  linked: number;
  unlinked: number;
  skipped: boolean;
}

/**
 * Saving/debt writes can link or unlink transactions on their own — widening the
 * criteria claims past matches, moving the balance date forward releases the ones
 * the retyped figure now covers. Either way the balance moves for a reason the user
 * did not directly ask for, so say what happened. Mirrors backfill_notice in the
 * Rails controllers; the API sends the summary only on the write that caused it.
 */
export function showBackfillToast(ns: 'savings' | 'debts', summary?: BackfillSummary | null): void {
  if (!summary) return;

  const parts: string[] = [];
  if (summary.skipped) parts.push(i18n.t(`${ns}.backfillSkippedToast`));
  if (summary.linked > 0) parts.push(i18n.t(`${ns}.backfilledToast`, { count: summary.linked }));
  if (summary.unlinked > 0) parts.push(i18n.t(`${ns}.unlinkedToast`, { count: summary.unlinked }));
  if (parts.length === 0) return;

  useUIStore.getState().showToast(parts.join(' '), summary.skipped ? 'warning' : 'info');
}

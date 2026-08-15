import { apiClient } from './client';
import type { Transaction } from './transactions';

// ── Types ──────────────────────────────────────────────────────────────────

export interface TransferCandidate {
  id: number;
  similarity_score: number | null;
  /** Absolute amount of the movement — identical on both sides by construction. */
  amount: number;
  /**
   * Gap between the two statement dates, 0-3. Computed by the API on purpose: the web
   * UI derived it in JavaScript and shipped a hardcoded "1 day apart", which read as a
   * bug once the match window widened from ±1 to ±3 days. Feed it to i18next as a
   * count — never format the unit by hand.
   */
  days_apart: number;
  outgoing: Transaction;
  incoming: Transaction;
}

export interface TransferCandidateListResponse {
  data: { candidates: TransferCandidate[] };
  meta: { pagination: { total_items: number } };
}

export interface TransferCandidatePage {
  candidates: TransferCandidate[];
  /** Across all pages — the header chip counts everything waiting, not just this page. */
  total: number;
}

export interface ResolveTransferCandidatesBody {
  accepted_ids?: number[];
  rejected_ids?: number[];
}

export interface ResolveTransferCandidatesResponse {
  data: { linked_count: number; rejected_count: number };
}

// ── Requests ───────────────────────────────────────────────────────────────

export async function fetchTransferCandidates(): Promise<TransferCandidatePage> {
  const { data } = await apiClient.get<TransferCandidateListResponse>('/transfer_candidates');
  return {
    candidates: data.data.candidates,
    total: data.meta?.pagination?.total_items ?? data.data.candidates.length,
  };
}

/**
 * Accepts and dismisses in one call, so a whole review pass is a single write.
 *
 * Dismissing is permanent — the reconciler never re-offers a rejected pair, including
 * when a later backfill gives both sides the same tracking key. Only call this once the
 * user has explicitly saved.
 */
export async function resolveTransferCandidates(
  body: ResolveTransferCandidatesBody,
): Promise<ResolveTransferCandidatesResponse['data']> {
  const { data } = await apiClient.post<ResolveTransferCandidatesResponse>(
    '/transfer_candidates/resolve',
    body,
  );
  return data.data;
}

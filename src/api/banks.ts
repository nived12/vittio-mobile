import { apiClient } from './client';

// ── Types ──────────────────────────────────────────────────────────────────

export interface Bank {
  id: number;
  code: string;
  name: string;
  logo_url: string | null;
  supported_type: 'debit' | 'credit' | 'both' | null;
}

// ── API calls ─────────────────────────────────────────────────────────────

/** GET /api/v1/banks — public, no auth required */
export async function getBanks(account_type?: 'debit' | 'credit'): Promise<Bank[]> {
  const response = await apiClient.get<{ data: { banks: Bank[] } }>('/banks', {
    params: account_type ? { account_type } : undefined,
  });
  return response.data.data.banks;
}

import { apiClient } from './client';

// ── Types ──────────────────────────────────────────────────────────────────

export interface BankAccount {
  id: number;
  name: string;
  custom_name: string | null;
  bank_name: string | null;
  bank_id: number | null;
  bank_logo_url: string | null;
  account_type: 'debit' | 'credit' | 'cash';
  currency: string;
  opening_balance: string;
  balance: number;
  transactions_count: number;
  archived: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export type CreateBankAccountBody = {
  bank_id?: number;
  account_number?: string;
  account_type: 'debit' | 'credit' | 'cash';
  custom_name?: string;
  currency?: string;
  opening_balance?: number;
  opening_balance_date?: string; // ISO date string: 'YYYY-MM-DD'
};

export type UpdateBankAccountBody = {
  custom_name?: string;
  opening_balance?: number;
};

// ── API calls ─────────────────────────────────────────────────────────────

/** GET /api/v1/bank_accounts — kept by default, or archived ones with { archived: true } */
export async function getBankAccounts(opts?: { archived?: boolean }): Promise<BankAccount[]> {
  const response = await apiClient.get<{ data: { bank_accounts: BankAccount[] } }>(
    '/bank_accounts',
    opts?.archived ? { params: { archived: true } } : undefined,
  );
  return response.data.data.bank_accounts;
}

/** GET /api/v1/bank_accounts/:id */
export async function getBankAccount(id: number): Promise<BankAccount> {
  const response = await apiClient.get<{ data: BankAccount }>(`/bank_accounts/${id}`);
  return response.data.data;
}

/** POST /api/v1/bank_accounts */
export async function createBankAccount(body: CreateBankAccountBody): Promise<BankAccount> {
  const response = await apiClient.post<{ data: BankAccount }>('/bank_accounts', {
    bank_account: body,
  });
  return response.data.data;
}

/** PATCH /api/v1/bank_accounts/:id */
export async function updateBankAccount(
  id: number,
  body: UpdateBankAccountBody,
): Promise<BankAccount> {
  const response = await apiClient.patch<{ data: BankAccount }>(`/bank_accounts/${id}`, {
    bank_account: body,
  });
  return response.data.data;
}

/** PATCH /api/v1/bank_accounts/:id/archive */
export async function archiveBankAccount(id: number): Promise<BankAccount> {
  const response = await apiClient.patch<{ data: BankAccount }>(
    `/bank_accounts/${id}/archive`,
  );
  return response.data.data;
}

/** PATCH /api/v1/bank_accounts/:id/unarchive */
export async function unarchiveBankAccount(id: number): Promise<BankAccount> {
  const response = await apiClient.patch<{ data: BankAccount }>(
    `/bank_accounts/${id}/unarchive`,
  );
  return response.data.data;
}

/** DELETE /api/v1/bank_accounts/:id */
export async function deleteBankAccount(id: number): Promise<void> {
  await apiClient.delete(`/bank_accounts/${id}`);
}

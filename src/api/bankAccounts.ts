import { apiClient } from './client';

// ── Types ──────────────────────────────────────────────────────────────────

export interface BankAccount {
  id: number;
  name: string;
  custom_name: string | null;
  bank_name: string;
  bank_id: number;
  account_type: 'debit' | 'credit' | 'cash';
  currency: string;
  opening_balance: string;
  balance: number;
  transactions_count: number;
  created_at: string;
  updated_at: string;
}

export type CreateBankAccountBody = {
  bank_id?: number;
  institution_name?: string;
  name?: string;
  account_type: 'debit' | 'credit' | 'cash';
  custom_name?: string;
  currency?: string;
  opening_balance?: number;
  balance?: number;
};

export type UpdateBankAccountBody = {
  custom_name?: string;
  opening_balance?: number;
};

// ── API calls ─────────────────────────────────────────────────────────────

/** GET /api/v1/bank_accounts */
export async function getBankAccounts(): Promise<BankAccount[]> {
  const response = await apiClient.get<{ data: { bank_accounts: BankAccount[] } }>(
    '/bank_accounts',
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

/** DELETE /api/v1/bank_accounts/:id */
export async function deleteBankAccount(id: number): Promise<void> {
  await apiClient.delete(`/bank_accounts/${id}`);
}

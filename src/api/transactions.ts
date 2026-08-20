import { apiClient } from './client';
import type { AccountType } from './bankAccounts';

// ── Types ──────────────────────────────────────────────────────────────────

export type TransactionType =
  | 'income'
  | 'fixed_expense'
  | 'variable_expense'
  | 'transfer_in'
  | 'transfer_out'
  // A charge and the credit that cancels it — an installment reversal, a refund, a points
  // redemption. Both halves keep their natural signs but sit outside income and expense
  // totals, so a cancelled purchase inflates neither.
  | 'excluded'
  // Value moving between a brokerage's own cash and its own assets — a repo rolling over,
  // shares bought. Outside income and spending, but still part of the account's worth.
  | 'investment';

export interface TransactionItem {
  id: number;
  name: string;
  amount: number;
  position: number;
}

export interface Transaction {
  id: number;
  date: string;
  description: string;
  concept: string | null;
  amount: number;
  transaction_type: TransactionType;
  source: 'manual' | 'statement_file';
  merchant: string | null;
  reference: string | null;
  statement_file_id: number | null;
  tax_amount: number | null;
  tip_amount: number | null;
  items: TransactionItem[];
  bank_account: { id: number; name: string; account_type: AccountType };
  category: { id: number; name: string; icon: string } | null;
  is_transfer: boolean;
  transfer_account: { id: number; name: string } | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionFilters {
  bank_account_id?: number;
  statement_file_id?: number;
  category_id?: number;
  transaction_type?: TransactionType | 'transfer';
  from_date?: string;
  to_date?: string;
  search?: string;
  sort?: 'date' | 'amount' | 'description';
  direction?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}

export interface TransactionListResponse {
  data: { transactions: Transaction[] };
  meta: {
    pagination: {
      current_page: number;
      total_pages: number;
      total_items: number;
      page_size: number;
      next_page: number | null;
      prev_page: number | null;
    };
  };
}

export interface TransactionSummary {
  total_income: number;
  total_expenses: number;
  net: number;
  transaction_count: number;
  income_count: number;
  expense_count: number;
}

export type TransactionItemAttribute = {
  id?: number;
  name: string;
  amount: number;
  position: number;
  _destroy?: boolean;
};

export type CreateTransactionBody = {
  bank_account_id: number;
  date: string;
  description: string;
  concept?: string;
  amount: number;
  transaction_type: TransactionType;
  merchant?: string;
  reference?: string;
  category_id?: number;
  transfer_account_id?: number;
  tax_amount?: number | null;
  tip_amount?: number | null;
  transaction_items_attributes?: TransactionItemAttribute[];
};

// category_id is intersected out and re-declared: clearing a category sends
// null, which `Partial<CreateTransactionBody> & { … }` would narrow away.
export type UpdateTransactionBody = Omit<Partial<CreateTransactionBody>, 'category_id'> & {
  category_id?: number | null;
};

export interface AiParseResult {
  amount: number;
  description: string;
  transaction_type: string;
  date?: string | null;
  category_suggestion: { id: number; name: string } | null;
  confidence: number;
  merchant?: string | null;
  bank_account_id?: number | null;
  concept?: string | null;
  transcript?: string | null;
  items?: { name: string; amount: number }[];
  tax_amount?: number | null;
  tip_amount?: number | null;
}

// ── API calls ─────────────────────────────────────────────────────────────

/** GET /api/v1/transactions */
export async function getTransactions(
  params: TransactionFilters = {},
): Promise<TransactionListResponse> {
  const response = await apiClient.get<TransactionListResponse>('/transactions', { params });
  return response.data;
}

/** GET /api/v1/transactions/summary */
export async function getTransactionsSummary(
  params: Omit<TransactionFilters, 'page' | 'page_size' | 'sort' | 'direction'> = {},
): Promise<TransactionSummary> {
  const response = await apiClient.get<{ data: { stats: Record<string, number> } }>(
    '/transactions/summary',
    { params },
  );
  const s = response.data.data.stats ?? {};
  return {
    total_income: s.income_total ?? 0,
    total_expenses: s.expenses_total ?? 0,
    net: (s.income_total ?? 0) - (s.expenses_total ?? 0),
    transaction_count: s.total_transactions ?? 0,
    income_count: s.income_count ?? 0,
    expense_count: (s.fixed_expense_count ?? 0) + (s.variable_expense_count ?? 0),
  };
}

/** GET /api/v1/transactions/:id */
export async function getTransaction(id: number): Promise<Transaction> {
  const response = await apiClient.get<{ data: Transaction }>(`/transactions/${id}`);
  return response.data.data;
}

/** POST /api/v1/transactions */
export async function createTransaction(
  body: CreateTransactionBody,
): Promise<Transaction> {
  const response = await apiClient.post<{ data: Transaction }>('/transactions', {
    transaction: body,
  });
  return response.data.data;
}

/** PATCH /api/v1/transactions/:id */
export async function updateTransaction(
  id: number,
  body: UpdateTransactionBody,
): Promise<Transaction> {
  const response = await apiClient.patch<{ data: Transaction }>(`/transactions/${id}`, {
    transaction: body,
  });
  return response.data.data;
}

/** DELETE /api/v1/transactions/:id */
export async function deleteTransaction(id: number): Promise<void> {
  await apiClient.delete(`/transactions/${id}`);
}

/** POST /api/v1/transactions/parse_voice */
export async function parseVoice(text: string): Promise<AiParseResult> {
  const response = await apiClient.post<{ data: AiParseResult }>('/transactions/parse_voice', { text });
  return response.data.data;
}

/** POST /api/v1/transactions/parse_image */
export async function parseImage(imageBase64: string, mimeType: string): Promise<AiParseResult> {
  const response = await apiClient.post<{ data: AiParseResult }>('/transactions/parse_image', {
    image: imageBase64,
    mime_type: mimeType,
  });
  return response.data.data;
}


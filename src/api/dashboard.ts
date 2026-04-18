import { apiClient } from './client';

// ── Types ──────────────────────────────────────────────────────────────────

export interface DashboardBankAccount {
  id: number;
  name: string;
  custom_name: string | null;
  bank_name: string;
  account_type: 'debit' | 'credit' | 'cash';
  opening_balance: string;
  balance: number;
  currency: string;
}

export interface DashboardTransaction {
  id: number;
  date: string;
  description: string;
  concept: string | null;
  amount: number;
  transaction_type: 'income' | 'fixed_expense' | 'variable_expense' | 'transfer_in' | 'transfer_out';
  source: 'manual' | 'statement_file';
  merchant: string | null;
  reference: string | null;
  statement_file_id: number | null;
  bank_account: { id: number; name: string; account_type: 'debit' | 'credit' | 'cash' };
  category: { id: number; name: string; icon: string } | null;
  is_transfer: boolean;
  transfer_account: { name: string } | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardData {
  summary: {
    total_balance: number;
    total_transactions: number;
    total_statements: number;
    selected_month: string;
  };
  monthly_summary: {
    total_income: number;
    total_expenses: number;
    net_income: number;
    income_count: number;
    expense_count: number;
  };
  monthly_stats: {
    average_transaction: number;
    largest_expense: number;
    largest_income: number;
    daily_average: number;
  };
  bank_accounts: DashboardBankAccount[];
  bank_summaries: Array<{
    account_id: number;
    account_name: string;
    bank_name: string;
    balance: number;
    transaction_count: number;
    recent_activity: string;
    last_processed: string;
    status: string;
  }>;
  recent_transactions: DashboardTransaction[];
  recent_statement_files: Array<{
    id: number;
    filename: string;
    status: string;
    bank_account_id: number;
    created_at: string;
  }>;
  category_summary: {
    has_data: boolean;
    categories: Array<{
      id: number | null;
      name: string;
      icon: string | null;
      amount: number;
    }>;
  };
  spending_trends: Array<{
    month: string;
    total_expenses: number;
    total_income: number;
    net_income: number;
  }>;
  available_months: Array<{ value: string; label: string }>;
}

// ── API calls ─────────────────────────────────────────────────────────────

/**
 * GET /api/v1/dashboard?month=YYYY-MM
 */
export async function getDashboard(month?: string): Promise<DashboardData> {
  const response = await apiClient.get<{ data: DashboardData }>('/dashboard', {
    params: month ? { month } : undefined,
  });
  return response.data.data;
}

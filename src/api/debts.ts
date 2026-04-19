import { apiClient } from './client';

// ── Types ──────────────────────────────────────────────────────────────────

export interface Debt {
  id: number;
  name: string;
  original_amount: number;
  current_balance: number;
  interest_rate: number | null;
  minimum_payment: number | null;
  status: 'active' | 'paid_off' | 'paused' | 'archived';
  color: string;
  icon: string | null;
  notes: string | null;
  payment_mode: 'fixed' | 'calculated' | null;
  payment_frequency: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
  target_payment_amount: number | null;
  target_payoff_date: string | null;
  due_day_of_month: number | null;
  progress_percentage: number;
  amount_remaining: number;
  amount_paid: number;
  goals: { id: number; name: string; color: string; strategy?: string }[];
}

export type CreateDebtBody = {
  name: string;
  original_amount: number;
  current_balance: number;
  interest_rate?: number | null;
  minimum_payment?: number | null;
  due_day_of_month?: number | null;
  target_payoff_date?: string | null;
  color?: string;
  status?: string;
  notes?: string | null;
};

export type UpdateDebtBody = Partial<CreateDebtBody>;

// ── API calls ─────────────────────────────────────────────────────────────

/** GET /api/v1/debts */
export async function getDebts(params?: { status?: string; page?: number }): Promise<Debt[]> {
  const res = await apiClient.get<{ data: { debts: Debt[] } }>('/debts', { params });
  return res.data.data.debts;
}

/** GET /api/v1/debts/:id */
export async function getDebt(id: number): Promise<Debt> {
  const res = await apiClient.get<{ data: Debt }>(`/debts/${id}`);
  return res.data.data;
}

/** POST /api/v1/debts */
export async function createDebt(body: CreateDebtBody): Promise<Debt> {
  const res = await apiClient.post<{ data: Debt }>('/debts', { debt: body });
  return res.data.data;
}

/** PATCH /api/v1/debts/:id */
export async function updateDebt(id: number, body: UpdateDebtBody): Promise<Debt> {
  const res = await apiClient.patch<{ data: Debt }>(`/debts/${id}`, { debt: body });
  return res.data.data;
}

/** DELETE /api/v1/debts/:id */
export async function deleteDebt(id: number): Promise<void> {
  await apiClient.delete(`/debts/${id}`);
}

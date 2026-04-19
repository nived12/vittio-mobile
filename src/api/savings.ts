import { apiClient } from './client';

// ── Types ──────────────────────────────────────────────────────────────────

export interface Saving {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  status: 'active' | 'completed' | 'paused' | 'archived';
  color: string;
  icon: string | null;
  notes: string | null;
  contribution_mode: 'fixed' | 'calculated' | null;
  contribution_frequency: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
  target_contribution_amount: number | null;
  progress_percentage: number;
  amount_remaining: number;
  goals: { id: number; name: string; color: string }[];
}

export type CreateSavingBody = {
  name: string;
  target_amount: number;
  current_amount?: number;
  target_date?: string | null;
  color?: string;
  status?: string;
  notes?: string | null;
};

export type UpdateSavingBody = Partial<CreateSavingBody>;

// ── API calls ─────────────────────────────────────────────────────────────

/** GET /api/v1/savings */
export async function getSavings(params?: { status?: string; page?: number }): Promise<Saving[]> {
  const res = await apiClient.get<{ data: { savings: Saving[] } }>('/savings', { params });
  return res.data.data.savings;
}

/** GET /api/v1/savings/:id */
export async function getSaving(id: number): Promise<Saving> {
  const res = await apiClient.get<{ data: Saving }>(`/savings/${id}`);
  return res.data.data;
}

/** POST /api/v1/savings */
export async function createSaving(body: CreateSavingBody): Promise<Saving> {
  const res = await apiClient.post<{ data: Saving }>('/savings', { saving: body });
  return res.data.data;
}

/** PATCH /api/v1/savings/:id */
export async function updateSaving(id: number, body: UpdateSavingBody): Promise<Saving> {
  const res = await apiClient.patch<{ data: Saving }>(`/savings/${id}`, { saving: body });
  return res.data.data;
}

/** DELETE /api/v1/savings/:id */
export async function deleteSaving(id: number): Promise<void> {
  await apiClient.delete(`/savings/${id}`);
}

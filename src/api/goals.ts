import { apiClient } from './client';

// ── Types ──────────────────────────────────────────────────────────────────

export interface Goal {
  id: number;
  name: string;
  goal_type: 'savings_goal' | 'debt_payoff';
  status: 'active' | 'completed' | 'paused' | 'archived';
  color: string;
  icon: string | null;
  start_date: string;
  deadline: string;
  debt_strategy: 'snowball' | 'avalanche' | null;
  notes: string | null;
  progress_percentage: number;
  amount_remaining: number;
  days_remaining: number;
  monthly_contribution_needed: number;
  on_track: boolean;
  savings: {
    id: number;
    name: string;
    progress_percentage: number;
    current_amount: number;
    target_amount: number;
    color: string;
    icon: string | null;
  }[];
  debts: {
    id: number;
    name: string;
    progress_percentage: number;
    current_balance: number;
    original_amount: number;
    color: string;
    icon: string | null;
  }[];
}

export type CreateGoalBody = {
  name: string;
  goal_type: 'savings_goal' | 'debt_payoff';
  start_date: string;
  deadline: string;
  debt_strategy?: 'snowball' | 'avalanche' | null;
  color?: string;
  notes?: string | null;
};

export type UpdateGoalBody = Partial<CreateGoalBody>;

// ── API calls ─────────────────────────────────────────────────────────────

/** GET /api/v1/goals */
export async function getGoals(params?: { status?: string; page?: number }): Promise<Goal[]> {
  const res = await apiClient.get<{ data: { goals: Goal[] } }>('/goals', { params });
  return res.data.data.goals;
}

/** GET /api/v1/goals/:id */
export async function getGoal(id: number): Promise<Goal> {
  const res = await apiClient.get<{ data: Goal }>(`/goals/${id}`);
  return res.data.data;
}

/** POST /api/v1/goals */
export async function createGoal(body: CreateGoalBody): Promise<Goal> {
  const res = await apiClient.post<{ data: Goal }>('/goals', { goal: body });
  return res.data.data;
}

/** PATCH /api/v1/goals/:id */
export async function updateGoal(id: number, body: UpdateGoalBody): Promise<Goal> {
  const res = await apiClient.patch<{ data: Goal }>(`/goals/${id}`, { goal: body });
  return res.data.data;
}

/** DELETE /api/v1/goals/:id */
export async function deleteGoal(id: number): Promise<void> {
  await apiClient.delete(`/goals/${id}`);
}

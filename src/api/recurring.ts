import { apiClient } from './client';

export type RecurringFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual' | 'custom';
export type RecurringStatus = 'detected' | 'active' | 'paused' | 'cancelled';
export type RecurringSource = 'manual' | 'detected';
export type RecurringTxType = 'income' | 'fixed_expense' | 'variable_expense';

export interface RecurringSeries {
  id: number;
  name: string;
  description_signature: string;
  merchant_hint: string | null;
  expected_amount: number;
  amount_variance_pct: number;
  frequency: RecurringFrequency;
  custom_interval_days: number | null;
  interval_days: number;
  next_due_date: string;
  last_charged_at: string | null;
  last_notified_on: string | null;
  category_id: number | null;
  transaction_type: RecurringTxType;
  status: RecurringStatus;
  source: RecurringSource;
  confidence_score: number | null;
  occurrences_count: number;
  notes: string | null;
  monthly_estimate: number;
  annual_estimate: number;
  detected_at: string | null;
  confirmed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecurringSummary {
  monthly_total: number;
  annual_total: number;
  active_count: number;
  detected_count: number;
  upcoming: RecurringSeries[];
}

export interface RecurringIndexResponse {
  data: { series: RecurringSeries[]; summary: RecurringSummary };
}

export interface CreateRecurringBody {
  name: string;
  expected_amount: number;
  frequency: RecurringFrequency;
  custom_interval_days?: number | null;
  next_due_date: string;
  transaction_type: RecurringTxType;
  category_id?: number | null;
  merchant_hint?: string | null;
  notes?: string | null;
}

export type UpdateRecurringBody = Partial<CreateRecurringBody & { status: RecurringStatus }>;

export async function fetchRecurring(status?: RecurringStatus): Promise<RecurringIndexResponse['data']> {
  const response = await apiClient.get<RecurringIndexResponse>('/recurring', { params: status ? { status } : {} });
  return response.data.data;
}

export async function fetchRecurringSeries(id: number): Promise<RecurringSeries> {
  const response = await apiClient.get<{ data: RecurringSeries }>(`/recurring/${id}`);
  return response.data.data;
}

export async function createRecurring(body: CreateRecurringBody): Promise<RecurringSeries> {
  const response = await apiClient.post<{ data: RecurringSeries }>('/recurring', { recurring_series: body });
  return response.data.data;
}

export async function updateRecurring(id: number, body: UpdateRecurringBody): Promise<RecurringSeries> {
  const response = await apiClient.patch<{ data: RecurringSeries }>(`/recurring/${id}`, { recurring_series: body });
  return response.data.data;
}

export async function deleteRecurring(id: number): Promise<void> {
  await apiClient.delete(`/recurring/${id}`);
}

export async function processDue(id: number, action: 'confirm' | 'skip'): Promise<void> {
  await apiClient.post(`/recurring/${id}/process_due`, { action_type: action });
}

export async function scanRecurring(): Promise<RecurringSeries[]> {
  const response = await apiClient.post<{ data: { detected: RecurringSeries[] } }>('/recurring/scan');
  return response.data.data.detected;
}

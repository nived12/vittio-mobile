import { apiClient } from './client';

// ── Types ──────────────────────────────────────────────────────────────────

export interface SavingTemplate {
  key: string;
  type: 'saving';
  name: string;
  description: string;
  icon: string | null;
  color: string;
  suggested_target_amount: number | null;
  calculation_settings: Record<string, string>;
  category_name: string | null;
}

export interface DebtTemplate {
  key: string;
  type: 'debt';
  name: string;
  description: string;
  icon: string | null;
  color: string;
  suggested_interest_rate: number | null;
  calculation_settings: Record<string, string>;
  category_name: string | null;
}

export interface TemplateCatalog {
  savings: SavingTemplate[];
  debts: DebtTemplate[];
}

// ── API calls ─────────────────────────────────────────────────────────────

/** GET /api/v1/templates */
export async function getTemplates(): Promise<TemplateCatalog> {
  const res = await apiClient.get<{ data: TemplateCatalog }>('/templates');
  return res.data.data;
}

import { apiClient } from './client';

// ── Types ──────────────────────────────────────────────────────────────────

export interface Category {
  id: number;
  name: string;
  icon: string;
  color?: string;
  parent_id?: number | null;
  transaction_count?: number;
  children?: Category[];
}

// ── API calls ─────────────────────────────────────────────────────────────

/** GET /api/v1/categories */
export async function getCategories(): Promise<Category[]> {
  const response = await apiClient.get<{ data: { categories: Category[] } }>('/categories');
  return response.data.data.categories;
}

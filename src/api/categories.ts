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

export interface CreateCategoryBody {
  name: string;
  icon?: string;
  color?: string;
  parent_id?: number | null;
}

export type UpdateCategoryBody = Partial<CreateCategoryBody>;

/** GET /api/v1/categories */
export async function getCategories(): Promise<Category[]> {
  const response = await apiClient.get<{ data: { categories: Category[] } }>('/categories');
  return response.data.data.categories;
}

/** POST /api/v1/categories */
export async function createCategory(body: CreateCategoryBody): Promise<Category> {
  const response = await apiClient.post<{ data: Category }>('/categories', { category: body });
  return response.data.data;
}

/** PATCH /api/v1/categories/:id */
export async function updateCategory(id: number, body: UpdateCategoryBody): Promise<Category> {
  const response = await apiClient.patch<{ data: Category }>(`/categories/${id}`, { category: body });
  return response.data.data;
}

/** DELETE /api/v1/categories/:id */
export async function deleteCategory(id: number): Promise<void> {
  await apiClient.delete(`/categories/${id}`);
}

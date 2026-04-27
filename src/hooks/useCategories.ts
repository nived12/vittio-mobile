import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  type CreateCategoryBody,
  type UpdateCategoryBody,
} from '../api/categories';

export const categoriesQueryKey = ['categories'] as const;

/**
 * Fetch all categories. staleTime: 1hr — categories change rarely.
 */
export function useCategories() {
  return useQuery({
    queryKey: categoriesQueryKey,
    queryFn: getCategories,
    staleTime: 3_600_000,   // 1 hour
    gcTime: 7_200_000,      // 2 hours
    networkMode: 'offlineFirst',
  });
}

/** Create a new category */
export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCategoryBody) => createCategory(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoriesQueryKey });
    },
  });
}

/** Update an existing category */
export function useUpdateCategory(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateCategoryBody) => updateCategory(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoriesQueryKey });
    },
  });
}

/** Delete a category */
export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoriesQueryKey });
    },
  });
}

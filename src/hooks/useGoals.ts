import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createGoal,
  deleteGoal,
  getGoal,
  getGoals,
  updateGoal,
  type CreateGoalBody,
  type UpdateGoalBody,
} from '../api/goals';

// ── Query keys ─────────────────────────────────────────────────────────────

export const goalKeys = {
  all: ['goals'] as const,
  list: () => [...goalKeys.all, 'list'] as const,
  detail: (id: number) => [...goalKeys.all, 'detail', id] as const,
};

// ── Hooks ──────────────────────────────────────────────────────────────────

export function useGoals() {
  return useQuery({
    queryKey: goalKeys.list(),
    queryFn: () => getGoals(),
    staleTime: 60_000,
    gcTime: 300_000,
    networkMode: 'offlineFirst',
  });
}

export function useGoal(id: number) {
  return useQuery({
    queryKey: goalKeys.detail(id),
    queryFn: () => getGoal(id),
    staleTime: 60_000,
    networkMode: 'offlineFirst',
    enabled: id > 0,
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateGoalBody) => createGoal(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.list() });
    },
  });
}

export function useUpdateGoal(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateGoalBody) => updateGoal(id, body),
    onSuccess: (updated) => {
      queryClient.setQueryData(goalKeys.detail(id), updated);
      queryClient.invalidateQueries({ queryKey: goalKeys.list() });
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteGoal(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: goalKeys.list() });
      queryClient.removeQueries({ queryKey: goalKeys.detail(id) });
    },
  });
}

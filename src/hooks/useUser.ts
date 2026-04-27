import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateUser, updatePassword, type UpdateUserBody, type UpdatePasswordBody } from '../api/user';
import { useAuthStore } from '../stores/authStore';

/** PATCH /api/v1/user — updates profile fields + syncs authStore.user */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateUserBody) => updateUser(body),
    onSuccess: (updatedUser) => {
      // Sync the in-memory auth store without requiring a full re-login
      useAuthStore.setState({ user: updatedUser });
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
}

/** PATCH /api/v1/user/password */
export function useUpdatePassword() {
  return useMutation({
    mutationFn: (body: UpdatePasswordBody) => updatePassword(body),
  });
}

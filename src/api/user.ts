import { apiClient } from './client';
import type { AuthUser } from '../stores/authStore';

export interface UpdateUserBody {
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
}

export interface UpdatePasswordBody {
  current_password: string;
  password: string;
  password_confirmation: string;
}

/** PATCH /api/v1/user */
export async function updateUser(body: UpdateUserBody): Promise<AuthUser> {
  const response = await apiClient.patch<{ data: AuthUser }>('/user', { user: body });
  return response.data.data;
}

/** PATCH /api/v1/user/password */
export async function updatePassword(body: UpdatePasswordBody): Promise<void> {
  await apiClient.patch('/user/password', { user: body });
}

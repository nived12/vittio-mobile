import { apiClient } from './client';

export interface NotificationPrefs {
  notify_statement_imports: boolean;
  notify_goal_milestones: boolean;
  notify_debt_reminders: boolean;
}

export async function fetchNotificationPrefs(): Promise<NotificationPrefs> {
  const response = await apiClient.get<{ data: NotificationPrefs }>('/user_settings');
  return response.data.data;
}

export async function updateNotificationPref(
  key: keyof NotificationPrefs,
  value: boolean,
): Promise<void> {
  await apiClient.patch('/user_settings', { settings: { [key]: value } });
}

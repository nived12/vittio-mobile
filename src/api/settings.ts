import { apiClient } from './client';

export interface NotificationPrefs {
  notify_statement_imports: boolean;
  notify_goal_milestones: boolean;
  notify_debt_reminders: boolean;
}

export interface UserSettings extends NotificationPrefs {
  analytics_enabled: boolean;
  analytics_notice_seen_at: string | null;
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

export async function fetchUserSettings(): Promise<UserSettings> {
  const response = await apiClient.get<{ data: UserSettings }>('/user_settings');
  return response.data.data;
}

export async function markAnalyticsNoticeSeen(): Promise<void> {
  await apiClient.patch('/user_settings', {
    settings: { analytics_notice_seen_at: true },
  });
}

export async function updateAnalyticsEnabled(enabled: boolean): Promise<void> {
  await apiClient.patch('/user_settings', {
    settings: { analytics_enabled: enabled },
  });
}

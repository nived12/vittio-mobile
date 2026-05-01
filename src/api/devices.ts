import { apiClient as client } from './client';

export interface Device {
  id: number;
  push_token: string;
  platform: string;
  active: boolean;
  created_at: string;
}

export async function registerDevice(pushToken: string, platform: 'ios' | 'android' | 'web'): Promise<Device> {
  const response = await client.post<{ data: Device }>('/devices', {
    device: { push_token: pushToken, platform },
  });
  return response.data.data;
}

export async function unregisterDevice(pushToken: string): Promise<void> {
  await client.delete(`/devices/${encodeURIComponent(pushToken)}`);
}

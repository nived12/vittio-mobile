import { useAuthStore } from '@/stores/authStore';

export function useIsPremiumLocked(): boolean {
  const status = useAuthStore((s) => s.user?.subscription_status);
  if (status === undefined) return false;
  return status !== 'active' && status !== 'trial_active';
}

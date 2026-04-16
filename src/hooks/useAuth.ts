import { useAuthStore } from '../stores/authStore';

/**
 * Convenience hook that exposes everything a screen needs from the auth store.
 */
export function useAuth() {
  const user            = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading       = useAuthStore((s) => s.isLoading);
  const isHydrated      = useAuthStore((s) => s.isHydrated);
  const login           = useAuthStore((s) => s.login);
  const signup          = useAuthStore((s) => s.signup);
  const logout          = useAuthStore((s) => s.logout);

  return {
    user,
    isAuthenticated,
    isLoading,
    isHydrated,
    login,
    signup,
    logout,
  };
}

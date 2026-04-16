import { create } from 'zustand';
import { tokenStorage } from '../utils/tokenStorage';

// ── Types ──────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  confirmed: boolean;
  avatar_url: string | null;
  subscription_status: string;
  trial_ends_at: string | null;
}

interface AuthState {
  // State
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** True once SecureStore hydration has completed on startup */
  isHydrated: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  signup: (fields: SignupFields) => Promise<void>;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<string>;
  hydrate: () => Promise<void>;
  /** Internal — sets user + tokens after a successful auth response */
  _setAuth: (tokens: TokenPayload, user: AuthUser) => Promise<void>;
  /** Internal — clears auth without calling the API */
  _clearAuth: () => Promise<void>;
}

interface SignupFields {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

interface TokenPayload {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

// ── Store ──────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>((set, get) => ({
  user:            null,
  accessToken:     null,
  refreshToken:    null,
  isAuthenticated: false,
  isLoading:       false,
  isHydrated:      false,

  // ── _setAuth ──────────────────────────────────────────────────────────────
  _setAuth: async (tokens, user) => {
    await tokenStorage.saveTokens(tokens.access_token, tokens.refresh_token);
    await tokenStorage.saveUser(user);
    set({
      user,
      accessToken:     tokens.access_token,
      refreshToken:    tokens.refresh_token,
      isAuthenticated: true,
      isLoading:       false,
    });
  },

  // ── _clearAuth ────────────────────────────────────────────────────────────
  _clearAuth: async () => {
    await tokenStorage.clearTokens();
    set({
      user:            null,
      accessToken:     null,
      refreshToken:    null,
      isAuthenticated: false,
      isLoading:       false,
    });
  },

  // ── login ─────────────────────────────────────────────────────────────────
  login: async (email, password) => {
    set({ isLoading: true });
    // Imported lazily to avoid circular dep with apiClient
    const { authApi } = await import('../api/auth');
    const response = await authApi.login(email, password);
    await get()._setAuth(
      {
        access_token:  response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_in:    response.data.expires_in,
        token_type:    response.data.token_type,
      },
      response.data.user,
    );
  },

  // ── signup ────────────────────────────────────────────────────────────────
  signup: async (fields) => {
    set({ isLoading: true });
    const { authApi } = await import('../api/auth');
    const response = await authApi.signup(fields);
    await get()._setAuth(
      {
        access_token:  response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_in:    response.data.expires_in,
        token_type:    response.data.token_type,
      },
      response.data.user,
    );
  },

  // ── logout ────────────────────────────────────────────────────────────────
  logout: async () => {
    set({ isLoading: true });
    try {
      const { authApi } = await import('../api/auth');
      await authApi.logout();
    } catch {
      // Fire-and-forget — always clear local state even if the API call fails
    }
    await get()._clearAuth();
  },

  // ── refreshTokens ─────────────────────────────────────────────────────────
  // Returns the new access token so the Axios interceptor can retry queued requests.
  refreshTokens: async () => {
    const storedRefreshToken = get().refreshToken ?? (await tokenStorage.getRefreshToken());
    if (!storedRefreshToken) {
      await get()._clearAuth();
      throw new Error('No refresh token available');
    }
    const { authApi } = await import('../api/auth');
    const response = await authApi.refresh(storedRefreshToken);
    const { access_token, refresh_token } = response.data;
    await tokenStorage.saveTokens(access_token, refresh_token);
    set({ accessToken: access_token, refreshToken: refresh_token });
    return access_token;
  },

  // ── hydrate ───────────────────────────────────────────────────────────────
  // Called once on app startup from the root _layout.tsx.
  // Reads SecureStore → validates tokens → sets auth state → hides splash.
  hydrate: async () => {
    set({ isLoading: true });
    try {
      const tokens = await tokenStorage.getTokens();
      if (!tokens) {
        set({ isLoading: false, isHydrated: true });
        return;
      }

      // Fetch current user to validate the stored access token
      const { authApi } = await import('../api/auth');
      const user = await authApi.me();

      set({
        user,
        accessToken:     tokens.accessToken,
        refreshToken:    tokens.refreshToken,
        isAuthenticated: true,
        isLoading:       false,
        isHydrated:      true,
      });
    } catch {
      // Token invalid or network error — treat as logged out
      await tokenStorage.clearTokens();
      set({
        user:            null,
        accessToken:     null,
        refreshToken:    null,
        isAuthenticated: false,
        isLoading:       false,
        isHydrated:      true,
      });
    }
  },
}));

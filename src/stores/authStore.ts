import { create } from 'zustand';
import { tokenStorage } from '../utils/tokenStorage';
import { forgetPurchaser, identifyPurchaser } from '../lib/purchases';

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
  subscription_interval: 'month' | 'year' | null;
  /** Who bills them. iOS must not offer to manage a subscription it cannot manage. */
  billing_source: 'stripe' | 'apple' | null;
  trial_ends_at: string | null;
  legal_version_accepted: string | null;
  consent_current: boolean;
  ai_calls_used: number;
  ai_calls_limit: number;
  statement_files_used: number;
  statement_files_limit: number;
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
  loginWithGoogle: (tokens: TokenPayload) => Promise<void>;
  loginWithApple: (payload: AppleAuthPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<string>;
  hydrate: () => Promise<void>;
  /** Internal — sets user + tokens after a successful auth response */
  _setAuth: (tokens: TokenPayload, user: AuthUser) => Promise<void>;
  /** Internal — clears auth without calling the API */
  _clearAuth: () => Promise<void>;
  /** Updates the user object in state (e.g. after profile/avatar update) */
  setUser: (user: AuthUser) => void;
}

interface SignupFields {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

interface AppleAuthPayload {
  identity_token: string;
  first_name?: string;
  last_name?: string;
  email?: string;
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

    // Tell RevenueCat who is buying before any purchase can start, so App Store
    // webhooks carry our own user id. Never awaited into the sign-in path —
    // it degrades the paywall at worst, and must not delay or fail login.
    void identifyPurchaser(user.id);
  },

  // ── _clearAuth ────────────────────────────────────────────────────────────
  // Single choke point for all logout paths (manual logout, expired-session
  // forced logout, failed hydrate). Purges everything tied to the account so
  // the previous user's data can't bleed into the next session: tokens,
  // the cached React Query data, and account-specific UI state.
  _clearAuth: async () => {
    await tokenStorage.clearTokens();
    // Detach the RevenueCat identity too, or the next account to sign in on this
    // device would inherit the previous user's purchases.
    await forgetPurchaser();
    set({
      user:            null,
      accessToken:     null,
      refreshToken:    null,
      isAuthenticated: false,
      isLoading:       false,
    });

    // Clear cached query data (transactions, dashboard, accounts, savings,
    // debts, categories, etc.). Lazily imported to avoid pulling the React
    // tree's query client into this plain store at module load.
    try {
      const { queryClient } = await import('../lib/queryClient');
      queryClient.clear();
      // clear() only wipes memory — also purge the on-disk persisted cache, or
      // one account's data could rehydrate into the next session on this device.
      const { queryPersister } = await import('../lib/queryPersister');
      await queryPersister.removeClient();
    } catch {
      // Best-effort — never block logout on cache teardown
    }

    // Reset account-specific UI state (celebration guards, notification prefs,
    // selected month, banners). Device prefs (theme, locale, biometric) persist.
    try {
      const { useUIStore } = await import('./uiStore');
      await useUIStore.getState().resetForLogout();
    } catch {
      // Best-effort
    }
  },

  // ── login ─────────────────────────────────────────────────────────────────
  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { resetConsentRedirect } = await import('../api/client');
      resetConsentRedirect();
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
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  // ── loginWithGoogle ───────────────────────────────────────────────────────
  // Called after WebBrowser returns the OAuth callback URL with JWT tokens.
  // Saves tokens to SecureStore first so apiClient can pick them up for /user.
  loginWithGoogle: async (tokens) => {
    set({ isLoading: true });
    try {
      await tokenStorage.saveTokens(tokens.access_token, tokens.refresh_token);
      set({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token });
      const { authApi } = await import('../api/auth');
      const user = await authApi.me();
      await get()._setAuth(tokens, user);
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  // ── loginWithApple ────────────────────────────────────────────────────────
  // Native Apple Sign In: exchange the identity token for Vittio JWTs.
  loginWithApple: async (payload) => {
    set({ isLoading: true });
    try {
      const { resetConsentRedirect } = await import('../api/client');
      resetConsentRedirect();
      const { authApi } = await import('../api/auth');
      const response = await authApi.loginWithApple(payload);
      await get()._setAuth(
        {
          access_token:  response.data.access_token,
          refresh_token: response.data.refresh_token,
          expires_in:    response.data.expires_in,
          token_type:    response.data.token_type,
        },
        response.data.user,
      );
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  // ── signup ────────────────────────────────────────────────────────────────
  signup: async (fields) => {
    set({ isLoading: true });
    try {
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
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
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
    // Deregister push token before clearing auth
    try {
      const { deregisterPushNotifications } = await import('../utils/notifications');
      await deregisterPushNotifications();
    } catch {
      // Best-effort — don't block logout
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

  // ── setUser ───────────────────────────────────────────────────────────────
  setUser: (user) => set({ user }),

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

      // Every relaunch restores the session through here rather than _setAuth, so
      // RevenueCat has to be identified here too. Without it the SDK is never
      // configured after the first launch, getOfferings() throws, and the paywall
      // shows "plans unavailable" — no purchase path, which is the Guideline 3.1.1
      // finding all over again.
      void identifyPurchaser(user.id);
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

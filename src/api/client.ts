import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from 'axios';
import { Platform } from 'react-native';
import i18n from '../i18n';
import { tokenStorage } from '../utils/tokenStorage';

const devBaseURL = Platform.select({
  ios: 'http://localhost:3000/api/v1',
  android: 'http://10.0.2.2:3000/api/v1',
  default: 'http://localhost:3000/api/v1',
});

// ── Concurrent-refresh queue ───────────────────────────────────────────────
//
// When multiple requests fail with 401 simultaneously:
// 1. The first one kicks off a token refresh.
// 2. All subsequent 401 failures are queued here as pending promises.
// 3. Once the refresh resolves, every queued request is retried with the
//    new access token. If the refresh fails, every queued request rejects.

interface QueueItem {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}

let isRefreshing = false;
let failedQueue: QueueItem[] = [];
let isRedirectingToConsent = false;
let isRedirectingToPremium = false;
export function resetConsentRedirect(): void { isRedirectingToConsent = false; }
export function resetPremiumRedirect(): void { isRedirectingToPremium = false; }

const SENSITIVE_KEYS = ['password', 'password_confirmation', 'current_password'];

function redactSensitive(data: unknown): unknown {
  if (data == null || typeof data !== 'object') return data;
  const obj = data as Record<string, unknown>;
  let copy: Record<string, unknown> | null = null;
  for (const key of SENSITIVE_KEYS) {
    if (key in obj) {
      copy = copy ?? { ...obj };
      copy[key] = '[REDACTED]';
    }
  }
  return copy ?? data;
}

function processQueue(error: unknown, token: string | null): void {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token!);
    }
  });
  failedQueue = [];
}

// ── Axios instance ─────────────────────────────────────────────────────────

export const apiClient: AxiosInstance = axios.create({
  baseURL: process.env['EXPO_PUBLIC_API_URL'] ?? devBaseURL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15_000,
});

// ── Request interceptor — attach access token ──────────────────────────────

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await tokenStorage.getAccessToken().catch(() => null);
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    // Localize server-rendered copy (e.g. template names) to the app language.
    if (config.headers) {
      config.headers['Accept-Language'] = i18n.language || 'es';
    }

    if (__DEV__) {
      const safeData = redactSensitive(config.data);
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, {
        params: config.params,
        data:   safeData,
      });
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor — handle 401 with token refresh + threshold toasts ─

apiClient.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      console.log(`[API] ${response.status} ${response.config.url}`);
    }

    const threshold = response.data?.meta?.usage?.threshold_crossed as number | undefined;
    if (threshold) {
      Promise.all([
        import('../stores/uiStore'),
        import('../i18n/index'),
      ])
        .then(([{ useUIStore }, { default: i18n }]) => {
          const message = i18n.t(`assistant.quotaNotice.${threshold}`);
          useUIStore.getState().showToast(message, 'warning');
        })
        .catch((e) => {
          if (__DEV__) console.warn('[API] threshold toast failed', e);
        });
    }

    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Only attempt refresh on 401 responses that haven't already been retried.
    // Skip refresh for endpoints where 401 is the expected failure mode
    // (login/signup) — otherwise we'd swallow INVALID_CREDENTIALS and surface
    // a misleading network/refresh error.
    const url = originalRequest.url ?? '';
    const skipsRefresh =
      url.includes('/refresh') ||
      url.includes('/login') ||
      url.includes('/signup');
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !skipsRefresh
    ) {
      if (isRefreshing) {
        // Queue this request — it will be retried once the ongoing refresh finishes
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers['Authorization'] = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((queueError) => Promise.reject(queueError));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Use the authStore's refreshTokens action to get new tokens.
        // Import lazily to avoid circular dependency (authStore imports apiClient).
        const { useAuthStore } = await import('../stores/authStore');
        const newAccessToken = await useAuthStore.getState().refreshTokens();

        processQueue(null, newAccessToken);

        if (originalRequest.headers) {
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        }

        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);

        // Refresh token exhausted — force logout
        const { useAuthStore } = await import('../stores/authStore');
        await useAuthStore.getState()._clearAuth();

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (
      error.response?.status === 403 &&
      getApiErrorCode(error) === 'TERMS_NOT_ACCEPTED'
    ) {
      if (!isRedirectingToConsent) {
        isRedirectingToConsent = true;
        const { router } = await import('expo-router');
        router.replace('/(auth)/consent' as Parameters<typeof router.replace>[0]);
      }
      return Promise.reject(error);
    }

    if (
      error.response?.status === 402 ||
      getApiErrorCode(error) === 'SUBSCRIPTION_REQUIRED'
    ) {
      if (!isRedirectingToPremium) {
        isRedirectingToPremium = true;
        const { router } = await import('expo-router');
        router.push('/(app)/premium' as Parameters<typeof router.push>[0]);
        // Reset flag after navigation so future 402s can also redirect
        const PREMIUM_REDIRECT_DEBOUNCE_MS = 2000;
        setTimeout(() => { isRedirectingToPremium = false; }, PREMIUM_REDIRECT_DEBOUNCE_MS);
      }
      return Promise.reject(error);
    }

    if (__DEV__) {
      if (error.response) {
        console.error(
          `[API] Error ${error.response.status} ${originalRequest.url}`,
          error.response.data,
        );
      } else {
        console.warn(
          `[API] Network error — server unreachable (${originalRequest.url})`,
        );
      }
    }

    return Promise.reject(error);
  },
);

// ── Typed API error helper ─────────────────────────────────────────────────

export interface ApiErrorPayload {
  error: {
    message: string;
    code: string;
    details: Array<{
      field: string;
      message: string;
      code: string;
    }>;
  };
}

export function isApiError(error: unknown): error is AxiosError<ApiErrorPayload> {
  return axios.isAxiosError(error) && error.response?.data != null;
}

export function getApiErrorCode(error: unknown): string | null {
  if (isApiError(error)) {
    return error.response?.data?.error?.code ?? null;
  }
  return null;
}

export function getApiErrorDetails(
  error: unknown,
): ApiErrorPayload['error']['details'] {
  if (isApiError(error)) {
    return error.response?.data?.error?.details ?? [];
  }
  return [];
}

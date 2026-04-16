import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from 'axios';
import { tokenStorage } from '../utils/tokenStorage';

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
  baseURL: process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3000/api/v1',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15_000,
});

// ── Request interceptor — attach access token ──────────────────────────────

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await tokenStorage.getAccessToken();
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    if (__DEV__) {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, {
        params: config.params,
        data:   config.data,
      });
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor — handle 401 with token refresh ──────────────────

apiClient.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      console.log(`[API] ${response.status} ${response.config.url}`);
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Only attempt refresh on 401 responses that haven't already been retried.
    // Skip refresh for the /refresh endpoint itself to prevent infinite loops.
    const isRefreshEndpoint = originalRequest.url?.includes('/refresh');
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isRefreshEndpoint
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

    if (__DEV__) {
      console.error(
        `[API] Error ${error.response?.status} ${originalRequest.url}`,
        error.response?.data,
      );
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

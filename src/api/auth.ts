import axios from 'axios';
import { apiClient } from './client';
import type { AuthUser } from '../stores/authStore';

// ── Response shapes ────────────────────────────────────────────────────────

interface TokenData {
  access_token:  string;
  refresh_token: string;
  token_type:    string;
  expires_in:    number;
}

interface AuthResponse {
  data: TokenData & { user: AuthUser };
  message: string;
}

interface RefreshResponse {
  data: TokenData;
}

// ── API calls ──────────────────────────────────────────────────────────────

async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>('/login', {
    user: { email, password },
  });
  return response.data;
}

interface ApplePayload {
  identity_token: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

async function loginWithApple(payload: ApplePayload): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>('/auth/apple', payload);
  return response.data;
}

interface SignupPayload {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

async function signup(fields: SignupPayload): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>('/signup', {
    user: fields,
  });
  return response.data;
}

async function logout(): Promise<void> {
  await apiClient.delete('/logout');
}

/**
 * Exchange a refresh token for a new token pair.
 * Uses a raw axios instance (not apiClient) to avoid the 401 interceptor loop.
 */
async function refresh(refreshToken: string): Promise<RefreshResponse> {
  const baseURL =
    process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3000/api/v1';
  const response = await axios.post<RefreshResponse>(
    `${baseURL}/refresh`,
    { refresh_token: refreshToken },
    { headers: { 'Content-Type': 'application/json' } },
  );
  return response.data;
}

/**
 * Fetch the current authenticated user.
 * Used during app hydration to validate the stored access token.
 */
async function me(): Promise<AuthUser> {
  const response = await apiClient.get<{ data: AuthUser }>('/user');
  return response.data.data;
}

/**
 * Request a password reset email.
 */
async function forgotPassword(email: string): Promise<void> {
  await apiClient.post('/password_resets', { user: { email } });
}

/**
 * Resend the email confirmation.
 * - When the user is already authenticated (in-app banner): call with no args —
 *   the server uses the Bearer token to find the current user.
 * - When the user is not yet logged in (login screen): pass the email address
 *   so the server can look the user up.
 */
async function resendConfirmation(email?: string): Promise<void> {
  await apiClient.post('/email_confirmations', email ? { email } : undefined);
}

/**
 * Confirm email via token from the deep link.
 */
async function confirmEmail(token: string): Promise<void> {
  await apiClient.put(`/email_confirmations/${token}`);
}

export const authApi = {
  login,
  loginWithApple,
  signup,
  logout,
  refresh,
  me,
  forgotPassword,
  resendConfirmation,
  confirmEmail,
};

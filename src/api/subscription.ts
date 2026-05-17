import { apiClient } from './client';

// ── Types ──────────────────────────────────────────────────────────────────

export interface SubscriptionStatus {
  plan: 'premium' | null;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | null;
  billing_interval: 'month' | 'year' | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

// ── API calls ──────────────────────────────────────────────────────────────

/** GET /api/v1/subscription */
export async function fetchSubscriptionStatus(): Promise<SubscriptionStatus> {
  const res = await apiClient.get<{ data: SubscriptionStatus }>('/subscription');
  return res.data.data;
}

export type CheckoutResult =
  | { kind: 'checkout'; url: string }
  | { kind: 'switched' };

/** POST /api/v1/subscription/checkout */
export async function createCheckoutSession(
  interval: 'month' | 'year',
  successUrl: string,
  cancelUrl: string,
): Promise<CheckoutResult> {
  const res = await apiClient.post<{ data: { checkout_url?: string; switched?: boolean } }>(
    '/subscription/checkout',
    { interval, success_url: successUrl, cancel_url: cancelUrl },
  );
  if (res.data.data?.switched) return { kind: 'switched' };
  return { kind: 'checkout', url: res.data.data.checkout_url! };
}

/** GET /api/v1/subscription/portal */
export async function fetchPortalUrl(returnUrl: string): Promise<string> {
  const res = await apiClient.get<{ data: { portal_url: string } }>(
    '/subscription/portal',
    { params: { return_url: returnUrl } },
  );
  return res.data.data.portal_url;
}

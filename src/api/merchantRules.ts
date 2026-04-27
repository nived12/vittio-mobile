import { apiClient } from './client';

export interface MerchantRule {
  id: number;
  merchant_name: string;
  category_id: number;
  category?: {
    id: number;
    name: string;
    icon: string;
    color?: string;
  };
}

export interface CreateMerchantRuleBody {
  merchant_name: string;
  category_id: number;
}

/** GET /api/v1/merchant_rules?merchant=NAME */
export async function getMerchantRule(merchant: string): Promise<MerchantRule | null> {
  const response = await apiClient.get<{ data: { merchant_rules: MerchantRule[] } }>(
    '/merchant_rules',
    { params: { merchant } },
  );
  return response.data.data.merchant_rules[0] ?? null;
}

/** POST /api/v1/merchant_rules — upserts by merchant_name */
export async function createMerchantRule(body: CreateMerchantRuleBody): Promise<MerchantRule> {
  const response = await apiClient.post<{ data: MerchantRule }>('/merchant_rules', {
    merchant_rule: body,
  });
  return response.data.data;
}

/** DELETE /api/v1/merchant_rules/:id */
export async function deleteMerchantRule(id: number): Promise<void> {
  await apiClient.delete(`/merchant_rules/${id}`);
}

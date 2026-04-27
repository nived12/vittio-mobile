import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getMerchantRule,
  createMerchantRule,
  deleteMerchantRule,
  type CreateMerchantRuleBody,
} from '../api/merchantRules';

export const merchantRuleKeys = {
  all: ['merchantRules'] as const,
  byMerchant: (merchant: string) => [...merchantRuleKeys.all, merchant] as const,
};

/** Look up a rule for a specific merchant name (used by smart categorization) */
export function useMerchantRule(merchant: string) {
  return useQuery({
    queryKey: merchantRuleKeys.byMerchant(merchant),
    queryFn: () => getMerchantRule(merchant),
    enabled: merchant.trim().length > 0,
    staleTime: 300_000, // 5 min
    gcTime: 600_000,
  });
}

/** Upsert a rule — fired when user manually sets a category */
export function useCreateMerchantRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateMerchantRuleBody) => createMerchantRule(body),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({
        queryKey: merchantRuleKeys.byMerchant(vars.merchant_name),
      });
    },
  });
}

/** Delete a rule */
export function useDeleteMerchantRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteMerchantRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: merchantRuleKeys.all });
    },
  });
}

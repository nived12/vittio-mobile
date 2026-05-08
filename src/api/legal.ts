import { apiClient } from './client';

export interface LegalAcceptResponse {
  consent_accepted: boolean;
  version: string;
  accepted_at: string;
}

export const legalApi = {
  accept: () =>
    apiClient.post<{ data: LegalAcceptResponse }>('/legal/accept'),
};

import { apiClient } from './client';
import { CURRENT_LEGAL_VERSION } from '../constants/legal';

export interface LegalAcceptResponse {
  consent_accepted: boolean;
  version: string;
  accepted_at: string;
}

export const legalApi = {
  accept: () =>
    apiClient.post<{ data: LegalAcceptResponse }>('/legal/accept', {
      version: CURRENT_LEGAL_VERSION,
    }),
};

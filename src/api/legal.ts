import { apiClient } from './client';
import { CURRENT_LEGAL_VERSION } from '../constants/legal';

export interface LegalStatusResponse {
  consent_current: boolean;
  required_version: string;
  accepted_version: string | null;
  terms_accepted_at: string | null;
  privacy_accepted_at: string | null;
}

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

  status: () =>
    apiClient.get<{ data: LegalStatusResponse }>('/legal/status'),
};

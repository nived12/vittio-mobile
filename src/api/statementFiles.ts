import { apiClient } from './client';

export const UPLOAD_TIMEOUT_MS = 180_000;

// ── Types ──────────────────────────────────────────────────────────────────

export type StatementFileStatus =
  | 'pending'
  | 'processing'
  | 'parsed'
  | 'completed'
  | 'error';

export interface FinancialSummary {
  statement_type: 'savings' | 'credit' | 'payroll';
  statement_period_start: string | null;
  statement_period_end: string | null;
  days_in_period: number | null;
  initial_balance: string | number | null;
  final_balance: string | number | null;
  net_movement: string | number | null;
  total_deposits: number;
  total_withdrawals: number;
  interest_earned: number;
  total_commissions: string | number | null;
  total_fees: string | number | null;
  // Credit statements only.
  total_payments?: number;
  total_charges?: number;
  credit_limit?: number | null;
  available_credit?: number | null;
  minimum_payment?: number | null;
}

export interface StatementFile {
  id: number;
  status: StatementFileStatus;
  filename: string;
  file_size: number;
  cutoff_date: string;
  period_start: string | null;
  processed_at: string | null;
  transactions_count: number;
  pending_transactions_count: number;
  password_required: boolean;
  error_message?: string | null;
  bank_account: {
    id: number;
    display_name: string;
    account_number: string | null;
  };
  created_at: string;
  updated_at: string;
  /** Present on the detail endpoint only, and only once the statement has one. */
  financial_summary?: FinancialSummary;
}

// ── API calls ─────────────────────────────────────────────────────────────

/** POST /api/v1/statement_files  (multipart/form-data) */
export async function uploadStatementFile(
  fileUri: string,
  fileName: string,
  bankAccountId: number,
  cutoffDate: string,
  onProgress?: (pct: number) => void,
  filePassword?: string,
): Promise<StatementFile> {
  const formData = new FormData();
  formData.append('statement_file[file]', {
    uri: fileUri,
    name: fileName,
    type: 'application/pdf',
  } as unknown as Blob);
  formData.append('statement_file[bank_account_id]', String(bankAccountId));
  formData.append('statement_file[cutoff_date]', cutoffDate);
  if (filePassword) formData.append('statement_file[file_password]', filePassword);

  const response = await apiClient.post<{ data: StatementFile }>(
    '/statement_files',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      // The 15s instance default is a wrong fit here: the largest statement in
      // production is 4.3 MB, which is minutes on weak mobile data.
      timeout: UPLOAD_TIMEOUT_MS,
      // Never let the 401 interceptor replay this — replaying re-sends the
      // whole file and resets the progress bar to 0%. handleUpload refreshes
      // the token before calling us so a mid-upload 401 shouldn't arise.
      _noReplay: true,
      onUploadProgress: (evt) => {
        if (onProgress && evt.total) {
          onProgress(Math.round((evt.loaded / evt.total) * 100));
        }
      },
    },
  );
  return response.data.data;
}

export interface StatementFileListResponse {
  data: { statement_files: StatementFile[] };
  meta: {
    pagination: {
      current_page: number;
      total_pages: number;
      total_items: number;
      page_size: number;
      next_page: number | null;
      prev_page: number | null;
    };
  };
}

/** GET /api/v1/statement_files */
export async function listStatementFiles(
  page = 1,
): Promise<StatementFileListResponse> {
  const response = await apiClient.get<StatementFileListResponse>(
    '/statement_files',
    { params: { page, page_size: 20 } },
  );
  return response.data;
}

/** DELETE /api/v1/statement_files/:id — also deletes the transactions it created */
export async function deleteStatementFile(id: number): Promise<void> {
  await apiClient.delete(`/statement_files/${id}`);
}

/** GET /api/v1/statement_files/:id */
export async function getStatementFile(id: number): Promise<StatementFile> {
  const response = await apiClient.get<{ data: StatementFile }>(`/statement_files/${id}`);
  return response.data.data;
}

/** POST /api/v1/statement_files/:id/retry */
export async function retryStatementFile(
  id: number,
  filePassword?: string,
): Promise<StatementFile> {
  const response = await apiClient.post<{ data: StatementFile }>(
    `/statement_files/${id}/retry`,
    filePassword ? { file_password: filePassword } : {},
  );
  return response.data.data;
}

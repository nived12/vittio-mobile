import { apiClient } from './client';

// ── Types ──────────────────────────────────────────────────────────────────

export type StatementFileStatus =
  | 'pending'
  | 'processing'
  | 'parsed'
  | 'completed'
  | 'error';

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
}

// ── API calls ─────────────────────────────────────────────────────────────

/** POST /api/v1/statement_files  (multipart/form-data) */
export async function uploadStatementFile(
  fileUri: string,
  fileName: string,
  bankAccountId: number,
  cutoffDate: string,
  onProgress?: (pct: number) => void,
): Promise<StatementFile> {
  const formData = new FormData();
  formData.append('statement_file[file]', {
    uri: fileUri,
    name: fileName,
    type: 'application/pdf',
  } as unknown as Blob);
  formData.append('statement_file[bank_account_id]', String(bankAccountId));
  formData.append('statement_file[cutoff_date]', cutoffDate);

  const response = await apiClient.post<{ data: StatementFile }>(
    '/statement_files',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (evt) => {
        if (onProgress && evt.total) {
          onProgress(Math.round((evt.loaded / evt.total) * 100));
        }
      },
    },
  );
  return response.data.data;
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

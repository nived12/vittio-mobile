import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { apiClient } from './client';
import { tokenStorage } from '../utils/tokenStorage';

/**
 * Download monthly PDF report and open the native share sheet.
 * Throws on failure so the caller can surface an error — never opens the raw
 * API URL in a browser, which has no auth header and renders a JSON 401.
 */
export async function downloadMonthlyReport(year: number, month: number): Promise<void> {
  const baseURL = (apiClient.defaults.baseURL ?? '').replace(/\/$/, '');
  const apiUrl = `${baseURL}/reports/monthly?year=${year}&month=${month}`;
  const fileName = `vittio_report_${year}_${String(month).padStart(2, '0')}.pdf`;

  let file: Awaited<ReturnType<typeof download>>;
  try {
    file = await download(apiUrl, fileName);
  } catch (err) {
    // Access tokens live 15 minutes; this request bypasses the axios refresh
    // interceptor, so refresh by hand and retry once.
    if (!String(err).includes('401')) throw err;
    const { useAuthStore } = await import('../stores/authStore');
    await useAuthStore.getState().refreshTokens();
    file = await download(apiUrl, fileName);
  }

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is unavailable on this platform');
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Vittio Monthly Report',
    UTI: 'com.adobe.pdf',
  });
}

async function download(apiUrl: string, fileName: string) {
  const accessToken = await tokenStorage.getAccessToken();

  return File.downloadFileAsync(apiUrl, new File(Paths.cache, fileName), {
    headers: { Authorization: `Bearer ${accessToken ?? ''}` },
    idempotent: true,
  });
}

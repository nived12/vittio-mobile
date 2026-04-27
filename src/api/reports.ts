import * as Sharing from 'expo-sharing';
import { Linking } from 'react-native';
import { tokenStorage } from '../utils/tokenStorage';

/**
 * Download monthly PDF report and open the native share sheet.
 * Falls back to opening a browser URL if the device can't share.
 */
export async function downloadMonthlyReport(year: number, month: number): Promise<void> {
  const accessToken = await tokenStorage.getAccessToken();

  const baseURL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1').replace(/\/$/, '');
  const apiUrl = `${baseURL}/reports/monthly?year=${year}&month=${month}`;

  // Download PDF to a temp file then share it
  const fileName = `vittio_report_${year}_${String(month).padStart(2, '0')}.pdf`;

  try {
    // Dynamic import to avoid TypeScript version conflicts
    const FileSystem = await import('expo-file-system');
    const cacheDir: string = (FileSystem as any).cacheDirectory as string ?? '';
    const fileUri = `${cacheDir}${fileName}`;

    const downloadResult = await (FileSystem as any).downloadAsync(apiUrl, fileUri, {
      headers: { Authorization: `Bearer ${accessToken ?? ''}` },
    });

    if (downloadResult.status !== 200) {
      throw new Error(`HTTP ${downloadResult.status}`);
    }

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(downloadResult.uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Vittio Monthly Report',
        UTI: 'com.adobe.pdf',
      });
      return;
    }
  } catch {
    // Fall through to browser fallback
  }

  // Fallback: open in browser (simulator / web)
  await Linking.openURL(apiUrl);
}

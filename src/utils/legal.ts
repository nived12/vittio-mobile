import { Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import i18n from '../i18n';

// Derive legal doc base from the API URL so dev and prod resolve automatically.
// Dev:  http://192.168.86.38:3000/api/v1  → http://192.168.86.38:3000/legal/*
// Prod: https://app.vitt.io/api/v1        → https://app.vitt.io/legal/*
const apiUrl = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3000/api/v1';
const legalBase = apiUrl.replace(/\/api\/v1\/?$/, '');

export const LEGAL_URLS = {
  terms: `${legalBase}/legal/terms`,
  privacy: `${legalBase}/legal/privacy`,
  financial: `${legalBase}/legal/financial_data`,
};

// openBrowserAsync, not Linking.openURL: openURL hands the URL to an external
// browser and rejects when the device has none available (Safari disabled by
// Screen Time, or an MDM restriction). Three users hit exactly that on signup
// and saw nothing happen at all.
export async function openLegalDoc(url: string): Promise<void> {
  try {
    await WebBrowser.openBrowserAsync(url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
    });
  } catch {
    Alert.alert(i18n.t('consent.openFailedTitle'), i18n.t('consent.openFailedMessage', { url }));
  }
}

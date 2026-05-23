import { Linking } from 'react-native';

const ALLOWED_SCHEMES = ['http:', 'https:', 'mailto:'];

export function safeOpenUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!ALLOWED_SCHEMES.includes(parsed.protocol)) return false;
    Linking.openURL(url).catch(() => {});
    return true;
  } catch {
    return false;
  }
}

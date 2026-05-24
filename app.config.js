// Dynamic Expo config — read at build time. Supports per-developer overrides via env vars.
// Apple Team ID:
//   - Each Apple Developer account has its own Team ID (10-char alphanumeric, public, not a secret).
//   - Other contributors should set APPLE_TEAM_ID in their .env.local to sign with their own team.
//   - Default falls back to the owner's team so solo builds keep working.

module.exports = () => ({
  expo: {
    name: 'Vittio',
    slug: 'vittio',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/images/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      bundleIdentifier: 'io.vitt.app',
      appleTeamId: process.env.APPLE_TEAM_ID ?? '9Y84K3A2BJ',
      supportsTablet: false,
      associatedDomains: ['applinks:app.vitt.io'],
      entitlements: {
        'keychain-access-groups': ['$(AppIdentifierPrefix)io.vitt.app'],
      },
    },
    android: {
      package: 'io.vitt.app',
      permissions: [
        'android.permission.INTERNET',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.RECORD_AUDIO',
        'android.permission.USE_BIOMETRIC',
        'android.permission.USE_FINGERPRINT',
        'android.permission.VIBRATE',
      ],
      blockedPermissions: [
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.SYSTEM_ALERT_WINDOW',
      ],
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#4f46e5',
      },
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [{ scheme: 'https', host: 'app.vitt.io' }],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/favicon.png',
    },
    scheme: 'vittio',
    plugins: [
      'expo-router',
      'expo-secure-store',
      'expo-system-ui',
      [
        'expo-splash-screen',
        {
          backgroundColor: '#4f46e5',
          image: './assets/images/splash.png',
          resizeMode: 'contain',
        },
      ],
      '@react-native-community/datetimepicker',
      [
        '@react-native-voice/voice',
        {
          microphonePermission:
            'Vittio necesita acceso al micrófono para registrar transacciones por voz.',
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/images/notification-icon.png',
          color: '#4f46e5',
          iosDisplayInForeground: true,
        },
      ],
      'expo-web-browser',
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      eas: {
        projectId: '13d18490-59b1-4dfc-9fd0-99d6f55978e5',
      },
    },
  },
});

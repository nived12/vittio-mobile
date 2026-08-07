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
    // Splash configured via the expo-splash-screen plugin below (SDK 50+).
    // The legacy root-level `splash` block was deprecated and caused a
    // conflicting white background to render on Android.
    ios: {
      bundleIdentifier: 'io.vitt.app',
      appleTeamId: process.env.APPLE_TEAM_ID ?? '9Y84K3A2BJ',
      supportsTablet: false,
      usesAppleSignIn: true,
      associatedDomains: ['applinks:app.vitt.io'],
      entitlements: {
        'keychain-access-groups': ['$(AppIdentifierPrefix)io.vitt.app'],
      },
      infoPlist: {
        // Export-compliance self-declaration: the app uses only standard
        // encryption exempt under US export rules (HTTPS/TLS, OS keychain).
        // Setting this skips the manual encryption question on every
        // TestFlight/App Store upload.
        ITSAppUsesNonExemptEncryption: false,
      },
      // iOS 17+ Privacy Manifest (required for App Store submission).
      // Declares which required-reason APIs we access and why.
      // Reason codes are from Apple's documented list:
      // https://developer.apple.com/documentation/bundleresources/privacy_manifest_files/describing_use_of_required_reason_api
      privacyManifests: {
        NSPrivacyTracking: false,
        NSPrivacyTrackingDomains: [],
        NSPrivacyCollectedDataTypes: [
          {
            // RevenueCat records the subscription purchase and links it to the
            // Vittio user id so entitlements survive reinstall and restore.
            NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypePurchaseHistory',
            NSPrivacyCollectedDataTypeLinked: true,
            NSPrivacyCollectedDataTypeTracking: false,
            NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
          },
          {
            // app_user_id is the Vittio user id — required to match a purchase
            // to the account that made it.
            NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeUserID',
            NSPrivacyCollectedDataTypeLinked: true,
            NSPrivacyCollectedDataTypeTracking: false,
            NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
          },
        ],
        NSPrivacyAccessedAPITypes: [
          {
            // UserDefaults — used by React Native AsyncStorage and Expo libs
            NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
            NSPrivacyAccessedAPITypeReasons: ['CA92.1'],
          },
          {
            // File timestamp — used by expo-file-system and image processing
            NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp',
            NSPrivacyAccessedAPITypeReasons: ['C617.1'],
          },
          {
            // System boot time — used by networking + crash reporting libs (Sentry)
            NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategorySystemBootTime',
            NSPrivacyAccessedAPITypeReasons: ['35F9.1'],
          },
          {
            // Disk space — used by file-system libs to check available space
            NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryDiskSpace',
            NSPrivacyAccessedAPITypeReasons: ['85F4.1'],
          },
        ],
      },
    },
    android: {
      package: 'io.vitt.app',
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
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
      './plugins/withJetifier',
      './plugins/withRecognitionServiceQuery',
      [
        'expo-build-properties',
        {
          ios: {
            // expo-speech-recognition requires iOS 16.4+; raise the floor so
            // its pod autolinks instead of being silently dropped.
            deploymentTarget: '16.4',
          },
        },
      ],
      [
        '@sentry/react-native',
        {
          organization: 'vittio',
          project: 'vittio-mobile',
        },
      ],
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
        'expo-speech-recognition',
        {
          microphonePermission:
            'Vittio necesita acceso al micrófono para registrar transacciones por voz.',
          speechRecognitionPermission:
            'Vittio necesita acceso al reconocimiento de voz para registrar transacciones.',
        },
      ],
      [
        'expo-image-picker',
        {
          cameraPermission:
            'Vittio necesita acceso a la cámara para escanear recibos y comprobantes.',
          photosPermission:
            'Vittio necesita acceso a tus fotos para adjuntar recibos y comprobantes.',
        },
      ],
      [
        'expo-local-authentication',
        {
          faceIDPermission:
            'Vittio usa Face ID para proteger el acceso a tu información financiera.',
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
      'expo-apple-authentication',
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

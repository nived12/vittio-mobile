// Required on Android 11+ (API 30+): without this <queries> entry, the system
// hides the speech recognition service from the app. SpeechRecognizer then
// synthesizes ERROR_CLIENT (5) immediately on startListening(). The
// @react-native-voice/voice Expo plugin does NOT add this — it only handles
// the RECORD_AUDIO permission string.
const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withRecognitionServiceQuery(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest.queries = manifest.queries || [];

    const hasIt = manifest.queries.some((q) =>
      (q.intent || []).some((i) =>
        (i.action || []).some(
          (a) => a.$['android:name'] === 'android.speech.RecognitionService',
        ),
      ),
    );

    if (!hasIt) {
      manifest.queries.push({
        intent: [
          {
            action: [{ $: { 'android:name': 'android.speech.RecognitionService' } }],
          },
        ],
      });
    }

    return cfg;
  });
};

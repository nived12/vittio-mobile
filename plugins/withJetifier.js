const { withGradleProperties } = require('@expo/config-plugins');

// @react-native-voice/voice hard-codes com.android.support:appcompat-v7:28.0.0,
// the pre-AndroidX support library. It collides with androidx.core (duplicate
// classes + manifest merge conflict). Jetifier rewrites those legacy references
// to AndroidX at build time, removing the legacy artifacts entirely.
module.exports = function withJetifier(config) {
  return withGradleProperties(config, (cfg) => {
    const setProp = (key, value) => {
      const existing = cfg.modResults.find(
        (item) => item.type === 'property' && item.key === key,
      );
      if (existing) {
        existing.value = value;
      } else {
        cfg.modResults.push({ type: 'property', key, value });
      }
    };
    setProp('android.enableJetifier', 'true');
    return cfg;
  });
};

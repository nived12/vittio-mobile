module.exports = function (api) {
  api.cache(true);
  const isProduction = api.env('production');
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
      ...(isProduction ? [['transform-remove-console', { exclude: ['error'] }]] : []),
    ],
  };
};

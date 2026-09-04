const { withGradleProperties } = require('@expo/config-plugins');

module.exports = function withSuppressSdk(config) {
  return withGradleProperties(config, (config) => {
    config.modResults.push({
      type: 'property',
      key: 'android.suppressUnsupportedCompileSdk',
      value: '37.0',
    });
    return config;
  });
};


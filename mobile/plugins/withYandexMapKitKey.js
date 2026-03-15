const { withAndroidManifest } = require('@expo/config-plugins');
const { getMainApplication, addMetaDataItemToMainApplication } = require('@expo/config-plugins/build/android/Manifest');

const YANDEX_MAPS_API_KEY_META = 'com.yandex.maps.apikey';

function withYandexMapKitKey(config) {
  return withAndroidManifest(config, (config) => {
    const apiKey = (config.extra?.yandexMapkitApiKey || '').trim();
    const mainApplication = getMainApplication(config.modResults) || config.modResults?.manifest?.application?.[0];
    if (!mainApplication) return config;
    if (apiKey && apiKey.trim()) {
      addMetaDataItemToMainApplication(mainApplication, YANDEX_MAPS_API_KEY_META, apiKey.trim());
    }
    return config;
  });
}

module.exports = withYandexMapKitKey;

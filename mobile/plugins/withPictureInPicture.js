/**
 * Добавляет поддержку Picture-in-Picture (картинка в картинке) для Android.
 * Требуется Google Play для приложений, использующих видео (expo-image-picker, WebView и т.д.)
 */
const { withAndroidManifest } = require('@expo/config-plugins');
const { getRunnableActivity } = require('@expo/config-plugins/build/android/Manifest');

function withPictureInPicture(config) {
  return withAndroidManifest(config, (config) => {
    const mainActivity = getRunnableActivity(config.modResults);
    if (!mainActivity?.$) return config;

    mainActivity.$['android:supportsPictureInPicture'] = 'true';
    const configChanges = mainActivity.$['android:configChanges'] || '';
    if (configChanges && !configChanges.includes('smallestScreenSize')) {
      mainActivity.$['android:configChanges'] = configChanges + '|smallestScreenSize';
    }
    return config;
  });
}

module.exports = withPictureInPicture;

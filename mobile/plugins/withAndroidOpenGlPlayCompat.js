/**
 * Снижает отсев устройств в Google Play по причине OpenGL ES:
 * зависимости (Яндекс MapKit и др.) могут подмешивать GLES/AEP как обязательные.
 * Явно помечаем поддержку графики как необязательную для установки (карты по-прежнему
 * требуют рабочий GPU на практике; без GLES 2+ приложение может не отрисовать карту).
 */
const { withAndroidManifest } = require('@expo/config-plugins');
const Manifest = require('@expo/config-plugins/build/android/Manifest');

function withAndroidOpenGlPlayCompat(config) {
  return withAndroidManifest(config, (config) => {
    const doc = config.modResults;
    Manifest.ensureToolsAvailable(doc);

    const root = doc.manifest;
    if (!root['uses-feature']) {
      root['uses-feature'] = [];
    }
    const features = Array.isArray(root['uses-feature'])
      ? root['uses-feature']
      : [root['uses-feature']];

    const hasGles2 = features.some((f) => f?.$?.['android:glEsVersion'] === '0x00020000');
    if (!hasGles2) {
      features.push({
        $: {
          'android:glEsVersion': '0x00020000',
          'android:required': 'false',
        },
      });
    }

    const hasAepOptional = features.some(
      (f) => f?.$?.['android:name'] === 'android.hardware.opengles.aep'
    );
    if (!hasAepOptional) {
      features.push({
        $: {
          'android:name': 'android.hardware.opengles.aep',
          'android:required': 'false',
        },
      });
    }

    root['uses-feature'] = features;
    return config;
  });
}

module.exports = withAndroidOpenGlPlayCompat;

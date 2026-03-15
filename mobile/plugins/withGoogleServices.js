/**
 * Подключает Google Services plugin для Firebase (FCM) в Android.
 * Нужен для инициализации Firebase и работы push-уведомлений.
 * В app.config.js должен быть указан android.googleServicesFile (путь к google-services.json).
 */
const { withProjectBuildGradle, withAppBuildGradle } = require('@expo/config-plugins');

const GOOGLE_SERVICES_CLASSPATH = "classpath('com.google.gms:google-services:4.4.2')";

function withGoogleServices(config) {
  config = withProjectBuildGradle(config, (config) => {
    const contents = config.modResults.contents;
    if (contents.includes('com.google.gms:google-services')) return config;
    config.modResults.contents = contents.replace(
      /(dependencies \{\s*)(classpath\('com\.android\.tools\.build:gradle')/,
      `$1${GOOGLE_SERVICES_CLASSPATH}\n    $2`
    );
    return config;
  });

  config = withAppBuildGradle(config, (config) => {
    const contents = config.modResults.contents;
    if (contents.includes("com.google.gms.google-services")) return config;
    config.modResults.contents = contents.trimEnd() + "\n\napply plugin: 'com.google.gms.google-services'\n";
    return config;
  });

  return config;
}

module.exports = withGoogleServices;

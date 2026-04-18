// Два приложения из одного кода: клиент и владелец
// Запуск: EXPO_PUBLIC_APP_VARIANT=owner npx expo start  или  npx expo start  (клиент по умолчанию)
// Для теста на реальном устройстве: EXPO_PUBLIC_API_URL=http://192.168.x.x:3000 npx expo start
const path = require('path');
const fs = require('fs');
const variant = process.env.EXPO_PUBLIC_APP_VARIANT || 'client';
const isOwner = variant === 'owner';
// Файлы Firebase: можно использовать отдельные для client/owner или один объединённый
const googleServicesClient = path.join(__dirname, 'google-services-client.json');
const googleServicesOwner = path.join(__dirname, 'google-services-owner.json');
const googleServicesMerged = path.join(__dirname, 'google-services.json');
const googleServicesFile = isOwner
  ? (fs.existsSync(googleServicesOwner) ? './google-services-owner.json' : fs.existsSync(googleServicesMerged) ? './google-services.json' : null)
  : (fs.existsSync(googleServicesClient) ? './google-services-client.json' : fs.existsSync(googleServicesMerged) ? './google-services.json' : null);
const hasGoogleServices = !!googleServicesFile;
const versionCodesPath = path.join(__dirname, 'version-codes.json');

function getAndroidVersionCode() {
  try {
    const raw = fs.readFileSync(versionCodesPath, 'utf8');
    const parsed = JSON.parse(raw);
    const v = isOwner ? parsed.owner : parsed.client;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : 1;
  } catch (_) {
    return 1;
  }
}

export default {
  expo: {
    name: isOwner ? 'ONTHEWATER для владельцев' : 'ONTHEWATER',
    slug: isOwner ? 'boatrent-owner' : 'onthewater', // для EAS (projectId) должен совпадать с slug проекта на expo.dev
    owner: 'sadfary',
    version: '2.0.1',
    // default — без жёсткой блокировки ориентации (требование Google Play для Android 16 и планшетов).
    orientation: 'default',
    icon: isOwner ? './assets/icon-owner.png' : './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: isOwner ? './assets/splash-owner.png' : './assets/splash.png',
      resizeMode: 'cover',
      backgroundColor: isOwner ? '#0a6e82' : '#1B365D',
    },
    ios: {
      supportsTablet: true,
      infoPlist: {
        LSApplicationQueriesSchemes: ['yandexmaps', 'yandexnavi'],
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: isOwner ? './assets/adaptive-icon-owner.png' : './assets/adaptive-icon.png',
        backgroundColor: isOwner ? '#0a6e82' : '#ffffff',
      },
      package: isOwner ? 'com.anonymous.onthewater.owner' : 'com.anonymous.onthewater',
      versionCode: getAndroidVersionCode(),
      // Отключение edge-to-edge (официальное поле Expo SDK 54 — `edgeToEdgeEnabled`; `enableEdgeToEdge` не подхватывается prebuild).
      // Снижает предупреждения Play об устаревших Window API на Android 15. На Android 16+ edge-to-edge станет обязательным.
      edgeToEdgeEnabled: false,
      ...(hasGoogleServices && { googleServicesFile }),
    },
    config: {
      googleMaps: { apiKey: 'YOUR_YANDEX_MAPS_OR_GOOGLE_MAPS_API_KEY_HERE' },
    },
    // Ключи Яндекс: MapKit — карты, Geosuggest — подсказки городов. В developer.tech.yandex.com включите нужные интерфейсы для ключа.
    extra: {
      appVariant: variant,
      appmetricaApiKey: isOwner
        ? (process.env.EXPO_PUBLIC_APPMETRICA_API_KEY_OWNER || '')
        : (process.env.EXPO_PUBLIC_APPMETRICA_API_KEY || ''),
      yandexMapkitApiKey: process.env.EXPO_PUBLIC_YANDEX_MAPKIT_API_KEY || '84448445-01d9-454b-8398-9adaaf19ad61',
      yandexGeosuggestApiKey: process.env.EXPO_PUBLIC_YANDEX_GEO_SUGGEST_API_KEY || '5cf2910a-9463-4be8-a6c9-81c7f5f0abef',
      // Для push на APK (не Expo Go) обязателен Expo projectId. Взять: https://expo.dev → проект → Project ID
      eas: {
        projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID || '1458b8bd-8918-409a-b2fa-75d6be05ccde', // Expo Project ID для push на APK
      },
    },
    permissions: ['android.permission.RECORD_AUDIO'],
    web: { favicon: './assets/favicon.png' },
    plugins: [
      './plugins/withAndroidSigning.js',
      './plugins/withAndroidOpenGlPlayCompat.js',
      './plugins/withYandexMapKitKey.js',
      ...(hasGoogleServices ? ['./plugins/withGoogleServices.js'] : []),
      [
        'expo-build-properties',
        {
          android: {
            minSdkVersion: 26,
            usesCleartextTraffic: true,
            // Target Android 15 (API 35) — требуется Google Play с 31.08.2025 и для поддержки страниц памяти 16 КБ.
            // NDK r28+ задаётся в android/gradle.properties (android.ndkVersion) и android/build.gradle — не только compileSdk.
            compileSdkVersion: 35,
            targetSdkVersion: 35,
            buildToolsVersion: '35.0.0',
            // R8: минификация + obfuscation → нужен mapping.txt для Google Play (деобфускация стеков).
            enableMinifyInReleaseBuilds: true,
            // Правила вне android/ — иначе prebuild --clean затрёт правки в proguard-rules.pro
            extraProguardRules: `
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }
-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep @com.facebook.proguard.annotations.DoNotStrip class *
-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
}
-keep @com.facebook.proguard.annotations.DoNotStripAny class * {
    *;
}
-keep @com.facebook.jni.annotations.DoNotStrip class *
-keepclassmembers class * {
    @com.facebook.jni.annotations.DoNotStrip *;
}
-keep @com.facebook.jni.annotations.DoNotStripAny class * {
    *;
}
-keep class * implements com.facebook.react.bridge.JavaScriptModule { *; }
-keep class * implements com.facebook.react.bridge.NativeModule { *; }
-keepclassmembers,includedescriptorclasses class * { native <methods>; }
-keepclassmembers class * { @com.facebook.react.uimanager.annotations.ReactProp <methods>; }
-keepclassmembers class * { @com.facebook.react.uimanager.annotations.ReactPropGroup <methods>; }
-dontwarn com.facebook.react.**
-keep,includedescriptorclasses class com.facebook.react.bridge.** { *; }
-keep,includedescriptorclasses class com.facebook.react.turbomodule.core.** { *; }
-keep,includedescriptorclasses class com.facebook.react.internal.turbomodule.core.** { *; }
-keep class com.facebook.jni.** { *; }
-keep,allowobfuscation @interface com.facebook.yoga.annotations.DoNotStrip
-keep @com.facebook.yoga.annotations.DoNotStrip class *
-keepclassmembers class * {
    @com.facebook.yoga.annotations.DoNotStrip *;
}
-dontwarn okio.**
-keep class expo.modules.** { *; }
`.trim(),
            // useLegacyPackaging: false — по умолчанию; современная упаковка .so нужна для 16 КБ.
          },
        },
      ],
      ['expo-notifications', { icon: isOwner ? './assets/icon-owner.png' : './assets/icon.png', color: isOwner ? '#0a6e82' : '#1B365D', sounds: [] }],
      [
        'expo-image-picker',
        {
          photosPermission: 'Нам нужен доступ к галерее для загрузки фотографий катера.',
          colors: {
            cropToolbarColor: '#FFFFFF',
            cropToolbarIconColor: '#1a1a1a',
            cropToolbarActionTextColor: '#1a1a1a',
            cropBackButtonIconColor: '#1a1a1a',
            cropBackgroundColor: '#f5f5f5',
          },
          dark: {
            colors: {
              cropToolbarColor: '#FFFFFF',
              cropToolbarIconColor: '#1a1a1a',
              cropToolbarActionTextColor: '#1a1a1a',
              cropBackButtonIconColor: '#1a1a1a',
              cropBackgroundColor: '#f5f5f5',
            },
          },
        },
      ],
    ],
  },
};

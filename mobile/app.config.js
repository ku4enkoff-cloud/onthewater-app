// Два приложения из одного кода: клиент и владелец
// Запуск: EXPO_PUBLIC_APP_VARIANT=owner npx expo start  или  npx expo start  (клиент по умолчанию)
// Для теста на реальном устройстве: EXPO_PUBLIC_API_URL=http://192.168.x.x:3000 npx expo start
const path = require('path');
const fs = require('fs');
const variant = process.env.EXPO_PUBLIC_APP_VARIANT || 'client';
const isOwner = variant === 'owner';
const hasGoogleServices = fs.existsSync(path.join(__dirname, 'google-services.json'));

export default {
  expo: {
    name: isOwner ? 'ONTHEWATER для владельцев' : 'ONTHEWATER',
    slug: isOwner ? 'boatrent-owner' : 'onthewater', // для EAS (projectId) должен совпадать с slug проекта на expo.dev
    owner: 'sadfary',
    version: '2.0.0',
    orientation: 'portrait',
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
      ...(hasGoogleServices && { googleServicesFile: './google-services.json' }),
    },
    config: {
      googleMaps: { apiKey: 'YOUR_YANDEX_MAPS_OR_GOOGLE_MAPS_API_KEY_HERE' },
    },
    // Ключи Яндекс: MapKit — карты, Geosuggest — подсказки городов. В developer.tech.yandex.com включите нужные интерфейсы для ключа.
    extra: {
      appVariant: variant,
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
      './plugins/withYandexMapKitKey.js',
      ...(hasGoogleServices ? ['./plugins/withGoogleServices.js'] : []),
      ['expo-build-properties', { android: { minSdkVersion: 26, usesCleartextTraffic: true } }],
      ['expo-notifications', { icon: './assets/icon.png', color: '#1B365D', sounds: [] }],
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

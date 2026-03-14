// Два приложения из одного кода: клиент и владелец
// Запуск: EXPO_PUBLIC_APP_VARIANT=owner npx expo start  или  npx expo start  (клиент по умолчанию)
// Для теста на реальном устройстве: EXPO_PUBLIC_API_URL=http://192.168.x.x:3000 npx expo start
const variant = process.env.EXPO_PUBLIC_APP_VARIANT || 'client';
const isOwner = variant === 'owner';

export default {
  expo: {
    name: isOwner ? 'ONTHEWATER для владельцев' : 'ONTHEWATER',
    slug: isOwner ? 'boatrent-owner' : 'boatrent',
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
    },
    config: {
      googleMaps: { apiKey: 'YOUR_YANDEX_MAPS_OR_GOOGLE_MAPS_API_KEY_HERE' },
    },
    // Ключи Яндекс: MapKit — карты, Geosuggest — подсказки городов. В developer.tech.yandex.com включите нужные интерфейсы для ключа.
    extra: {
      appVariant: variant,
      yandexMapkitApiKey: process.env.EXPO_PUBLIC_YANDEX_MAPKIT_API_KEY || '84448445-01d9-454b-8398-9adaaf19ad61',
      yandexGeosuggestApiKey: process.env.EXPO_PUBLIC_YANDEX_GEO_SUGGEST_API_KEY || process.env.EXPO_PUBLIC_YANDEX_MAPKIT_API_KEY || '84448445-01d9-454b-8398-9adaaf19ad61',
    },
    permissions: ['android.permission.RECORD_AUDIO'],
    web: { favicon: './assets/favicon.png' },
    plugins: [
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

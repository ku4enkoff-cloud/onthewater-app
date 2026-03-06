// Два приложения из одного кода: клиент и владелец
// Запуск: EXPO_PUBLIC_APP_VARIANT=owner npx expo start  или  npx expo start  (клиент по умолчанию)
// Для теста на реальном устройстве: EXPO_PUBLIC_API_URL=http://192.168.x.x:3000 npx expo start
const variant = process.env.EXPO_PUBLIC_APP_VARIANT || 'client';
const isOwner = variant === 'owner';

export default {
  expo: {
    name: isOwner ? 'ONTHEWATER для владельцев' : 'ONTHEWATER',
    slug: isOwner ? 'boatrent-owner' : 'boatrent',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#1B365D',
    },
    ios: { supportsTablet: true },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      package: isOwner ? 'com.anonymous.onthewater.owner' : 'com.anonymous.onthewater',
    },
    config: {
      googleMaps: { apiKey: 'YOUR_YANDEX_MAPS_OR_GOOGLE_MAPS_API_KEY_HERE' },
    },
    permissions: ['android.permission.RECORD_AUDIO'],
    web: { favicon: './assets/favicon.png' },
    plugins: [
      ['expo-build-properties', { android: { minSdkVersion: 26, usesCleartextTraffic: true } }],
      [
        'expo-image-picker',
        {
          photosPermission: 'Нам нужен доступ к галерее для загрузки фотографий катера.',
          colors: {
            cropToolbarColor: '#FFFFFF',
            cropToolbarIconColor: '#1a1a1a',
            cropToolbarActionTextColor: '#1a1a1a',
            cropBackButtonIconColor: '#1a1a1a',
            cropBackgroundColor: '#f0f0f0',
          },
        },
      ],
    ],
    extra: { appVariant: variant },
  },
};

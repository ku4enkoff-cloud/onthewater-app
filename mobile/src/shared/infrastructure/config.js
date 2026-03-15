import { Platform } from 'react-native';
import Constants from 'expo-constants';

const PRODUCTION_API = 'https://api.onthewater.ru';

function getApiBase() {
    const envUrl = typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL;
    if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
        return envUrl.replace(/\/$/, '');
    }
    // Собранное приложение (release) — всегда продакшн API
    if (typeof __DEV__ !== 'undefined' && !__DEV__) {
        return PRODUCTION_API;
    }
    // Разработка: эмулятор Android достучится до бэкенда на ПК по 10.0.2.2
    if (Platform.OS === 'android') {
        return 'http://10.0.2.2:3000';
    }
    const debuggerHost = Constants.expoConfig?.hostUri
        ?? Constants.manifest?.debuggerHost
        ?? Constants.manifest2?.extra?.expoGo?.debuggerHost
        ?? '';
    const lanIp = debuggerHost.split(':')[0];
    if (lanIp) {
        return `http://${lanIp}:3000`;
    }
    return 'http://localhost:3000';
}

export const API_BASE = getApiBase();
export const SOCKET_URL = API_BASE;

/** URL для фото катера. После переноса бэкенда в БД могут быть старые полные URL — подменяем на текущий API. */
export function getPhotoUrl(src) {
    if (!src || typeof src !== 'string') return null;
    const s = src.trim();
    if (!s) return null;
    if (s.startsWith('file://')) return s;
    const uploadsMatch = s.match(/\/uploads\/[^?#]+/);
    if (uploadsMatch) return API_BASE + (uploadsMatch[0].startsWith('/') ? uploadsMatch[0] : '/' + uploadsMatch[0]);
    if (/^https?:\/\//i.test(s)) return s;
    return API_BASE + (s.startsWith('/') ? s : '/' + s);
}

if (__DEV__) {
    console.log('[API] Base URL:', API_BASE);
}

/** Yandex Geosuggest API key for city search (suggest-maps.yandex.ru). В консоли developer.tech.yandex.com включите «Геословарь» или «Suggest API» для ключа. */
export const YANDEX_GEO_SUGGEST_API_KEY =
    (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_YANDEX_GEO_SUGGEST_API_KEY) ||
    (typeof Constants !== 'undefined' && Constants.expoConfig?.extra?.yandexGeosuggestApiKey) ||
    '5cf2910a-9463-4be8-a6c9-81c7f5f0abef';

/** Yandex MapKit API key for map tiles. Get at https://developer.tech.yandex.com/ — включите «MapKit» для ключа и укажите пакет com.anonymous.onthewater. */
export const YANDEX_MAPKIT_API_KEY =
    (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_YANDEX_MAPKIT_API_KEY) ||
    (typeof Constants !== 'undefined' && Constants.expoConfig?.extra?.yandexMapkitApiKey) ||
    '84448445-01d9-454b-8398-9adaaf19ad61';

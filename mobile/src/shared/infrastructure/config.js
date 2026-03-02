import { Platform } from 'react-native';
import Constants from 'expo-constants';

function getApiBase() {
    const envUrl = typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL;
    if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
        return envUrl.replace(/\/$/, '');
    }
    // Эмулятор Android достучится до бэкенда на ПК только по 10.0.2.2 (хост), не по LAN IP
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

/** Yandex Geosuggest API key for city search. Get at https://developer.tech.yandex.com/ */
export const YANDEX_GEO_SUGGEST_API_KEY =
    (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_YANDEX_GEO_SUGGEST_API_KEY) || '';

import { Platform } from 'react-native';
import Constants from 'expo-constants';

function getApiBase() {
    const envUrl = typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL;
    if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
        return envUrl.replace(/\/$/, '');
    }
    const debuggerHost = Constants.expoConfig?.hostUri
        ?? Constants.manifest?.debuggerHost
        ?? Constants.manifest2?.extra?.expoGo?.debuggerHost
        ?? '';
    const lanIp = debuggerHost.split(':')[0];

    if (Platform.OS === 'android' && !lanIp) {
        return 'http://10.0.2.2:3000';
    }
    if (lanIp) {
        return `http://${lanIp}:3000`;
    }
    return 'http://localhost:3000';
}

export const API_BASE = getApiBase();
export const SOCKET_URL = API_BASE;

/** Yandex Geosuggest API key for city search. Get at https://developer.tech.yandex.com/ */
export const YANDEX_GEO_SUGGEST_API_KEY =
    (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_YANDEX_GEO_SUGGEST_API_KEY) || '';

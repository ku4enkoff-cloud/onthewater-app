import { Platform } from 'react-native';

function getApiBase() {
    const envUrl = typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL;
    if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
        return envUrl.replace(/\/$/, '');
    }
    const isSimulator = Platform.OS === 'ios' || Platform.OS === 'android';
    return isSimulator && Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
}

export const API_BASE = getApiBase();
export const SOCKET_URL = API_BASE;

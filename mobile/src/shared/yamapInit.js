import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { YANDEX_MAPKIT_API_KEY } from './infrastructure/config';

let initPromise = null;

function canInitNativeMapKit() {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return false;
    if (Constants.appOwnership === 'expo') return false;
    return true;
}

/**
 * MapKit должен быть инициализирован до первого рендера карты (особенно iOS / TestFlight).
 * Повторные вызовы возвращают тот же Promise.
 */
export function ensureYamapInitialized() {
    if (!canInitNativeMapKit()) {
        return Promise.resolve(false);
    }
    if (initPromise) return initPromise;

    initPromise = (async () => {
        const key = YANDEX_MAPKIT_API_KEY && String(YANDEX_MAPKIT_API_KEY).trim();
        if (!key) {
            if (__DEV__) console.warn('[YaMap] missing EXPO_PUBLIC_YANDEX_MAPKIT_API_KEY');
            return false;
        }
        const { YamapInstance } = require('react-native-yamap-plus');
        await YamapInstance.init(key);
        try {
            await YamapInstance.setLocale('ru_RU');
        } catch (_) {
            // locale optional if native plugin already set ru_RU in AppDelegate
        }
        return true;
    })().catch((err) => {
        initPromise = null;
        console.warn('[YaMap] init failed:', err?.message || err);
        return false;
    });

    return initPromise;
}

export function isYamapInitStarted() {
    return initPromise != null;
}

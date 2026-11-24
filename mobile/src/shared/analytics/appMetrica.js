import { Platform } from 'react-native';
import Constants from 'expo-constants';

let activated = false;

export function initAppMetrica() {
    if (activated) return;
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') return;
    if (Constants.appOwnership === 'expo') return;

    const appmetricaKey = Constants.expoConfig?.extra?.appmetricaApiKey;
    if (!appmetricaKey || !String(appmetricaKey).trim()) return;

    try {
        const AppMetrica = require('@appmetrica/react-native-analytics').default;
        AppMetrica.activate({
            apiKey: String(appmetricaKey).trim(),
            sessionTimeout: 120,
            logs: typeof __DEV__ !== 'undefined' && __DEV__,
        });
        activated = true;
    } catch (e) {
        console.warn('[AppMetrica]', e?.message || e);
    }
}

/** Событие для конверсии AppMetrica / Директа. Имя должно совпасть с событием в кабинете. */
export function reportAppEvent(name) {
    if (!name) return;
    initAppMetrica();
    try {
        const AppMetrica = require('@appmetrica/react-native-analytics').default;
        if (typeof AppMetrica?.reportEvent === 'function') {
            AppMetrica.reportEvent(String(name));
        }
    } catch (e) {
        console.warn('[AppMetrica]', e?.message || e);
    }
}

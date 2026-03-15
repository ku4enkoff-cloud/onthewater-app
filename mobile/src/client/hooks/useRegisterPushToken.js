import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { api } from '../../shared/infrastructure/api';

// expo-notifications не поддерживается в Expo Go (SDK 53+). Загружаем только для development build.
const isExpoGo = Constants.appOwnership === 'expo';

/**
 * Один раз зарегистрировать push-токен на сервере (можно вызвать при нажатии «Тестовое уведомление»).
 * Возвращает true, если токен успешно отправлен, false иначе.
 */
export async function registerPushTokenNow() {
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') return false;
    if (isExpoGo) return false;
    if (!Device.isDevice) return false;
    try {
        const Notifications = require('expo-notifications');
        const { status: existing } = await Notifications.getPermissionsAsync();
        let finalStatus = existing;
        if (existing !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') return false;
        const tokenData = await Notifications.getExpoPushTokenAsync();
        const token = tokenData?.data;
        if (!token) return false;
        await api.post('/auth/push-token', { push_token: token });
        return true;
    } catch (e) {
        if (__DEV__) console.warn('[push] registerPushTokenNow error:', e?.message || e);
        return false;
    }
}

/**
 * Регистрирует Expo Push Token на сервере (клиент и владелец).
 * Учитывает pushEnabled: если false — токен на сервере очищается.
 * В Expo Go пропускается без ошибки (push работает только в development build).
 */
export function useRegisterPushToken(user, pushEnabled) {
    const lastTokenRef = useRef(null);

    useEffect(() => {
        if (!user || Platform.OS !== 'android' && Platform.OS !== 'ios') return;
        if (pushEnabled === undefined || pushEnabled === null) return;
        if (isExpoGo) return; // Expo Go — push не поддерживается, не грузим expo-notifications

        let cancelled = false;
        (async () => {
            try {
                if (pushEnabled === false) {
                    lastTokenRef.current = null;
                    await api.post('/auth/push-token', { push_token: '' });
                    return;
                }
                if (!Device.isDevice) return;
                const Notifications = require('expo-notifications');
                const { status: existing } = await Notifications.getPermissionsAsync();
                let finalStatus = existing;
                if (existing !== 'granted') {
                    const { status } = await Notifications.requestPermissionsAsync();
                    finalStatus = status;
                }
                if (finalStatus !== 'granted') return;
                const tokenData = await Notifications.getExpoPushTokenAsync();
                const token = tokenData?.data;
                if (!token || cancelled) return;
                if (token === lastTokenRef.current) return;
                lastTokenRef.current = token;
                await api.post('/auth/push-token', { push_token: token });
            } catch (e) {
                if (__DEV__) console.warn('[push] register error:', e?.message || e);
            }
        })();
        return () => { cancelled = true; };
    }, [user?.id, pushEnabled]);
}

import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { api } from '../../shared/infrastructure/api';

// expo-notifications не поддерживается в Expo Go (SDK 53+). Загружаем только для development build.
const isExpoGo = Constants.appOwnership === 'expo';

/**
 * Один раз зарегистрировать push-токен на сервере (можно вызвать при нажатии «Тестовое уведомление»).
 * Возвращает { ok: true } или { ok: false, reason: '...' } для показа пользователю.
 */
export async function registerPushTokenNow() {
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
        return { ok: false, reason: 'Push только на Android и iOS.' };
    }
    if (isExpoGo) {
        return { ok: false, reason: 'В Expo Go push не работает. Соберите и установите APK (npm run build:client:release), затем откройте приложение из списка приложений.' };
    }
    if (!Device.isDevice) {
        return { ok: false, reason: 'Запустите приложение на реальном устройстве, не в эмуляторе.' };
    }
    try {
        const Notifications = require('expo-notifications');
        const { status: existing } = await Notifications.getPermissionsAsync();
        let finalStatus = existing;
        if (existing !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            return { ok: false, reason: 'Нет разрешения на уведомления. Включите в Настройки → Приложения → ONTHEWATER → Уведомления.' };
        }
        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        if (!projectId) {
            return { ok: false, reason: 'Не задан Expo projectId. Добавьте в app.config.js (extra.eas.projectId) или переменную EXPO_PUBLIC_EAS_PROJECT_ID. Получить: expo.dev → ваш проект → Project ID или команда eas init. См. mobile/PUSH_SETUP.md' };
        }
        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
        const token = tokenData?.data;
        if (!token) {
            return { ok: false, reason: 'Не удалось получить push-токен. Для Android добавьте google-services.json из Firebase в папку mobile/ и пересоберите APK. Подробно: mobile/PUSH_SETUP.md' };
        }
        await api.post('/auth/push-token', { push_token: token });
        return { ok: true };
    } catch (e) {
        const msg = e?.message || '';
        const status = e?.response?.status;
        if (status === 401) {
            return { ok: false, reason: 'Выполните вход заново и попробуйте снова.' };
        }
        if (e?.response?.data?.error) {
            return { ok: false, reason: e.response.data.error };
        }
        if (msg.includes('Network') || msg.includes('network') || status >= 500) {
            return { ok: false, reason: 'Нет связи с сервером. Проверьте интернет и попробуйте позже.' };
        }
        if (__DEV__) console.warn('[push] registerPushTokenNow error:', e?.message || e);
        return { ok: false, reason: msg || 'Ошибка регистрации. Попробуйте перезапустить приложение.' };
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
                const projectId = Constants.expoConfig?.extra?.eas?.projectId;
                if (!projectId) return;
                const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
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

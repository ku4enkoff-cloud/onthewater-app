import { useEffect, useRef } from 'react';
import { Platform, AppState } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { api } from '../../shared/infrastructure/api';

const isExpoGo = Constants.appOwnership === 'expo';

function getNotificationsModule() {
    if (isExpoGo) return null;
    try {
        return require('expo-notifications');
    } catch {
        return null;
    }
}

async function ensurePermissionAndRegister(lastTokenRef, isCancelled) {
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
        return { ok: false, reason: 'Push только на Android и iOS.' };
    }
    if (isExpoGo) {
        return { ok: false, reason: 'В Expo Go push не работает. Установите сборку из App Store / TestFlight.' };
    }
    if (!Device.isDevice) {
        return { ok: false, reason: 'Запустите приложение на реальном устройстве, не в эмуляторе.' };
    }

    const Notifications = getNotificationsModule();
    if (!Notifications) {
        return { ok: false, reason: 'Модуль уведомлений недоступен.' };
    }

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
        const req = await Notifications.requestPermissionsAsync();
        status = req.status;
    }
    if (status !== 'granted') {
        return { ok: false, reason: 'Нет разрешения на уведомления. Включите в Настройки → ONTHEWATER → Уведомления.' };
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
        return { ok: false, reason: 'Не задан Expo projectId (extra.eas.projectId). См. mobile/PUSH_SETUP.md' };
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData?.data;
    if (!token) {
        return { ok: false, reason: 'Не удалось получить push-токен. Перезапустите приложение.' };
    }
    if (isCancelled?.()) {
        return { ok: false, reason: 'cancelled' };
    }
    if (token === lastTokenRef.current) {
        return { ok: true };
    }
    lastTokenRef.current = token;
    await api.post('/auth/push-token', { push_token: token });
    return { ok: true };
}

/**
 * Зарегистрировать push-токен на сервере (кнопка «Тестовое уведомление» / переключатель в профиле).
 */
export async function registerPushTokenNow() {
    const lastTokenRef = { current: null };
    try {
        return await ensurePermissionAndRegister(lastTokenRef, () => false);
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
        if (__DEV__) console.warn('[push] registerPushTokenNow error:', msg || e);
        return { ok: false, reason: msg || 'Ошибка регистрации. Попробуйте перезапустить приложение.' };
    }
}

/**
 * Авторегистрация Expo Push Token после входа.
 * pushLoaded — дождаться чтения @push_enabled из AsyncStorage.
 */
export function useRegisterPushToken(user, pushEnabled, pushLoaded) {
    const lastTokenRef = useRef(null);

    useEffect(() => {
        if (!user || !pushLoaded) return;
        if (Platform.OS !== 'android' && Platform.OS !== 'ios') return;
        if (isExpoGo) return;

        let cancelled = false;
        const isCancelled = () => cancelled;

        if (pushEnabled === false) {
            lastTokenRef.current = null;
            api.post('/auth/push-token', { push_token: '' }).catch(() => {});
            return () => { cancelled = true; };
        }
        if (pushEnabled !== true) return undefined;

        // Задержка: не пересекается с TermsAcceptModal и фиксом тапов на iPad после входа.
        const delayMs = user.terms_accepted_at ? 2000 : 4000;
        const timer = setTimeout(() => {
            ensurePermissionAndRegister(lastTokenRef, isCancelled).catch((e) => {
                if (__DEV__) console.warn('[push] auto-register error:', e?.message || e);
            });
        }, delayMs);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [user?.id, user?.terms_accepted_at, pushEnabled, pushLoaded]);

    useEffect(() => {
        if (!user || !pushLoaded || pushEnabled !== true || isExpoGo) return undefined;

        let cancelled = false;
        const sync = () => {
            ensurePermissionAndRegister(lastTokenRef, () => cancelled).catch(() => {});
        };

        const sub = AppState.addEventListener('change', (state) => {
            if (state === 'active') sync();
        });

        return () => {
            cancelled = true;
            sub.remove();
        };
    }, [user?.id, pushEnabled, pushLoaded]);
}

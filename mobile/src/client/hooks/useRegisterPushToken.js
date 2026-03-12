import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { api } from '../../shared/infrastructure/api';

/**
 * Регистрирует Expo Push Token на сервере для клиента.
 * Вызывать только при авторизованном user (role=client).
 * Push-уведомления работают только в development build, не в Expo Go.
 */
export function useRegisterPushToken(user) {
    const lastTokenRef = useRef(null);

    useEffect(() => {
        if (!user || Platform.OS !== 'android' && Platform.OS !== 'ios') return;

        let cancelled = false;
        (async () => {
            try {
                if (!Device.isDevice) return; // Эмулятор — Expo Push не поддерживается
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
    }, [user?.id]);
}

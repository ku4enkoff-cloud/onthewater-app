import React, { createContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../infrastructure/api';

const PUSH_ENABLED_KEY = '@push_enabled';

export const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
    const [pushEnabled, setPushEnabledState] = useState(null); // null = ещё не загружено
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        let cancelled = false;
        AsyncStorage.getItem(PUSH_ENABLED_KEY)
            .then((v) => {
                if (!cancelled) {
                    setPushEnabledState(v === '0' || v === 'false' ? false : true);
                    setLoaded(true);
                }
            })
            .catch(() => {
                if (!cancelled) setLoaded(true);
            });
        return () => { cancelled = true; };
    }, []);

    const setPushEnabled = useCallback(async (value) => {
        setPushEnabledState(value);
        await AsyncStorage.setItem(PUSH_ENABLED_KEY, value ? '1' : '0');
        if (!value) {
            try {
                await api.post('/auth/push-token', { push_token: '' });
            } catch (_) {}
        }
    }, []);

    return (
        <NotificationsContext.Provider value={{ pushEnabled, setPushEnabled, loaded }}>
            {children}
        </NotificationsContext.Provider>
    );
}

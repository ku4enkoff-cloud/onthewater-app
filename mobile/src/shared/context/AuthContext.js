import React, { createContext, useState, useEffect } from 'react';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../infrastructure/api';

const appVariant = Constants.expoConfig?.extra?.appVariant || process.env.EXPO_PUBLIC_APP_VARIANT || 'client';
const requiredRole = appVariant === 'owner' ? 'owner' : 'client';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        const setDone = () => {
            if (!cancelled) setLoading(false);
        };
        const maxWait = setTimeout(setDone, 3000);
        (async () => {
            try {
                await Promise.race([
                    loadUser(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
                ]);
            } catch (_) {
                setDone();
            } finally {
                clearTimeout(maxWait);
                setDone();
            }
        })();
        return () => {
            cancelled = true;
            clearTimeout(maxWait);
        };
    }, []);

    const loadUser = async () => {
        try {
            const token = await AsyncStorage.getItem('@token');
            if (token) {
                const res = await api.get('/auth/me', { timeout: 5000 });
                const user = res.data;
                // Разделение: владельческое приложение — только owner, клиентское — только client
                if (user?.role !== requiredRole) {
                    await AsyncStorage.removeItem('@token');
                    setUser(null);
                    return;
                }
                setUser(user);
            }
        } catch (e) {
            console.log('Load user error', e);
            await AsyncStorage.removeItem('@token');
        } finally {
            setLoading(false);
        }
    };

    const login = async (loginData) => {
        const res = await api.post('/auth/login', loginData);
        const token = res.data?.token;
        const user = res.data?.user;
        if (!token || !user) {
            throw new Error('Сервер вернул неверный ответ. Ожидаются token и user.');
        }
        if (user.role !== requiredRole) {
            throw new Error(requiredRole === 'owner'
                ? 'Это приложение только для владельцев судов. Используйте клиентское приложение ONTHEWATER.'
                : 'Это приложение для клиентов. Владельцам нужно приложение ONTHEWATER для владельцев.');
        }
        await AsyncStorage.setItem('@token', token);
        setUser(user);
    };

    const register = async (regData) => {
        const data = { ...regData };
        if (requiredRole === 'owner') data.role = 'owner';
        const res = await api.post('/auth/register', data);
        if (res.data?.token && res.data?.user) {
            await AsyncStorage.setItem('@token', res.data.token);
            setUser(res.data.user);
        }
        return res;
    };

    const logout = async () => {
        try {
            await api.post('/auth/push-token', { push_token: '' });
        } catch (_) {}
        await AsyncStorage.removeItem('@token');
        setUser(null);
    };

    const refreshUser = async () => {
        try {
            const res = await api.get('/auth/me');
            setUser(res.data);
        } catch (_) {}
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
};

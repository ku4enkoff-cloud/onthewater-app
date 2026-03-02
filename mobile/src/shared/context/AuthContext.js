import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../infrastructure/api';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        // Показываем экран входа не дольше чем через 3 сек (если API недоступен с эмулятора — не висим на спиннере)
        const maxWait = setTimeout(() => {
            if (!cancelled) setLoading(false);
        }, 3000);
        (async () => {
            try {
                await loadUser();
            } finally {
                if (!cancelled) {
                    clearTimeout(maxWait);
                    setLoading(false);
                }
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
                setUser(res.data);
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
        await AsyncStorage.setItem('@token', token);
        setUser(user);
    };

    const register = async (regData) => {
        const res = await api.post('/auth/register', regData);
        await AsyncStorage.setItem('@token', res.data.token);
        setUser(res.data.user);
    };

    const logout = async () => {
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

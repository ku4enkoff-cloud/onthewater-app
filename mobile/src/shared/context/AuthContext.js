import React, { createContext, useState, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import { api } from '../infrastructure/api';
import { getAppVariant } from '../appVariant';
import {
    clearSession,
    getStoredToken,
    getStoredUser,
    isAuthRejection,
    saveSession,
} from '../auth/sessionStorage';

const appVariant = getAppVariant();
const requiredRole = appVariant === 'owner' ? 'owner' : 'client';
const AUTH_ME_TIMEOUT_MS = 12000;

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const applyUserFromServer = useCallback(async (token, nextUser) => {
        if (nextUser?.role !== requiredRole) {
            await clearSession();
            setUser(null);
            return false;
        }
        await saveSession(token, nextUser);
        setUser(nextUser);
        return true;
    }, []);

    const loadUser = useCallback(async () => {
        const token = await getStoredToken();
        if (!token) {
            setUser(null);
            return;
        }

        const cachedUser = await getStoredUser();
        if (cachedUser?.role === requiredRole) {
            setUser(cachedUser);
        }

        try {
            const res = await api.get('/auth/me', { timeout: AUTH_ME_TIMEOUT_MS });
            await applyUserFromServer(token, res.data);
        } catch (e) {
            if (isAuthRejection(e)) {
                await clearSession();
                setUser(null);
            } else {
                console.log('Load user error (session kept)', e?.message || e);
                if (cachedUser?.role === requiredRole) {
                    setUser(cachedUser);
                }
            }
        }
    }, [applyUserFromServer]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                await loadUser();
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [loadUser]);

    useEffect(() => {
        const sub = AppState.addEventListener('change', (state) => {
            if (state === 'active') loadUser();
        });
        return () => sub.remove();
    }, [loadUser]);

    const login = async (loginData) => {
        const res = await api.post('/auth/login', loginData);
        const token = res.data?.token;
        const nextUser = res.data?.user;
        if (!token || !nextUser) {
            throw new Error('Сервер вернул неверный ответ. Ожидаются token и user.');
        }
        if (nextUser.role !== requiredRole) {
            throw new Error(requiredRole === 'owner'
                ? 'Это приложение только для владельцев судов. Используйте клиентское приложение ONTHEWATER.'
                : 'Это приложение для клиентов. Владельцам нужно приложение ONTHEWATER для владельцев.');
        }
        await saveSession(token, nextUser);
        setUser(nextUser);
    };

    const register = async (regData) => {
        const data = { ...regData };
        if (requiredRole === 'owner') data.role = 'owner';
        const res = await api.post('/auth/register', data);
        if (res.data?.token && res.data?.user) {
            await saveSession(res.data.token, res.data.user);
            setUser(res.data.user);
        }
        return res;
    };

    const logout = async () => {
        try {
            await api.post('/auth/push-token', { push_token: '' });
        } catch (_) {}
        await clearSession();
        setUser(null);
    };

    const refreshUser = async () => {
        try {
            const token = await getStoredToken();
            if (!token) return;
            const res = await api.get('/auth/me');
            await applyUserFromServer(token, res.data);
        } catch (e) {
            if (isAuthRejection(e)) {
                await clearSession();
                setUser(null);
            }
        }
    };

    const acceptTerms = async () => {
        const res = await api.post('/auth/accept-terms');
        const token = await getStoredToken();
        if (res.data?.user && token) {
            await saveSession(token, res.data.user);
            setUser(res.data.user);
        } else {
            await refreshUser();
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, acceptTerms }}>
            {children}
        </AuthContext.Provider>
    );
};

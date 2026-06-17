import React, { createContext, useState, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import { api } from '../infrastructure/api';
import {
    clearSession,
    getStoredToken,
    getStoredUser,
    isAuthRejection,
    saveSession,
} from '../shared/auth/sessionStorage';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadUser = useCallback(async () => {
        const token = await getStoredToken();
        if (!token) {
            setUser(null);
            return;
        }

        const cachedUser = await getStoredUser();
        if (cachedUser) setUser(cachedUser);

        try {
            const res = await api.get('/auth/me', { timeout: 12000 });
            await saveSession(token, res.data);
            setUser(res.data);
        } catch (e) {
            if (isAuthRejection(e)) {
                await clearSession();
                setUser(null);
            } else if (cachedUser) {
                setUser(cachedUser);
            }
        }
    }, []);

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
        await saveSession(res.data.token, res.data.user);
        setUser(res.data.user);
    };

    const register = async (regData) => {
        const res = await api.post('/auth/register', regData);
        if (res.data?.token && res.data?.user) {
            await saveSession(res.data.token, res.data.user);
            setUser(res.data.user);
        }
        return res;
    };

    const logout = async () => {
        await clearSession();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

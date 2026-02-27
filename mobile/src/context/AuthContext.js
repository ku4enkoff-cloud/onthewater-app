import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../infrastructure/api';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        try {
            const token = await AsyncStorage.getItem('@token');
            if (token) {
                const res = await api.get('/auth/me');
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
        await AsyncStorage.setItem('@token', res.data.token);
        setUser(res.data.user);
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

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

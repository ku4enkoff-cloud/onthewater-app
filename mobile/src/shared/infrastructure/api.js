import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from './config';

export const api = axios.create({ baseURL: API_BASE, timeout: 10000 });

api.interceptors.request.use(async (config) => {
    const token = await AsyncStorage.getItem('@token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
}, (err) => Promise.reject(err));

api.interceptors.response.use(
    (r) => r,
    (err) => {
        if (err.response?.status === 401) console.log('Token expired or invalid');
        return Promise.reject(err);
    }
);

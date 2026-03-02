import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from './config';

export const api = axios.create({ baseURL: API_BASE, timeout: 10000 });

api.interceptors.request.use(async (config) => {
    const token = await AsyncStorage.getItem('@token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    // FormData: не задавать Content-Type — клиент сам подставит multipart/form-data с boundary
    if (config.data && typeof FormData !== 'undefined' && config.data instanceof FormData) {
        delete config.headers['Content-Type'];
    }
    return config;
}, (err) => Promise.reject(err));

api.interceptors.response.use(
    (r) => r,
    (err) => {
        if (err.response?.status === 401) console.log('Token expired or invalid');
        return Promise.reject(err);
    }
);

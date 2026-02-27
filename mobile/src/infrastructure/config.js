import { Platform } from 'react-native';

const isSimulator = Platform.OS === 'ios' || Platform.OS === 'android';
// Для Android эмулятора localhost это 10.0.2.2. Для iOS - localhost.
export const API_BASE = isSimulator && Platform.OS === 'android'
    ? 'http://10.0.2.2:3000'
    : 'http://localhost:3000';

export const SOCKET_URL = API_BASE;

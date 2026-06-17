import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@token';
const USER_KEY = '@user';

export async function getStoredToken() {
    return AsyncStorage.getItem(TOKEN_KEY);
}

export async function getStoredUser() {
    const raw = await AsyncStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch (_) {
        return null;
    }
}

export async function saveSession(token, user) {
    const pairs = [];
    if (token) pairs.push([TOKEN_KEY, token]);
    if (user) pairs.push([USER_KEY, JSON.stringify(user)]);
    if (pairs.length) await AsyncStorage.multiSet(pairs);
}

export async function clearSession() {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
}

/** Сбрасываем сессию только при явном отказе сервера, не при обрыве сети. */
export function isAuthRejection(error) {
    const status = error?.response?.status;
    return status === 401 || status === 403;
}

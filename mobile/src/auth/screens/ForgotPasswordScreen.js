import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { api } from '../../shared/infrastructure/api';
import { theme } from '../../shared/theme';

function normalizeEmail(v) {
    return String(v || '').trim().toLowerCase();
}

export default function ForgotPasswordScreen({ navigation }) {
    const appVariant = Constants.expoConfig?.extra?.appVariant || process.env.EXPO_PUBLIC_APP_VARIANT || 'client';
    const [step, setStep] = useState('request'); // request -> reset

    const [email, setEmail] = useState('');
    const [token, setToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newPasswordRepeat, setNewPasswordRepeat] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const title = useMemo(() => {
        if (appVariant === 'owner') return 'Восстановление пароля';
        return 'Восстановление пароля';
    }, [appVariant]);

    // На этом экране не используем внешние модули ориентации — чтобы избежать лишних зависимостей.
    useEffect(() => {}, []);

    const requestReset = async () => {
        const e = normalizeEmail(email);
        if (!e || !e.includes('@')) {
            Alert.alert('Ошибка', 'Введите корректный email');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await api.post('/auth/request-password-reset', { email: e });
            // Не раскрываем пользователю существование аккаунта: бэкенд вернёт успех одинаково.
            setStep('reset');
            Alert.alert('Готово', 'Проверьте email: если аккаунт существует, мы отправили токен для восстановления.');
        } catch (err) {
            setError(err.response?.data?.error || 'Не удалось отправить запрос');
        } finally {
            setLoading(false);
        }
    };

    const resetPassword = async () => {
        const t = String(token || '').trim();
        if (!t) {
            Alert.alert('Ошибка', 'Введите токен');
            return;
        }
        if (!newPassword || newPassword.length < 3) {
            Alert.alert('Ошибка', 'Пароль должен быть минимум 3 символа');
            return;
        }
        if (newPassword !== newPasswordRepeat) {
            Alert.alert('Ошибка', 'Пароли не совпадают');
            return;
        }

        setLoading(true);
        setError('');
        try {
            await api.post('/auth/reset-password', { token: t, new_password: newPassword });
            Alert.alert('Пароль изменён', 'Теперь вы можете войти в приложение.');
            navigation.navigate('Login');
        } catch (err) {
            setError(err.response?.data?.error || 'Не удалось восстановить пароль');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safe}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboard}>
                <View style={styles.content}>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.subtitle}>
                        {step === 'request'
                            ? 'Введите email, чтобы получить токен восстановления.'
                            : 'Введите токен и новый пароль.'}
                    </Text>

                    {error ? <Text style={styles.error}>{error}</Text> : null}

                    {step === 'request' ? (
                        <>
                            <Text style={styles.label}>Email</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="example@mail.ru"
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                autoComplete="email"
                            />

                            <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={requestReset} disabled={loading}>
                                <Text style={styles.buttonText}>{loading ? 'Отправка…' : 'Отправить'}</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <Text style={styles.label}>Токен</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Введите токен из письма"
                                value={token}
                                onChangeText={setToken}
                                autoCapitalize="none"
                            />

                            <Text style={[styles.label, { marginTop: 18 }]}>Новый пароль</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Минимум 3 символа"
                                value={newPassword}
                                onChangeText={setNewPassword}
                                secureTextEntry
                                autoComplete="new-password"
                            />

                            <Text style={styles.label}>Повторите пароль</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Повторите новый пароль"
                                value={newPasswordRepeat}
                                onChangeText={setNewPasswordRepeat}
                                secureTextEntry
                                autoComplete="new-password"
                            />

                            <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={resetPassword} disabled={loading}>
                                <Text style={styles.buttonText}>{loading ? 'Смена…' : 'Сменить пароль'}</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    <TouchableOpacity style={{ marginTop: 18 }} onPress={() => navigation.navigate('Login')} disabled={loading}>
                        <Text style={styles.backLink}>Назад к входу</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.background },
    keyboard: { flex: 1 },
    content: { flex: 1, paddingHorizontal: theme.spacing.lg, justifyContent: 'center' },
    title: { fontFamily: theme.fonts.bold, fontSize: 26, color: theme.colors.textMain, marginBottom: 8 },
    subtitle: { fontFamily: theme.fonts.regular, fontSize: 15, color: theme.colors.textMuted, marginBottom: 18, lineHeight: 20 },
    label: { fontFamily: theme.fonts.regular, fontSize: 14, color: theme.colors.textMain, fontWeight: '700', marginBottom: 8 },
    input: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        padding: 14,
        fontSize: 16,
        backgroundColor: theme.colors.surface,
    },
    button: {
        backgroundColor: theme.colors.primary,
        padding: 16,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        marginTop: 20,
    },
    buttonDisabled: { opacity: 0.7 },
    buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    error: { color: '#b91c1c', marginBottom: 10, fontFamily: theme.fonts.regular, fontSize: 13 },
    backLink: { color: theme.colors.primary, fontFamily: theme.fonts.medium, fontWeight: '600', textAlign: 'center' },
});


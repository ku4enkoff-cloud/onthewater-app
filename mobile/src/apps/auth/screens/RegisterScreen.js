import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../../../context/AuthContext';
import { theme } from '../../../theme';

function formatPhoneRu(value) {
    const digits = (value || '').replace(/\D/g, '');
    let d = digits;
    if (d.startsWith('8')) d = '7' + d.slice(1);
    else if (d && !d.startsWith('7')) d = '7' + d;
    if (d.length <= 1) return d ? '+7' + (d.length > 1 ? ' (' : '') : '';
    if (d.length <= 4) return '+7 (' + d.slice(1);
    if (d.length <= 7) return '+7 (' + d.slice(1, 4) + ') ' + d.slice(4);
    if (d.length <= 9) return '+7 (' + d.slice(1, 4) + ') ' + d.slice(4, 7) + '-' + d.slice(7);
    return '+7 (' + d.slice(1, 4) + ') ' + d.slice(4, 7) + '-' + d.slice(7, 9) + '-' + d.slice(9, 11);
}
function getPhoneDigits(phone) {
    let d = (phone || '').replace(/\D/g, '');
    if (d.startsWith('8')) d = '7' + d.slice(1);
    else if (d && !d.startsWith('7')) d = '7' + d;
    return d;
}
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isValidEmail(str) {
    return typeof str === 'string' && EMAIL_REGEX.test(str.trim());
}

export default function RegisterScreen({ navigation }) {
    const { register } = useContext(AuthContext);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [passwordRepeat, setPasswordRepeat] = useState('');
    const [role, setRole] = useState('client');
    const [loading, setLoading] = useState(false);

    const handlePhoneChange = (text) => setPhone(formatPhoneRu(text));

    const validate = () => {
        const nameTrim = (name || '').trim();
        if (!nameTrim) {
            Alert.alert('Ошибка', 'Введите имя');
            return false;
        }
        if (nameTrim.length < 2) {
            Alert.alert('Ошибка', 'Имя должно содержать не менее 2 символов');
            return false;
        }
        if (!email.trim()) {
            Alert.alert('Ошибка', 'Введите email');
            return false;
        }
        if (!isValidEmail(email)) {
            Alert.alert('Ошибка', 'Введите корректный email (например, name@example.com)');
            return false;
        }
        const digits = getPhoneDigits(phone);
        if (digits.length < 11) {
            Alert.alert('Ошибка', 'Введите полный номер телефона (+7 XXX XXX-XX-XX)');
            return false;
        }
        if (!password) {
            Alert.alert('Ошибка', 'Введите пароль');
            return false;
        }
        if (password.length < 6) {
            Alert.alert('Ошибка', 'Пароль должен быть не менее 6 символов');
            return false;
        }
        if (password !== passwordRepeat) {
            Alert.alert('Ошибка', 'Пароли не совпадают');
            return false;
        }
        return true;
    };

    const handleRegister = async () => {
        if (!validate()) return;
        setLoading(true);
        try {
            const res = await register({
                name: name.trim(),
                email: email.trim().toLowerCase(),
                phone: getPhoneDigits(phone),
                password,
                role,
            });
            const data = res?.data || {};
            if (data.token && data.user) {
                return;
            }
            Alert.alert(
                'Регистрация выполнена',
                data.message || 'На указанный email отправлено письмо со ссылкой для подтверждения. После перехода по ссылке войдите в приложение.',
                [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
            );
        } catch (e) {
            const data = e.response?.data || {};
            let msg = data.error || 'Произошла неизвестная ошибка';
            if (data.detail && typeof data.detail === 'string') msg += '\n\n' + data.detail;
            Alert.alert('Ошибка регистрации', msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardView}
            >
                <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
                    <Text style={[theme.typography.h1, { marginBottom: 8 }]}>Создать аккаунт</Text>
                    <Text style={[theme.typography.body, { color: theme.colors.textMuted, marginBottom: 32 }]}>
                        Присоединяйтесь к сообществу ONTHEWATER
                    </Text>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Имя</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Как к вам обращаться"
                            value={name}
                            onChangeText={setName}
                        />
                    </View>

                    <View style={styles.inputContainer}>
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
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Телефон</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="+7 (999) 123-45-67"
                            value={phone}
                            onChangeText={handlePhoneChange}
                            keyboardType="phone-pad"
                            maxLength={18}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Пароль</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Не менее 6 символов"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            autoComplete="new-password"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Повторите пароль</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Повторите пароль"
                            value={passwordRepeat}
                            onChangeText={setPasswordRepeat}
                            secureTextEntry
                            autoComplete="new-password"
                        />
                    </View>

                    <Text style={styles.label}>Тип аккаунта</Text>
                    <View style={styles.roleContainer}>
                        <TouchableOpacity
                            style={[styles.roleButton, role === 'client' && styles.roleButtonActive]}
                            onPress={() => setRole('client')}
                        >
                            <Text style={[styles.roleText, role === 'client' && styles.roleTextActive]}>Я клиент</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.roleButton, role === 'owner' && styles.roleButtonActive]}
                            onPress={() => setRole('owner')}
                        >
                            <Text style={[styles.roleText, role === 'owner' && styles.roleTextActive]}>Я владелец судна</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleRegister}
                        disabled={loading}
                    >
                        <Text style={styles.buttonText}>{loading ? 'Регистрация...' : 'Зарегистрироваться'}</Text>
                    </TouchableOpacity>

                    <View style={styles.footer}>
                        <Text style={theme.typography.body}>Уже есть аккаунт? </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                            <Text style={styles.linkText}>Войти</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    keyboardView: { flex: 1 },
    contentContainer: {
        flexGrow: 1,
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.xl,
        paddingBottom: theme.spacing.xl,
    },
    inputContainer: { marginBottom: theme.spacing.md },
    label: {
        ...theme.typography.bodySm,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        padding: 14,
        fontSize: 16,
        backgroundColor: theme.colors.surface,
    },
    roleContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    roleButton: {
        flex: 1,
        padding: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
    },
    roleButtonActive: {
        backgroundColor: theme.colors.primaryLight,
        borderColor: theme.colors.primary,
    },
    roleText: { color: theme.colors.textMain, fontWeight: '600' },
    roleTextActive: { color: theme.colors.primary },
    button: {
        backgroundColor: theme.colors.primary,
        padding: 16,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        marginTop: 8,
    },
    buttonDisabled: { opacity: 0.7 },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 32,
    },
    linkText: {
        ...theme.typography.body,
        color: theme.colors.primary,
        fontWeight: 'bold',
    }
});

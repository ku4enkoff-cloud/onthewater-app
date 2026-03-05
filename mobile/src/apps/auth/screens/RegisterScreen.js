import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../../../context/AuthContext';
import { theme } from '../../../theme';

export default function RegisterScreen({ navigation }) {
    const { register } = useContext(AuthContext);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('client'); // client или owner
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        if (!name || !email || !phone || !password) {
            Alert.alert('Ошибка', 'Заполните все поля');
            return;
        }

        setLoading(true);
        try {
            await register({ name, email, phone, password, role });
            // После успешной регистрации RootNavigator сам переключит интерфейс
        } catch (e) {
            Alert.alert('Ошибка регистрации', e.response?.data?.error || 'Произошла неизвестная ошибка');
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
                            placeholder="Ваш email"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Телефон</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ваш номер телефона"
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
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

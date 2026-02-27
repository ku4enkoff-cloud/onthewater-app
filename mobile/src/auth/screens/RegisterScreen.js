import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../../shared/context/AuthContext';
import { theme } from '../../shared/theme';

const appVariant = process.env.EXPO_PUBLIC_APP_VARIANT || 'client';

export default function RegisterScreen({ navigation, route }) {
    const { register } = useContext(AuthContext);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [role] = useState(appVariant === 'owner' ? 'owner' : 'client');
    const [loading, setLoading] = useState(false);
    const fromProfile = route?.params?.fromProfile;

    const handleRegister = async () => {
        if (!name || !email || !phone || !password) {
            Alert.alert('Ошибка', 'Заполните все поля');
            return;
        }
        setLoading(true);
        try {
            await register({ name, email: email.trim().toLowerCase(), phone, password, role });
            if (navigation.canGoBack()) {
                navigation.goBack();
            }
        } catch (e) {
            const msg = e.response?.data?.error
                || (e.message?.includes('Network') ? 'Нет связи с сервером. Проверьте подключение.' : 'Произошла ошибка');
            Alert.alert('Ошибка регистрации', msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
                <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
                    <Text style={[theme.typography.h1, { marginBottom: 8 }]}>Создать аккаунт</Text>
                    <Text style={[theme.typography.body, { color: theme.colors.textMuted, marginBottom: 32 }]}>
                        {appVariant === 'owner' ? 'Регистрация для владельцев судов' : 'Присоединяйтесь к BoatRent'}
                    </Text>
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Имя</Text>
                        <TextInput style={styles.input} placeholder="Как к вам обращаться" value={name} onChangeText={setName} />
                    </View>
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput style={styles.input} placeholder="Ваш email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
                    </View>
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Телефон</Text>
                        <TextInput style={styles.input} placeholder="Номер телефона" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                    </View>
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Пароль</Text>
                        <TextInput style={styles.input} placeholder="Не менее 6 символов" value={password} onChangeText={setPassword} secureTextEntry />
                    </View>
                    <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleRegister} disabled={loading}>
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
    contentContainer: { flexGrow: 1, paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.xl, paddingBottom: theme.spacing.xl },
    inputContainer: { marginBottom: theme.spacing.md },
    label: { ...theme.typography.bodySm, fontWeight: 'bold', marginBottom: 8 },
    input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md, padding: 14, fontSize: 16, backgroundColor: theme.colors.surface },
    button: { backgroundColor: theme.colors.primary, padding: 16, borderRadius: theme.borderRadius.md, alignItems: 'center', marginTop: 8 },
    buttonDisabled: { opacity: 0.7 },
    buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
    linkText: { ...theme.typography.body, color: theme.colors.primary, fontWeight: 'bold' },
});

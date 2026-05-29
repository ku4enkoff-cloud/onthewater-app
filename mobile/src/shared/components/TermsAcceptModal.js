import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AppModal from './AppModal';
import { theme } from '../theme';
import { api } from '../infrastructure/api';

export default function TermsAcceptModal({ visible, onAccepted }) {
    const navigation = useNavigation();
    const [loading, setLoading] = useState(false);

    const accept = async () => {
        setLoading(true);
        try {
            const res = await api.post('/auth/accept-terms');
            onAccepted?.(res.data?.user);
        } catch (e) {
            const msg = e.response?.data?.error || 'Не удалось сохранить согласие. Попробуйте позже.';
            Alert.alert('Ошибка', msg);
        } finally {
            setLoading(false);
        }
    };

    const openDoc = (slug, title) => {
        try {
            navigation.navigate('LegalDocument', { slug, title });
        } catch (_) {
            Alert.alert('Документы', 'Откройте раздел поддержки или регистрации для просмотра условий.');
        }
    };

    return (
        <AppModal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <View style={styles.card}>
                    <Text style={styles.title}>Условия обслуживания</Text>
                    <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                        <Text style={styles.body}>
                            Для использования приложения необходимо принять Условия обслуживания. В приложении
                            действует политика нулевой терпимости к оскорблениям, угрозам, спаму и мошенничеству.
                            Вы можете пожаловаться на контент и заблокировать пользователя; модераторы рассмотрят
                            жалобу в течение 24 часов.
                        </Text>
                        <TouchableOpacity onPress={() => openDoc('terms_of_service', 'Условия обслуживания')}>
                            <Text style={styles.link}>Прочитать Условия обслуживания</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => openDoc('privacy_policy', 'Политика конфиденциальности')}>
                            <Text style={styles.link}>Политика конфиденциальности</Text>
                        </TouchableOpacity>
                    </ScrollView>
                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={accept}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Принимаю условия</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </AppModal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: theme.spacing.lg,
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        maxHeight: '85%',
    },
    title: { ...theme.typography.h2, marginBottom: theme.spacing.md },
    scroll: { maxHeight: 280, marginBottom: theme.spacing.md },
    body: { ...theme.typography.body, color: theme.colors.textMuted, marginBottom: theme.spacing.md },
    link: { ...theme.typography.body, color: theme.colors.primary, marginBottom: 8, textDecorationLine: 'underline' },
    button: {
        backgroundColor: theme.colors.primary,
        padding: 16,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
    },
    buttonDisabled: { opacity: 0.7 },
    buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

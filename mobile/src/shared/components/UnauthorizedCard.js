import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../theme';

/**
 * Карточка для экранов Избранное / Брони / Сообщения без авторизации (оформление как в Boatsetter).
 * label — заголовок капсом (например «У ВАС НЕТ ИЗБРАННЫХ КАТЕРОВ»).
 * message — текст-инструкция (например «Войдите, чтобы видеть список избранных катеров»).
 * onSignIn — вызывается при нажатии на кнопку «ВОЙТИ».
 */
export default function UnauthorizedCard({ label, message, onSignIn }) {
    return (
        <View style={styles.wrapper}>
            <View style={styles.card}>
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.message}>{message}</Text>
                <TouchableOpacity style={styles.button} onPress={onSignIn} activeOpacity={0.85}>
                    <Text style={styles.buttonText}>ВОЙТИ</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        flex: 1,
        paddingHorizontal: theme.spacing.lg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: theme.colors.background,
        borderRadius: 12,
        padding: theme.spacing.xl,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textMuted,
        letterSpacing: 0.5,
        textAlign: 'center',
        marginBottom: theme.spacing.sm,
    },
    message: {
        fontSize: 17,
        fontWeight: '500',
        color: theme.colors.textMain,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: theme.spacing.xl,
    },
    button: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
        letterSpacing: 0.5,
    },
});

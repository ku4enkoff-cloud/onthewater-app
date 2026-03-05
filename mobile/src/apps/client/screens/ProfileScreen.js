import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert } from 'react-native';
import { AuthContext } from '../../../context/AuthContext';
import { theme } from '../../../theme';
import { User, Settings, Heart, CreditCard, HelpCircle, LogOut } from 'lucide-react-native';

export default function ProfileScreen() {
    const { user, logout } = useContext(AuthContext);
    const [loading, setLoading] = useState(false);

    const handleLogout = async () => {
        Alert.alert(
            'Выход',
            'Вы действительно хотите выйти из аккаунта?',
            [
                { text: 'Отмена', style: 'cancel' },
                { 
                    text: 'Выйти', 
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            await logout();
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const menuItems = [
        {
            id: 'favorites',
            icon: Heart,
            title: 'Избранное',
            subtitle: 'Сохраненные катера',
            onPress: () => console.log('Go to favorites'),
        },
        {
            id: 'payments',
            icon: CreditCard,
            title: 'Платежи',
            subtitle: 'История и карты',
            onPress: () => console.log('Go to payments'),
        },
        {
            id: 'settings',
            icon: Settings,
            title: 'Настройки',
            subtitle: 'Профиль и уведомления',
            onPress: () => console.log('Go to settings'),
        },
        {
            id: 'help',
            icon: HelpCircle,
            title: 'Помощь',
            subtitle: 'FAQ и поддержка',
            onPress: () => console.log('Go to help'),
        },
    ];

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Заголовок профиля */}
            <View style={styles.header}>
                <View style={styles.avatarContainer}>
                    {user?.avatar ? (
                        <Image source={{ uri: user.avatar }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <User size={60} color={theme.colors.textMuted} />
                        </View>
                    )}
                </View>
                <Text style={theme.typography.h1}>{user?.name || 'Пользователь'}</Text>
                <Text style={[theme.typography.body, { color: theme.colors.textMuted, marginTop: 4 }]}>
                    {user?.email || 'email@example.com'}
                </Text>
                <Text style={[theme.typography.caption, { marginTop: 8 }]}>
                    {user?.role === 'owner' ? 'Владелец' : 'Клиент'} • На платформе с {user?.created_at ? new Date(user.created_at).getFullYear() : '2024'}
                </Text>
            </View>

            {/* Статистика */}
            <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                    <Text style={styles.statNumber}>12</Text>
                    <Text style={styles.statLabel}>Броней</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={styles.statNumber}>4.8</Text>
                    <Text style={styles.statLabel}>Рейтинг</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={styles.statNumber}>24</Text>
                    <Text style={styles.statLabel}>Избранное</Text>
                </View>
            </View>

            {/* Меню */}
            <View style={styles.menuSection}>
                <Text style={[theme.typography.h2, { marginBottom: theme.spacing.md }]}>Настройки</Text>
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <TouchableOpacity
                            key={item.id}
                            style={styles.menuItem}
                            onPress={item.onPress}
                        >
                            <View style={styles.menuIcon}>
                                <Icon size={24} color={theme.colors.textMain} />
                            </View>
                            <View style={styles.menuContent}>
                                <Text style={theme.typography.body}>{item.title}</Text>
                                <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
                                    {item.subtitle}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Кнопка выхода */}
            <TouchableOpacity
                style={[styles.logoutButton, loading && styles.logoutButtonDisabled]}
                onPress={handleLogout}
                disabled={loading}
            >
                <LogOut size={20} color={theme.colors.error} />
                <Text style={styles.logoutText}>Выйти из аккаунта</Text>
            </TouchableOpacity>

            {/* Версия приложения */}
            <View style={styles.versionContainer}>
                <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
                    ONTHEWATER v1.0.0
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.xl,
        paddingBottom: theme.spacing.xl,
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        marginBottom: theme.spacing.lg,
    },
    avatarContainer: {
        marginBottom: theme.spacing.md,
    },
    avatarPlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: theme.colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
    },
    statsContainer: {
        flexDirection: 'row',
        backgroundColor: theme.colors.surface,
        marginHorizontal: theme.spacing.lg,
        marginBottom: theme.spacing.xl,
        borderRadius: theme.borderRadius.md,
        paddingVertical: theme.spacing.md,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statNumber: {
        ...theme.typography.h2,
        color: theme.colors.primary,
    },
    statLabel: {
        ...theme.typography.caption,
        color: theme.colors.textMuted,
        marginTop: 4,
    },
    statDivider: {
        width: 1,
        backgroundColor: theme.colors.border,
    },
    menuSection: {
        paddingHorizontal: theme.spacing.lg,
        marginBottom: theme.spacing.xl,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    menuIcon: {
        width: 40,
        alignItems: 'center',
    },
    menuContent: {
        flex: 1,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.error,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.xl,
    },
    logoutButtonDisabled: {
        opacity: 0.5,
    },
    logoutText: {
        marginLeft: 8,
        color: theme.colors.error,
        fontWeight: '600',
    },
    versionContainer: {
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
    },
});
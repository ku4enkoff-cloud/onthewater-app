import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthContext } from '../../shared/context/AuthContext';
import { theme } from '../../shared/theme';
import { User, Settings, Heart, CreditCard, HelpCircle, LogOut, ChevronRight, Calendar, Star, Shield, FileText, Bell } from 'lucide-react-native';

export default function ProfileScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { user, logout } = useContext(AuthContext);
    const [loading, setLoading] = useState(false);

    const handleLogout = async () => {
        Alert.alert('Выход', 'Вы действительно хотите выйти из аккаунта?', [
            { text: 'Отмена', style: 'cancel' },
            { text: 'Выйти', style: 'destructive', onPress: async () => { setLoading(true); try { await logout(); } finally { setLoading(false); } } },
        ]);
    };

    if (!user) {
        return (
            <ScrollView style={styles.container} contentContainerStyle={[styles.guestContainer, { paddingTop: insets.top + 24 }]} showsVerticalScrollIndicator={false}>
                <View style={styles.guestHeader}>
                    <View style={styles.avatarPlaceholder}><User size={60} color={theme.colors.gray400} /></View>
                    <Text style={styles.guestTitle}>Гость</Text>
                    <Text style={styles.guestSubtitle}>Войдите, чтобы бронировать катера и управлять профилем</Text>
                </View>
                <TouchableOpacity style={styles.loginButton} onPress={() => navigation.navigate('Login', { fromProfile: true })}>
                    <Text style={styles.loginButtonText}>Войти</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.registerButton} onPress={() => navigation.navigate('Register', { fromProfile: true })}>
                    <Text style={styles.registerButtonText}>Регистрация</Text>
                </TouchableOpacity>
                <View style={styles.versionContainer}><Text style={styles.versionText}>WaveRentals v1.0.0</Text></View>
            </ScrollView>
        );
    }

    const menuItems = [
        { id: 'bookings', icon: Calendar, title: 'Мои брони', onPress: () => navigation.navigate('Bookings') },
        { id: 'payments', icon: CreditCard, title: 'Оплата', onPress: () => {} },
        { id: 'notifications', icon: Bell, title: 'Уведомления', onPress: () => {} },
        { id: 'settings', icon: Settings, title: 'Настройки', onPress: () => {} },
        { id: 'help', icon: HelpCircle, title: 'Помощь', onPress: () => {} },
        { id: 'privacy', icon: Shield, title: 'Политика конфиденциальности', onPress: () => {} },
        { id: 'terms', icon: FileText, title: 'Условия использования', onPress: () => {} },
    ];

    const stats = [
        { label: 'Поездки', value: '0', icon: Calendar },
        { label: 'Отзывы', value: '—', icon: Star },
        { label: 'Избранное', value: '0', icon: Heart },
    ];

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
            <LinearGradient colors={['#1B365D', '#0F2341']} style={[styles.profileGradient, { height: 140 + insets.top }]} />
            <View style={[styles.profileCard, { marginTop: -64 }]}>
                <View style={styles.profileRow}>
                    {user?.avatar ? <Image source={{ uri: user.avatar }} style={styles.avatar} /> : <View style={styles.avatarPlaceholder}><User size={40} color={theme.colors.gray500} /></View>}
                    <View style={styles.profileInfo}>
                        <Text style={styles.profileName}>{user?.name || 'Пользователь'}</Text>
                        <Text style={styles.profileEmail}>{user?.email || ''}</Text>
                        <View style={styles.verifiedBadge}>
                            <Text style={styles.verifiedText}>Verified</Text>
                        </View>
                    </View>
                </View>
                <View style={styles.statsRow}>
                    {stats.map((s, i) => {
                        const Icon = s.icon;
                        return (
                            <View key={s.label} style={styles.statBlock}>
                                <View style={styles.statIconWrap}>
                                    <Icon size={20} color={theme.colors.primary} />
                                </View>
                                <Text style={styles.statValue}>{s.value}</Text>
                                <Text style={styles.statLabel}>{s.label}</Text>
                            </View>
                        );
                    })}
                </View>
            </View>
            <View style={styles.menuCard}>
                {menuItems.map((item, index) => {
                    const Icon = item.icon;
                    return (
                        <TouchableOpacity key={item.id} style={[styles.menuItem, index < menuItems.length - 1 && styles.menuItemBorder]} onPress={item.onPress}>
                            <View style={styles.menuIconWrap}><Icon size={20} color={theme.colors.gray700} /></View>
                            <Text style={styles.menuItemTitle}>{item.title}</Text>
                            <ChevronRight size={20} color={theme.colors.gray400} />
                        </TouchableOpacity>
                    );
                })}
            </View>
            <TouchableOpacity style={[styles.logoutButton, loading && styles.logoutButtonDisabled]} onPress={handleLogout} disabled={loading}>
                <LogOut size={20} color={theme.colors.error} />
                <Text style={styles.logoutText}>Выйти</Text>
            </TouchableOpacity>
            <View style={styles.versionContainer}><Text style={styles.versionText}>WaveRentals v1.0.0</Text></View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.gray50 },
    profileGradient: { width: '100%' },
    profileCard: {
        marginHorizontal: theme.spacing.md,
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: theme.spacing.lg,
        ...theme.shadows.card,
    },
    profileRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
    avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.colors.gray100, justifyContent: 'center', alignItems: 'center' },
    avatar: { width: 80, height: 80, borderRadius: 40 },
    profileInfo: { flex: 1 },
    profileName: { fontSize: 20, fontFamily: theme.fonts.bold, color: theme.colors.gray900 },
    profileEmail: { fontSize: 14, color: theme.colors.gray500, marginTop: 4 },
    verifiedBadge: {
        alignSelf: 'flex-start',
        marginTop: 8,
        backgroundColor: 'rgba(27, 54, 93, 0.1)',
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 8,
    },
    verifiedText: { fontSize: 12, fontFamily: theme.fonts.semiBold, color: theme.colors.primary },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: theme.spacing.lg,
        paddingTop: theme.spacing.lg,
        borderTopWidth: 1,
        borderTopColor: theme.colors.gray100,
    },
    statBlock: { alignItems: 'center' },
    statIconWrap: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: theme.colors.gray100,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    statValue: { fontSize: 20, fontFamily: theme.fonts.bold, color: theme.colors.gray900 },
    statLabel: { fontSize: 12, color: theme.colors.gray500, marginTop: 2 },
    menuCard: {
        marginHorizontal: theme.spacing.md,
        marginTop: theme.spacing.md,
        backgroundColor: '#fff',
        borderRadius: 24,
        overflow: 'hidden',
        ...theme.shadows.card,
    },
    menuItem: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md },
    menuItemBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.gray100 },
    menuIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: theme.colors.gray100,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: theme.spacing.sm,
    },
    menuItemTitle: { flex: 1, fontSize: 16, fontFamily: theme.fonts.medium, color: theme.colors.gray900 },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginHorizontal: theme.spacing.md,
        marginTop: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        backgroundColor: '#fff',
        borderRadius: 20,
        ...theme.shadows.card,
    },
    logoutButtonDisabled: { opacity: 0.5 },
    logoutText: { color: theme.colors.error, fontFamily: theme.fonts.semiBold, fontSize: 16 },
    versionContainer: { alignItems: 'center', marginTop: theme.spacing.lg },
    versionText: { fontSize: 12, color: theme.colors.gray400 },
    guestContainer: { flexGrow: 1, paddingHorizontal: theme.spacing.lg },
    guestHeader: { alignItems: 'center', marginBottom: theme.spacing.xl },
    guestTitle: { fontSize: 28, fontFamily: theme.fonts.bold, color: theme.colors.gray900, marginBottom: 8 },
    guestSubtitle: { ...theme.typography.body, color: theme.colors.gray500, textAlign: 'center' },
    loginButton: { backgroundColor: theme.colors.primary, paddingVertical: 14, borderRadius: theme.borderRadius.xl, alignItems: 'center', marginBottom: theme.spacing.sm },
    loginButtonText: { color: '#fff', fontSize: 16, fontFamily: theme.fonts.bold },
    registerButton: { backgroundColor: 'transparent', paddingVertical: 14, borderRadius: theme.borderRadius.xl, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.primary, marginBottom: theme.spacing.xl },
    registerButtonText: { color: theme.colors.primary, fontSize: 16, fontFamily: theme.fonts.semiBold },
});

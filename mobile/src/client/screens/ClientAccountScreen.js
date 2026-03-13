import React, { useContext, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User, Bell, ChevronRight, Plus, HelpCircle } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../../shared/context/AuthContext';
import { API_BASE, getPhotoUrl } from '../../shared/infrastructure/config';
import { theme } from '../../shared/theme';

let LinearGradient;
try { LinearGradient = require('expo-linear-gradient').LinearGradient; } catch (_) {}

const NAVY = theme.colors.primary;
const GRADIENT = [theme.colors.primary, theme.colors.primaryLight || '#2A4A7F'];

export default function ClientAccountScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { user, logout, refreshUser } = useContext(AuthContext);
    const [loggingOut, setLoggingOut] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    const initial = (user?.name || user?.email || 'U')[0].toUpperCase();
    const displayName = user?.name || user?.email?.split('@')[0] || 'Пользователь';

    const handlePickAvatar = useCallback(async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Доступ', 'Разрешите доступ к галерее для выбора фото.');
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });
            if (result.canceled || !result.assets?.[0]?.uri) return;
            setUploadingAvatar(true);
            try {
                const uri = result.assets[0].uri;
                const formData = new FormData();
                formData.append('avatar', { uri, type: 'image/jpeg', name: 'avatar.jpg' });
                const token = await AsyncStorage.getItem('@token');
                const res = await fetch(`${API_BASE}/auth/avatar`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token || ''}` },
                    body: formData,
                });
                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    throw new Error(data.error || `Ошибка ${res.status}`);
                }
                await refreshUser();
            } catch (e) {
                Alert.alert('Ошибка', e?.message || 'Не удалось загрузить фото');
            } finally {
                setUploadingAvatar(false);
            }
        } catch (err) {
            Alert.alert('Ошибка', err?.message || 'Не удалось открыть галерею');
        }
    }, [refreshUser]);

    const handleLogout = () => {
        Alert.alert('Выход', 'Вы действительно хотите выйти?', [
            { text: 'Отмена', style: 'cancel' },
            {
                text: 'Выйти', style: 'destructive',
                onPress: async () => {
                    setLoggingOut(true);
                    try { await logout(); } finally { setLoggingOut(false); }
                },
            },
        ]);
    };

    const MENU = [
        { icon: User, label: 'Данные аккаунта', screen: 'ClientAccountInfo' },
        { icon: Bell, label: 'Настройки уведомлений', screen: 'ClientNotifications' },
        { icon: HelpCircle, label: 'Поддержка', screen: 'ClientSupport' },
    ];

    return (
        <View style={s.root}>
            <ScrollView
                style={s.scroll}
                contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
                showsVerticalScrollIndicator={false}
            >
                <View style={s.headerWrap}>
                    {LinearGradient ? (
                        <LinearGradient
                            colors={GRADIENT}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFillObject}
                        />
                    ) : (
                        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: NAVY }]} />
                    )}

                    <View style={[s.headerContent, { paddingTop: insets.top + 16 }]}>
                        <Text style={s.headerTitle}>Данные аккаунта</Text>

                        <View style={s.avatarBlock}>
                            <TouchableOpacity
                                style={s.avatarOuter}
                                onPress={handlePickAvatar}
                                disabled={uploadingAvatar}
                                activeOpacity={0.8}
                            >
                                {user?.avatar ? (
                                    <Image
                                        source={{ uri: getPhotoUrl(user.avatar) || user.avatar }}
                                        style={s.avatarImage}
                                    />
                                ) : (
                                    <View style={s.avatar}>
                                        {uploadingAvatar ? (
                                            <ActivityIndicator size="small" color="#fff" />
                                        ) : (
                                            <Text style={s.avatarLetter}>{initial}</Text>
                                        )}
                                    </View>
                                )}
                                <View style={s.avatarBadge}>
                                    <Plus size={14} color="#fff" strokeWidth={3} />
                                </View>
                            </TouchableOpacity>
                            <Text style={s.displayName}>{displayName}</Text>
                            <Text style={s.joinedText}>
                                Зарегистрирован в {user?.created_at ? new Date(user.created_at).getFullYear() : new Date().getFullYear()} году
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={s.menuList}>
                    {MENU.map((item, idx) => (
                        <TouchableOpacity
                            key={idx}
                            style={[s.menuRow, idx < MENU.length - 1 && s.menuRowBorder]}
                            activeOpacity={0.6}
                            onPress={() => navigation.navigate(item.screen)}
                        >
                            <item.icon size={22} color={NAVY} strokeWidth={1.6} />
                            <Text style={s.menuLabel}>{item.label}</Text>
                            <ChevronRight size={18} color={theme.colors.gray400} />
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={s.bottomBlock}>
                    <TouchableOpacity
                        onPress={handleLogout}
                        disabled={loggingOut}
                        activeOpacity={0.6}
                    >
                        <Text style={s.logoutText}>Выйти</Text>
                    </TouchableOpacity>
                    <Text style={s.versionText}>Версия 1.0.0</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F5F5F5' },
    scroll: { flex: 1 },

    headerWrap: {
        overflow: 'hidden',
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    headerContent: { paddingHorizontal: 24, paddingBottom: 32 },
    headerTitle: {
        fontSize: 26, fontFamily: theme.fonts.bold, color: '#fff',
        marginBottom: 24,
    },

    avatarBlock: { alignItems: 'center' },
    avatarOuter: { position: 'relative', marginBottom: 12 },
    avatarImage: { width: 80, height: 80, borderRadius: 40 },
    avatar: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center', alignItems: 'center',
    },
    avatarLetter: {
        fontSize: 34, fontFamily: theme.fonts.semiBold, color: '#fff',
    },
    avatarBadge: {
        position: 'absolute', bottom: 0, right: -2,
        width: 26, height: 26, borderRadius: 13,
        backgroundColor: theme.colors.star, justifyContent: 'center',
        alignItems: 'center', borderWidth: 2.5, borderColor: NAVY,
    },
    displayName: {
        fontSize: 22, fontFamily: theme.fonts.bold, color: '#fff',
    },
    joinedText: {
        fontSize: 14, fontFamily: theme.fonts.regular,
        color: 'rgba(255,255,255,0.8)', marginTop: 2,
    },

    menuList: { marginTop: 24, paddingHorizontal: 20 },
    menuRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 20,
    },
    menuRowBorder: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#E5E7EB',
    },
    menuLabel: {
        flex: 1, fontSize: 16, fontFamily: theme.fonts.regular,
        color: NAVY, marginLeft: 16,
    },

    bottomBlock: { alignItems: 'center', marginTop: 60 },
    logoutText: {
        fontSize: 16, fontFamily: theme.fonts.semiBold, color: NAVY,
        marginBottom: 6,
    },
    versionText: {
        fontSize: 13, fontFamily: theme.fonts.regular,
        color: theme.colors.gray400,
    },
});

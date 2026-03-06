import React, { useContext, useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    Mail, Settings, Star, User, CreditCard, Clock,
    FileText, Anchor, ChevronRight,
} from 'lucide-react-native';
import { theme } from '../../shared/theme';
import { api } from '../../shared/infrastructure/api';
import { AuthContext } from '../../shared/context/AuthContext';

let LinearGradient;
try { LinearGradient = require('expo-linear-gradient').LinearGradient; } catch (_) {}

const GRADIENT = ['#0A3D3D', '#0D5C5C', '#1A7A6E', '#3A9E7A'];
const TEAL = '#0D5C5C';
const NAVY = '#1B365D';

export default function OwnerDashboardScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { user } = useContext(AuthContext);
    const [stats, setStats] = useState({ completed: 0, earnings: 0, responseRate: null });
    const [reviews, setReviews] = useState(0);
    const [refreshing, setRefreshing] = useState(false);

    const loadStats = async () => {
        try {
            const [bookingsRes, reviewsRes] = await Promise.all([
                api.get('/owner/bookings'),
                api.get('/owner/reviews-count').catch(() => ({ data: { count: 0 } })),
            ]);
            const list = Array.isArray(bookingsRes.data) ? bookingsRes.data : [];
            const completedList = list.filter(b => b.status === 'completed');
            const completed = completedList.length;
            const earnings = completedList.reduce((s, b) => s + (Number(b.total_price) || 0), 0);
            setStats({ completed, earnings, responseRate: null });
            setReviews(reviewsRes.data?.count ?? 0);
        } catch (_) {}
    };

    useEffect(() => { loadStats(); }, []);

    const onRefresh = () => { setRefreshing(true); loadStats().finally(() => setRefreshing(false)); };

    const initial = (user?.name || user?.email || 'O')[0].toUpperCase();
    const displayName = user?.name || user?.email?.split('@')[0] || 'Владелец';

    const MENU = [
        { icon: CreditCard, label: 'Настройки выплат', screen: null },
        { icon: Clock, label: 'История выплат', screen: null },
        { icon: User, label: 'Профиль', screen: 'Account' },
        { icon: FileText, label: 'Налоговые формы', screen: null },
        { icon: Settings, label: 'Ресурсы владельца', screen: null },
    ];

    return (
        <View style={s.root}>
            <ScrollView
                style={s.scroll}
                contentContainerStyle={{ paddingBottom: 32 }}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
            >
                {/* ---- Gradient header ---- */}
                <View style={s.headerWrap}>
                    {LinearGradient ? (
                        <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
                    ) : (
                        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: TEAL }]} />
                    )}

                    <View style={[s.headerContent, { paddingTop: insets.top + 16 }]}>
                        <Text style={s.headerTitle}>Дашборд</Text>

                        {/* Avatar + name */}
                        <View style={s.profileRow}>
                            <View style={s.avatar}>
                                <Text style={s.avatarLetter}>{initial}</Text>
                            </View>
                            <View>
                                <Text style={s.profileName}>{displayName}</Text>
                                <View style={s.reviewsBadge}>
                                    <Star size={12} color="#F5A623" fill="#F5A623" />
                                    <Text style={s.reviewsText}>
                                        {reviews > 0 ? `${reviews} отзывов` : 'НЕТ ОТЗЫВОВ'}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Stats */}
                        <Text style={s.statsLabel}>ВАША СТАТИСТИКА</Text>
                        <View style={s.statsRow}>
                            <View style={s.statCard}>
                                <Text style={s.statValue}>
                                    {stats.responseRate != null ? `${stats.responseRate}%` : 'N/A'}
                                </Text>
                                <Text style={s.statCaption}>Скорость{'\n'}ответа</Text>
                            </View>
                            <View style={[s.statCard, s.statCardMid]}>
                                <Text style={s.statValue}>{stats.completed}</Text>
                                <Text style={s.statCaption}>Завершённых{'\n'}бронирований</Text>
                            </View>
                            <View style={[s.statCard, s.statCardRight]}>
                                <View style={s.statValueRow}>
                                    <Text
                                        style={s.statValue}
                                        numberOfLines={1}
                                        adjustsFontSizeToFit
                                        minimumFontScale={0.5}
                                    >
                                        {Math.round(stats.earnings || 0).toLocaleString('ru-RU')}
                                    </Text>
                                    <Text style={s.statValue}> ₽</Text>
                                </View>
                                <Text style={s.statCaption}>Общий{'\n'}доход</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* ---- Quick actions ---- */}
                <View style={s.actionsRow}>
                    <TouchableOpacity
                        style={s.actionCard}
                        onPress={() => navigation.navigate('Chat')}
                        activeOpacity={0.7}
                    >
                        <Mail size={22} color={TEAL} strokeWidth={1.8} />
                        <Text style={s.actionLabel}>Сообщения</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={s.actionCard}
                        onPress={() => navigation.navigate('Bookings')}
                        activeOpacity={0.7}
                    >
                        <Settings size={22} color={TEAL} strokeWidth={1.8} />
                        <Text style={s.actionLabel}>Бронирования</Text>
                    </TouchableOpacity>
                </View>

                {/* ---- Menu list ---- */}
                <View style={s.menuList}>
                    {MENU.map((item, idx) => (
                        <TouchableOpacity
                            key={idx}
                            style={s.menuRow}
                            onPress={() => {
                                if (item.screen) {
                                    navigation.navigate(item.screen);
                                }
                            }}
                            activeOpacity={0.6}
                        >
                            <item.icon size={22} color={NAVY} strokeWidth={1.6} />
                            <Text style={s.menuLabel}>{item.label}</Text>
                            <ChevronRight size={18} color={theme.colors.gray400} />
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F5F5F5' },
    scroll: { flex: 1 },

    /* Header */
    headerWrap: { overflow: 'hidden', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
    headerContent: { paddingHorizontal: 24, paddingBottom: 28 },
    headerTitle: {
        fontSize: 26, fontFamily: theme.fonts.bold, color: '#fff', marginBottom: 20,
    },
    profileRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    avatar: {
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center',
        alignItems: 'center', marginRight: 14,
    },
    avatarLetter: { fontSize: 24, fontFamily: theme.fonts.bold, color: '#fff' },
    profileName: { fontSize: 20, fontFamily: theme.fonts.semiBold, color: '#fff' },
    reviewsBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    reviewsText: {
        fontSize: 12, fontFamily: theme.fonts.bold, color: 'rgba(255,255,255,0.8)',
        marginLeft: 4, letterSpacing: 0.5,
    },

    statsLabel: {
        fontSize: 11, fontFamily: theme.fonts.bold, color: 'rgba(255,255,255,0.6)',
        letterSpacing: 1.2, marginBottom: 10,
    },
    statsRow: { flexDirection: 'row' },
    statCard: { flex: 1 },
    statCardMid: {
        borderLeftWidth: 1, borderRightWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 14,
    },
    statCardRight: { paddingLeft: 14 },
    statValueRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' },
    statValue: { fontSize: 20, fontFamily: theme.fonts.bold, color: '#fff' },
    statCaption: {
        fontSize: 12, fontFamily: theme.fonts.regular, color: 'rgba(255,255,255,0.7)',
        marginTop: 2, lineHeight: 16,
    },

    /* Quick actions */
    actionsRow: {
        flexDirection: 'row', paddingHorizontal: 20,
        marginTop: -14, gap: 12,
    },
    actionCard: {
        flex: 1, backgroundColor: '#fff', borderRadius: 14,
        paddingVertical: 18, paddingHorizontal: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    },
    actionLabel: {
        fontSize: 15, fontFamily: theme.fonts.medium, color: NAVY, marginTop: 10,
    },

    /* Menu */
    menuList: { marginTop: 20, paddingHorizontal: 20 },
    menuRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 18,
        borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB',
    },
    menuLabel: {
        flex: 1, fontSize: 16, fontFamily: theme.fonts.regular,
        color: NAVY, marginLeft: 16,
    },
});

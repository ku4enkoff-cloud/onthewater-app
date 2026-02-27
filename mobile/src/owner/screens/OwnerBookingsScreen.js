import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    RefreshControl, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react-native';
import { theme } from '../../shared/theme';
import { api } from '../../shared/infrastructure/api';

let LinearGradient;
try { LinearGradient = require('expo-linear-gradient').LinearGradient; } catch (_) {}

const GRADIENT = ['#0A3D3D', '#0D5C5C', '#1A7A6E'];
const TEAL = '#0D5C5C';
const NAVY = '#1B365D';

const TABS = [
    { key: 'pending',    label: 'Ожидают',       status: 'pending' },
    { key: 'editing',    label: 'На изменении',  status: 'editing' },
    { key: 'aboard',     label: 'На борту',      status: 'aboard' },
    { key: 'confirmed',  label: 'Одобренные',    status: 'confirmed' },
    { key: 'completed',  label: 'Завершённые',   status: 'completed' },
    { key: 'declined',   label: 'Отклонённые',   status: 'declined' },
    { key: 'cancelled',  label: 'Отменённые',    status: 'cancelled' },
    { key: 'expired',    label: 'Истёкшие',      status: 'expired' },
];

const EMPTY_MESSAGES = {
    pending:   'Нет бронирований, ожидающих подтверждения.',
    editing:   'Нет бронирований на изменении.',
    aboard:    'Нет активных бронирований на борту.',
    confirmed: 'Нет одобренных бронирований.',
    completed: 'Нет завершённых бронирований.',
    declined:  'Нет отклонённых бронирований.',
    cancelled: 'Нет отменённых бронирований.',
    expired:   'Нет истёкших бронирований.',
};

export default function OwnerBookingsScreen() {
    const insets = useSafeAreaInsets();
    const [bookings, setBookings] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('pending');

    useEffect(() => { fetchBookings(); }, []);

    const fetchBookings = async () => {
        try {
            const res = await api.get('/owner/bookings');
            setBookings(Array.isArray(res.data) ? res.data : []);
        } catch (_) {
            setBookings([]);
        } finally {
            setRefreshing(false);
        }
    };

    const onRefresh = () => { setRefreshing(true); fetchBookings(); };

    const filtered = bookings.filter(b => b.status === activeTab);

    const handleAction = async (id, action) => {
        try {
            if (action === 'accept') {
                await api.post(`/owner/bookings/${id}/confirm`);
                setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'confirmed' } : b));
            } else {
                await api.post(`/owner/bookings/${id}/decline`);
                setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'declined' } : b));
            }
        } catch (_) {}
    };

    const getStatusColor = (status) => ({
        pending: '#E8A838', confirmed: TEAL, completed: theme.colors.gray500,
        cancelled: theme.colors.error, declined: theme.colors.error,
        aboard: '#2196F3', editing: '#FF9800', expired: theme.colors.gray400,
    }[status] || theme.colors.gray400);

    const getStatusIcon = (status) => ({
        pending: Clock, confirmed: CheckCircle, completed: CheckCircle,
        cancelled: XCircle, declined: XCircle, aboard: CheckCircle,
        editing: AlertCircle, expired: AlertCircle,
    }[status] || AlertCircle);

    const getStatusLabel = (status) => ({
        pending: 'Ожидает', confirmed: 'Одобрено', completed: 'Завершено',
        cancelled: 'Отменено', declined: 'Отклонено', aboard: 'На борту',
        editing: 'На изменении', expired: 'Истекло',
    }[status] || status);

    const formatDate = (d) => {
        if (!d) return '—';
        const date = new Date(d);
        return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    const renderCard = ({ item }) => {
        const StatusIcon = getStatusIcon(item.status);
        const color = getStatusColor(item.status);
        return (
            <View style={s.card}>
                <View style={s.cardHeader}>
                    <View style={s.statusRow}>
                        <StatusIcon size={14} color={color} />
                        <Text style={[s.statusText, { color }]}>{getStatusLabel(item.status)}</Text>
                    </View>
                    <Text style={s.cardPrice}>{(item.total_price || 0).toLocaleString('ru-RU')} ₽</Text>
                </View>
                <Text style={s.cardTitle} numberOfLines={2}>{item.boat_title}</Text>
                <Text style={s.cardClient}>Клиент: {item.client_name || '—'}</Text>
                <View style={s.cardDetails}>
                    <View style={s.detailRow}>
                        <Calendar size={14} color={theme.colors.gray400} />
                        <Text style={s.detailText}>{formatDate(item.start_at || item.date_start)}</Text>
                    </View>
                    <View style={s.detailRow}>
                        <Clock size={14} color={theme.colors.gray400} />
                        <Text style={s.detailText}>{item.hours || '—'} ч</Text>
                    </View>
                    <Text style={s.detailText}>
                        Гостей: {item.passengers || item.guests_count || '—'} • Капитан: {(item.captain || item.captain_requested) ? 'Да' : 'Нет'}
                    </Text>
                </View>
                {item.status === 'pending' && (
                    <View style={s.actions}>
                        <TouchableOpacity style={s.acceptBtn} onPress={() => handleAction(item.id, 'accept')} activeOpacity={0.8}>
                            <Text style={s.acceptText}>Подтвердить</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.declineBtn} onPress={() => handleAction(item.id, 'decline')} activeOpacity={0.8}>
                            <Text style={s.declineText}>Отклонить</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={s.root}>
            {/* Header */}
            <View style={s.headerWrap}>
                {LinearGradient ? (
                    <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
                ) : (
                    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: TEAL }]} />
                )}
                <View style={[s.headerContent, { paddingTop: insets.top + 12 }]}>
                    <Text style={s.headerTitle}>Бронирования</Text>
                </View>
            </View>

            {/* Scrollable tabs */}
            <View style={s.tabsWrap}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={s.tabsScroll}
                >
                    {TABS.map((tab) => {
                        const isActive = activeTab === tab.key;
                        return (
                            <TouchableOpacity
                                key={tab.key}
                                style={[s.tab, isActive && s.tabActive]}
                                onPress={() => setActiveTab(tab.key)}
                                activeOpacity={0.7}
                            >
                                <Text style={[s.tabText, isActive && s.tabTextActive]}>
                                    {tab.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* List */}
            <FlatList
                data={filtered}
                renderItem={renderCard}
                keyExtractor={item => String(item.id)}
                contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 100 }]}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} />}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={s.empty}>
                        <Text style={s.emptyText}>{EMPTY_MESSAGES[activeTab]}</Text>
                    </View>
                }
            />
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F5F5F5' },

    headerWrap: { overflow: 'hidden' },
    headerContent: { paddingHorizontal: 24, paddingBottom: 16 },
    headerTitle: { fontSize: 22, fontFamily: theme.fonts.bold, color: '#fff', textAlign: 'center' },

    tabsWrap: {
        backgroundColor: '#fff',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#E5E7EB',
    },
    tabsScroll: { paddingHorizontal: 16 },
    tab: {
        paddingVertical: 14, paddingHorizontal: 14,
        borderBottomWidth: 2.5, borderBottomColor: 'transparent',
        marginRight: 4,
    },
    tabActive: { borderBottomColor: TEAL },
    tabText: {
        fontSize: 14, fontFamily: theme.fonts.medium, color: theme.colors.gray400,
        whiteSpace: 'nowrap',
    },
    tabTextActive: { color: TEAL, fontFamily: theme.fonts.semiBold },

    list: { paddingHorizontal: 20, paddingTop: 16 },

    card: {
        backgroundColor: '#fff', borderRadius: 16, padding: 16,
        marginBottom: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 10,
    },
    statusRow: { flexDirection: 'row', alignItems: 'center' },
    statusText: {
        fontSize: 12, fontFamily: theme.fonts.bold, marginLeft: 4,
        letterSpacing: 0.3,
    },
    cardPrice: { fontSize: 20, fontFamily: theme.fonts.bold, color: NAVY },
    cardTitle: { fontSize: 16, fontFamily: theme.fonts.semiBold, color: NAVY, marginBottom: 4 },
    cardClient: { fontSize: 13, fontFamily: theme.fonts.regular, color: theme.colors.gray500, marginBottom: 8 },
    cardDetails: { marginTop: 4 },
    detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    detailText: { fontSize: 13, fontFamily: theme.fonts.regular, color: theme.colors.gray500, marginLeft: 6 },

    actions: { flexDirection: 'row', marginTop: 14, gap: 10 },
    acceptBtn: {
        flex: 1, backgroundColor: TEAL, paddingVertical: 12,
        borderRadius: 10, alignItems: 'center',
    },
    acceptText: { fontSize: 14, fontFamily: theme.fonts.bold, color: '#fff' },
    declineBtn: {
        flex: 1, backgroundColor: '#fff', paddingVertical: 12,
        borderRadius: 10, alignItems: 'center',
        borderWidth: 1.2, borderColor: theme.colors.error,
    },
    declineText: { fontSize: 14, fontFamily: theme.fonts.bold, color: theme.colors.error },

    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 160 },
    emptyText: { fontSize: 15, fontFamily: theme.fonts.regular, color: theme.colors.gray400, textAlign: 'center' },
});

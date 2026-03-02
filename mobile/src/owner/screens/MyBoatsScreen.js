import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, Image,
    TouchableOpacity, RefreshControl, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Plus, Pencil, MapPin, Ship, Anchor } from 'lucide-react-native';
import { theme } from '../../shared/theme';
import { api } from '../../shared/infrastructure/api';
import { API_BASE } from '../../shared/infrastructure/config';

let LinearGradient = null;
try { LinearGradient = require('expo-linear-gradient').LinearGradient; } catch (_) {}

const GRADIENT = ['#0A4D4D', '#0D5C5C', '#1A7A5A'];
const TEAL = '#0D5C5C';

const photoUrl = (src) => {
    if (!src) return 'https://placehold.co/400x300/png';
    if (src.startsWith('http')) return src;
    return API_BASE + src;
};

const DURATION_LABELS = {
    30: '30 мин', 60: '1 час', 120: '2 часа', 180: '3 часа', 240: '4 часа', 300: '5 часов',
};
const getDurationLabel = (minutes) => {
    const m = Number(minutes) || 60;
    if (DURATION_LABELS[m]) return DURATION_LABELS[m];
    if (m < 60) return `${m} мин`;
    const h = Math.floor(m / 60);
    if (h === 1) return '1 час';
    if (h >= 2 && h <= 4) return `${h} часа`;
    return `${h} часов`;
};

export default function MyBoatsScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const [boats, setBoats] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    useFocusEffect(useCallback(() => { fetchMyBoats(); }, []));

    const fetchMyBoats = async () => {
        try {
            const res = await api.get('/boats');
            setBoats(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            console.log('Error fetching boats', e);
            setBoats([]);
        } finally {
            setRefreshing(false);
        }
    };

    const onRefresh = () => { setRefreshing(true); fetchMyBoats(); };

    const renderBoatCard = ({ item }) => (
        <TouchableOpacity
            style={s.card}
            onPress={() => navigation.navigate('BoatDetail', { boatId: item.id })}
            activeOpacity={0.85}
        >
            <Image source={{ uri: photoUrl(item.photos?.[0]) }} style={s.cardImage} />
            <View style={s.statusBadge}>
                <Text style={s.statusText}>
                    {item.status === 'moderation' ? 'На модерации' : item.status === 'active' ? 'Активно' : item.status || 'Активно'}
                </Text>
            </View>
            <View style={s.cardBody}>
                <Text style={s.cardTitle} numberOfLines={1}>{item.title}</Text>
                <View style={s.cardInfoRow}>
                    <MapPin size={14} color="#9CA3AF" />
                    <Text style={s.cardInfoText}>{item.location_city || 'Не указан'}</Text>
                </View>
                <View style={s.cardFooter}>
                    <Text style={s.cardPrice}>
                        {item.price_weekend != null && String(item.price_weekend).trim() !== ''
                            ? `${item.price_per_hour ?? '—'} ₽ будни · ${item.price_weekend} ₽ вых.`
                            : item.price_per_hour ? `${item.price_per_hour} ₽` : '—'}
                        <Text style={s.cardPriceUnit}>
                            {item.price_per_hour != null || item.price_weekend != null
                                ? ` / ${getDurationLabel(item.schedule_min_duration ?? 60)}`
                                : ''}
                        </Text>
                    </Text>
                    <TouchableOpacity
                        style={s.editBtn}
                        onPress={() => navigation.navigate('EditBoat', { boatId: item.id })}
                        activeOpacity={0.7}
                    >
                        <Pencil size={15} color={TEAL} />
                        <Text style={s.editBtnText}>Изменить</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );

    const renderHeader = () => (
        <View style={s.headerWrap}>
            {LinearGradient ? (
                <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
            ) : (
                <View style={[StyleSheet.absoluteFillObject, { backgroundColor: TEAL }]} />
            )}
            <View style={[s.headerInner, { paddingTop: insets.top + 12 }]}>
                <Text style={s.headerTitle}>Мой флот</Text>
                <Text style={s.headerSubtitle}>
                    {boats.length === 0
                        ? 'Добавьте свой первый катер'
                        : `${boats.length} ${boats.length === 1 ? 'катер' : boats.length < 5 ? 'катера' : 'катеров'}`}
                </Text>
            </View>
        </View>
    );

    if (boats.length === 0 && !refreshing) {
        return (
            <View style={s.root}>
                {renderHeader()}
                <View style={s.emptyWrap}>
                    <View style={s.emptyIcon}>
                        <Anchor size={48} color={TEAL} strokeWidth={1.2} />
                    </View>
                    <Text style={s.emptyTitle}>Пока нет катеров</Text>
                    <Text style={s.emptyHint}>Добавьте ваш первый катер, чтобы начать принимать бронирования</Text>
                    <TouchableOpacity style={s.emptyBtn} onPress={() => navigation.navigate('BoatType')} activeOpacity={0.85}>
                        <Plus size={20} color="#fff" />
                        <Text style={s.emptyBtnText}>Добавить катер</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={s.root}>
            {renderHeader()}
            <FlatList
                data={boats}
                renderItem={renderBoatCard}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={s.list}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} />}
            />
            <TouchableOpacity
                style={[s.fab, { bottom: Math.max(insets.bottom, 16) + 12 }]}
                onPress={() => navigation.navigate('BoatType')}
                activeOpacity={0.85}
            >
                <Plus size={26} color="#fff" />
            </TouchableOpacity>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F5F5F7' },

    headerWrap: { overflow: 'hidden' },
    headerInner: { paddingHorizontal: 20, paddingBottom: 24 },
    headerTitle: { fontSize: 28, fontFamily: theme.fonts.bold, color: '#fff', lineHeight: 36, marginBottom: 4 },
    headerSubtitle: { fontSize: 14, fontFamily: theme.fonts.regular, color: 'rgba(255,255,255,0.8)' },

    list: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 },

    card: {
        backgroundColor: '#fff', borderRadius: 16, marginBottom: 14, overflow: 'hidden',
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8 },
            android: { elevation: 3 },
        }),
    },
    cardImage: { width: '100%', height: 170, resizeMode: 'cover' },
    statusBadge: {
        position: 'absolute', top: 12, left: 12,
        backgroundColor: 'rgba(13,92,92,0.85)', borderRadius: 8,
        paddingHorizontal: 10, paddingVertical: 4,
    },
    statusText: { fontSize: 11, fontFamily: theme.fonts.semiBold, color: '#fff' },
    cardBody: { padding: 14 },
    cardTitle: { fontSize: 17, fontFamily: theme.fonts.semiBold, color: '#1B365D', marginBottom: 6 },
    cardInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 },
    cardInfoText: { fontSize: 13, fontFamily: theme.fonts.regular, color: '#9CA3AF' },
    cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    cardPrice: { fontSize: 18, fontFamily: theme.fonts.bold, color: '#1B365D' },
    cardPriceUnit: { fontSize: 13, fontFamily: theme.fonts.regular, color: '#9CA3AF' },
    editBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        borderWidth: 1, borderColor: TEAL, borderRadius: 10,
        paddingHorizontal: 14, paddingVertical: 8,
    },
    editBtnText: { fontSize: 13, fontFamily: theme.fonts.semiBold, color: TEAL },

    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
    emptyIcon: {
        width: 90, height: 90, borderRadius: 45, backgroundColor: '#F0F9F8',
        alignItems: 'center', justifyContent: 'center', marginBottom: 20,
    },
    emptyTitle: { fontSize: 20, fontFamily: theme.fonts.semiBold, color: '#1B365D', marginBottom: 8 },
    emptyHint: { fontSize: 14, fontFamily: theme.fonts.regular, color: '#9CA3AF', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
    emptyBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: TEAL, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 24,
    },
    emptyBtnText: { fontSize: 15, fontFamily: theme.fonts.semiBold, color: '#fff' },

    fab: {
        position: 'absolute', right: 20,
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center',
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
            android: { elevation: 6 },
        }),
    },
});

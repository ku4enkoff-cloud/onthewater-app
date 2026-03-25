import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Star } from 'lucide-react-native';
import { theme } from '../../shared/theme';
import { api } from '../../shared/infrastructure/api';

let LinearGradient;
try { LinearGradient = require('expo-linear-gradient').LinearGradient; } catch (_) {}

const GRADIENT = ['#0A3D3D', '#0D5C5C', '#1A7A6E', '#3A9E7A'];
const TEAL = '#0D5C5C';
const NAVY = '#1B365D';

function formatDate(iso) {
    if (!iso) return '';
    try {
        const d = new Date(iso);
        return d.toLocaleString('ru-RU', { dateStyle: 'medium' });
    } catch {
        return '';
    }
}

export default function OwnerReviewsScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/owner/reviews');
            setList(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            setError(e.response?.data?.error || e.message || 'Ошибка загрузки отзывов');
            setList([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const onRefresh = () => {
        setRefreshing(true);
        api.get('/owner/reviews').then((res) => {
            setList(Array.isArray(res.data) ? res.data : []);
        }).catch((e) => {
            setError(e.response?.data?.error || e.message || 'Ошибка обновления');
            setList([]);
        }).finally(() => setRefreshing(false));
    };

    const renderStatus = (status) => {
        // В бэкенде для списка owner — только approved или NULL.
        if (!status) return <Text style={styles.statusText}>Одобрен</Text>;
        if (status === 'approved') return <Text style={styles.statusText}>Одобрен</Text>;
        if (status === 'pending') return <Text style={[styles.statusText, styles.statusPending]}>Ожидает</Text>;
        return <Text style={styles.statusText}>{status}</Text>;
    };

    return (
        <View style={styles.root}>
            <View style={styles.headerWrap}>
                {LinearGradient ? (
                    <LinearGradient
                        colors={GRADIENT}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFillObject}
                    />
                ) : (
                    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: TEAL }]} />
                )}

                <View style={[styles.headerInner, { paddingTop: insets.top + 4 }]}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.backBtn}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                        <ChevronLeft size={24} color="#fff" />
                        <Text style={styles.backText}>Назад</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Отзывы</Text>
                    <View style={{ width: 70 }} />
                </View>
            </View>

            {loading && list.length === 0 ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={TEAL} />
                </View>
            ) : (
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                >
                    <View style={styles.section}>
                        {error ? <Text style={styles.errorText}>{error}</Text> : null}
                        {!error && list.length === 0 ? (
                            <Text style={styles.emptyText}>Пока нет отзывов по вашим судам.</Text>
                        ) : null}

                        {list.map((r) => (
                            <View key={r.id} style={styles.card}>
                                <View style={styles.cardHeader}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.boatTitle}>{r.boat_title || 'Катер'}</Text>
                                        <Text style={styles.meta}>
                                            {r.user_name ? `От: ${r.user_name}` : 'Клиент'}{r.created_at ? ` · ${formatDate(r.created_at)}` : ''}
                                        </Text>
                                    </View>
                                    <View style={styles.ratingWrap}>
                                        <Star size={16} color="#F5A623" fill="#F5A623" />
                                        <Text style={styles.ratingText}>{r.rating ?? '—'}</Text>
                                    </View>
                                </View>

                                <View style={styles.statusRow}>{renderStatus(r.status)}</View>

                                {r.text ? (
                                    <Text style={styles.bodyText}>
                                        {String(r.text)}
                                    </Text>
                                ) : (
                                    <Text style={styles.bodyMuted}>Текст отзыва отсутствует.</Text>
                                )}
                            </View>
                        ))}
                    </View>
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#fff' },
    headerWrap: { overflow: 'hidden' },
    headerInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 14,
    },
    backBtn: { flexDirection: 'row', alignItems: 'center', width: 70 },
    backText: { fontSize: 15, fontFamily: theme.fonts.regular, color: '#fff', marginLeft: 2 },
    headerTitle: { fontSize: 18, fontFamily: theme.fonts.bold, color: '#fff' },

    scroll: { flex: 1 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    section: { paddingHorizontal: 24, paddingTop: 20 },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: 16,
        marginBottom: 14,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
    boatTitle: { fontSize: 16, fontFamily: theme.fonts.bold, color: NAVY, marginBottom: 4 },
    meta: { fontSize: 12, fontFamily: theme.fonts.regular, color: theme.colors.gray500 },

    ratingWrap: { flexDirection: 'row', alignItems: 'center', marginLeft: 10 },
    ratingText: { fontSize: 14, fontFamily: theme.fonts.semiBold, color: NAVY },

    statusRow: { marginTop: 10, marginBottom: 10 },
    statusText: { fontSize: 12, fontFamily: theme.fonts.medium, color: TEAL },
    statusPending: { color: '#b45309' },

    bodyText: {
        fontSize: 14,
        fontFamily: theme.fonts.regular,
        color: '#111827',
        lineHeight: 20,
    },
    bodyMuted: { fontSize: 14, fontFamily: theme.fonts.regular, color: theme.colors.gray500, lineHeight: 20 },
    emptyText: { fontSize: 14, fontFamily: theme.fonts.regular, color: theme.colors.gray500, marginTop: 20 },
    errorText: { fontSize: 14, fontFamily: theme.fonts.regular, color: '#b91c1c', marginTop: 20 },
});


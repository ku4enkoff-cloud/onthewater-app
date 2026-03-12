import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, RefreshControl } from 'react-native';
import { theme } from '../../../theme';
import { api } from '../../../infrastructure/api';
import { getPhotoUrl } from '../../../shared/infrastructure/config';
import { Calendar, Clock, MapPin } from 'lucide-react-native';

const resolvePhotoUri = (src) => getPhotoUrl(src) || 'https://placehold.co/400x200';

export default function BookingsScreen({ navigation }) {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchBookings();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchBookings();
        setRefreshing(false);
    };

    const fetchBookings = async () => {
        try {
            const res = await api.get('/bookings');
            setBookings(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            console.log('Error fetching bookings', e);
            setBookings([]);
        } finally {
            setLoading(false);
        }
    };

    const getStatusText = (status) => {
        const statuses = {
            'pending_payment': 'Ожидает оплаты',
            'pending': 'На рассмотрении',
            'confirmed': 'Подтверждено',
            'active': 'Активно',
            'completed': 'Завершено',
            'cancelled': 'Отменено'
        };
        return statuses[status] || status;
    };

    const getStatusColor = (status) => {
        const colors = {
            'pending_payment': theme.colors.textMuted,
            'pending': '#FF9800',
            'confirmed': theme.colors.success,
            'active': theme.colors.primary,
            'completed': theme.colors.textMuted,
            'cancelled': theme.colors.error
        };
        return colors[status] || theme.colors.textMuted;
    };

    const startAt = (item) => item.start_at || item.date_start;
    const formatDate = (dateString) => {
        if (!dateString) return '—';
        const d = new Date(dateString);
        return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
    };
    const formatTime = (dateString) => {
        if (!dateString) return '—';
        const d = new Date(dateString);
        return isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    };
    const durationMinutes = (item) => {
        const raw = item.hours;
        if (raw == null) return item.date_end && item.date_start ? Math.round((new Date(item.date_end) - new Date(item.date_start)) / (1000 * 60)) : null;
        const n = Number(raw);
        if (Number.isNaN(n)) return null;
        if (n <= 24 && n > 0 && n % 1 === 0) return n * 60;
        return n;
    };
    const endAt = (item) => {
        const s = startAt(item);
        const mins = durationMinutes(item);
        if (!s || mins == null) return null;
        const start = new Date(s);
        if (isNaN(start.getTime())) return null;
        return new Date(start.getTime() + mins * 60 * 1000);
    };
    const durationLabel = (item) => {
        const mins = durationMinutes(item);
        if (mins == null) return '—';
        if (mins < 60) return `${mins} мин`;
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        if (m === 0) return `${h} ч`;
        return `${h} ч ${m} мин`;
    };

    const renderBookingCard = ({ item }) => {
        const start = startAt(item);
        const end = endAt(item);
        const photoUri = resolvePhotoUri(item.boat_photo || item.boat_image);
        return (
        <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('BookingDetail', { bookingId: item.id })}
        >
            <Image source={{ uri: photoUri }} style={styles.cardImage} />
            <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                    <Text style={theme.typography.h3} numberOfLines={1}>{item.boat_title}</Text>
                    <Text style={[theme.typography.h2, { color: theme.colors.primary }]}>
                        {item.total_price != null ? Number(item.total_price).toLocaleString('ru-RU') : '—'} ₽
                    </Text>
                </View>
                <View style={styles.infoRow}>
                    <Calendar size={16} color={theme.colors.textMuted} />
                    <Text style={styles.infoText}>
                        {formatDate(start)}
                        {start && formatTime(start) !== '—' && end
                            ? ` • ${formatTime(start)} – ${formatTime(end.toISOString())}`
                            : start && formatTime(start) !== '—'
                                ? ` • ${formatTime(start)}`
                                : ''}
                    </Text>
                </View>
                <View style={styles.infoRow}>
                    <Clock size={16} color={theme.colors.textMuted} />
                    <Text style={styles.infoText}>{durationLabel(item)}</Text>
                </View>
                {(() => {
                    const addr = [item.location_country, item.location_region, item.location_city, item.location_address, item.location_yacht_club].filter(Boolean).join(', ');
                    if (!addr) return null;
                    return (
                        <View style={styles.infoRow}>
                            <MapPin size={16} color={theme.colors.textMuted} />
                            <Text style={styles.infoText}>{addr}</Text>
                        </View>
                    );
                })()}
                
                <View style={styles.statusContainer}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                            {getStatusText(item.status)}
                        </Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={theme.typography.h1}>Мои бронирования</Text>
                <Text style={[theme.typography.body, { color: theme.colors.textMuted, marginTop: 4 }]}>
                    {bookings.length} {bookings.length === 1 ? 'бронирование' : 
                    bookings.length > 1 && bookings.length < 5 ? 'бронирования' : 'бронирований'}
                </Text>
            </View>
            
            <FlatList
                data={bookings}
                renderItem={renderBookingCard}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
                ListEmptyComponent={!loading && bookings.length === 0 ? (
                    <View style={{ paddingVertical: 48, alignItems: 'center' }}>
                        <Text style={[theme.typography.body, { color: theme.colors.textMuted }]}>Пока нет бронирований</Text>
                    </View>
                ) : null}
            />
        </View>
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
        paddingBottom: theme.spacing.md,
    },
    listContainer: {
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: 100,
    },
    card: {
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.lg,
        marginBottom: theme.spacing.md,
        ...theme.shadows.card,
        overflow: 'hidden',
    },
    cardImage: {
        width: '100%',
        height: 200,
        resizeMode: 'cover',
    },
    cardContent: {
        padding: theme.spacing.md,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.sm,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    infoText: {
        ...theme.typography.bodySm,
        marginLeft: 8,
    },
    statusContainer: {
        marginTop: theme.spacing.md,
        alignItems: 'flex-start',
    },
    statusBadge: {
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 4,
        borderRadius: theme.borderRadius.pill,
    },
    statusText: {
        ...theme.typography.caption,
        fontWeight: '600',
    },
});
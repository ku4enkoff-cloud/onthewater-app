import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, RefreshControl, Linking, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../shared/theme';
import { api } from '../../shared/infrastructure/api';
import { getPhotoUrl } from '../../shared/infrastructure/config';
import { AuthContext } from '../../shared/context/AuthContext';
import UnauthorizedCard from '../../shared/components/UnauthorizedCard';
import { Calendar, Clock, MapPin } from 'lucide-react-native';

const resolvePhotoUri = (src) => getPhotoUrl(src) || 'https://placehold.co/400x200';

export default function BookingsScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { user } = useContext(AuthContext);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => { if (user) fetchBookings(); else setLoading(false); }, [user]);

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
        const statuses = { 'pending_payment': 'Ожидает оплаты', 'pending': 'На рассмотрении', 'confirmed': 'Подтверждено', 'active': 'Активно', 'completed': 'Завершено', 'cancelled': 'Отменено' };
        return statuses[status] || status;
    };

    const getStatusColor = (status) => {
        const colors = { 'pending_payment': theme.colors.textMuted, 'pending': '#FF9800', 'confirmed': theme.colors.success, 'active': theme.colors.primary, 'completed': theme.colors.textMuted, 'cancelled': theme.colors.error };
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
        const photoSrc = item.boat_photo || item.boat_image;
        const photoUri = resolvePhotoUri(typeof photoSrc === 'string' ? photoSrc : (photoSrc?.location || photoSrc?.url)) || 'https://placehold.co/400x200?text=Фото';
        return (
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('BookingDetail', { bookingId: item.id })} activeOpacity={0.8}>
            <Image source={{ uri: photoUri }} style={styles.cardImage} />
            <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.boat_title}</Text>
                    <Text style={styles.cardPrice}>{item.total_price != null ? Number(item.total_price).toLocaleString('ru-RU') : '—'} ₽</Text>
                </View>
                <View style={styles.infoRow}>
                    <Calendar size={16} color={theme.colors.gray500} />
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
                    <Clock size={16} color={theme.colors.gray500} />
                    <Text style={styles.infoText}>{durationLabel(item)}</Text>
                </View>
                {(() => {
                    const addr = [
                        item.location_country ?? item.locationCountry,
                        item.location_region ?? item.locationRegion,
                        item.location_city ?? item.locationCity,
                        item.location_address ?? item.locationAddress,
                    ].filter(Boolean).join(', ');
                    if (!addr) return null;
                    const openNav = async () => {
                        const navUrl = item.lat != null && item.lng != null
                            ? `yandexnavi://build_route_on_map?lat_to=${item.lat}&lon_to=${item.lng}`
                            : `yandexnavi://map_search?text=${encodeURIComponent(addr)}`;
                        const mapsUrl = item.lat != null && item.lng != null
                            ? `https://yandex.ru/maps/?pt=${item.lng},${item.lat}&z=16`
                            : `https://yandex.ru/maps/?text=${encodeURIComponent(addr)}`;
                        try {
                            const canOpen = await Linking.canOpenURL('yandexnavi://');
                            await Linking.openURL(canOpen ? navUrl : mapsUrl);
                        } catch {
                            Linking.openURL(mapsUrl).catch(() => Alert.alert('Ошибка', 'Не удалось открыть карту'));
                        }
                    };
                    return (
                        <TouchableOpacity style={styles.infoRow} onPress={openNav} activeOpacity={0.7}>
                            <MapPin size={16} color={theme.colors.primary} />
                            <Text style={[styles.infoText, styles.addressLink]} numberOfLines={2}>{addr}</Text>
                        </TouchableOpacity>
                    );
                })()}
                <View style={styles.statusContainer}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{getStatusText(item.status)}</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
        );
    };

    if (!user) {
        return (
            <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Брони</Text>
                </View>
                <UnauthorizedCard
                    label="У ВАС НЕТ БРОНИРОВАНИЙ"
                    message="Войдите, чтобы видеть список своих бронирований"
                    onSignIn={() => navigation.navigate('Login', { fromProfile: true })}
                />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
                <Text style={styles.headerTitle}>Мои бронирования</Text>
                <Text style={styles.headerSubtitle}>
                    {bookings.length} {bookings.length === 1 ? 'бронирование' : bookings.length > 1 && bookings.length < 5 ? 'бронирования' : 'бронирований'}
                </Text>
            </View>
            <FlatList
                data={bookings}
                renderItem={renderBookingCard}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={[styles.listContainer, { paddingBottom: insets.bottom + 88 }]}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
                ListEmptyComponent={
                    !loading && bookings.length === 0 ? (
                        <View style={styles.empty}>
                            <View style={styles.emptyIconWrap}>
                                <Calendar size={48} color={theme.colors.gray400} />
                            </View>
                            <Text style={styles.emptyTitle}>Пока нет бронирований</Text>
                            <Text style={styles.emptySubtitle}>Забронируйте катер с главной страницы</Text>
                            <TouchableOpacity style={styles.emptyButton} onPress={() => navigation.navigate('Search')}>
                                <Text style={styles.emptyButtonText}>Смотреть катера</Text>
                            </TouchableOpacity>
                        </View>
                    ) : null
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.gray50 },
    header: {
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.gray100,
    },
    headerTitle: { fontSize: 22, fontFamily: theme.fonts.bold, color: theme.colors.gray900 },
    headerSubtitle: { fontSize: 14, color: theme.colors.gray500, marginTop: 4 },
    listContainer: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md },
    card: {
        backgroundColor: '#fff',
        borderRadius: 20,
        marginBottom: theme.spacing.md,
        overflow: 'hidden',
        ...theme.shadows.card,
    },
    cardImage: { width: '100%', height: 180, resizeMode: 'cover' },
    cardContent: { padding: theme.spacing.md },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: theme.spacing.sm },
    cardTitle: { flex: 1, fontSize: 18, fontFamily: theme.fonts.semiBold, color: theme.colors.gray900, marginRight: 8 },
    cardPrice: { fontSize: 18, fontFamily: theme.fonts.bold, color: theme.colors.primary },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
    infoText: { fontSize: 14, color: theme.colors.gray500, marginLeft: 8 },
    addressLink: { color: theme.colors.primary, textDecorationLine: 'underline', flex: 1 },
    statusContainer: { marginTop: theme.spacing.md, alignItems: 'flex-start' },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    statusText: { fontSize: 12, fontFamily: theme.fonts.semiBold },
    empty: { paddingVertical: theme.spacing.xxl, alignItems: 'center' },
    emptyIconWrap: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: theme.colors.gray100,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: theme.spacing.lg,
    },
    emptyTitle: { fontSize: 18, fontFamily: theme.fonts.bold, color: theme.colors.gray900, marginBottom: theme.spacing.sm },
    emptySubtitle: { fontSize: 14, color: theme.colors.gray500, marginBottom: theme.spacing.lg, textAlign: 'center' },
    emptyButton: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: theme.borderRadius.xl,
    },
    emptyButtonText: { color: '#FFFFFF', fontFamily: theme.fonts.bold, fontSize: 16 },
});

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../shared/theme';
import { api } from '../../shared/infrastructure/api';
import { API_BASE } from '../../shared/infrastructure/config';
import { Calendar, Clock, MapPin, ArrowLeft, CalendarPlus } from 'lucide-react-native';

const resolvePhotoUri = (src) => {
    if (!src || typeof src !== 'string') return null;
    const s = src.trim();
    if (!s) return null;
    if (/^https?:\/\//i.test(s)) return s;
    return API_BASE + (s.startsWith('/') ? s : '/' + s);
};

export default function BookingDetailScreen({ route, navigation }) {
    const { bookingId } = route.params || {};
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (bookingId) fetchBooking();
    }, [bookingId]);

    const fetchBooking = async () => {
        try {
            const res = await api.get(`/bookings/${bookingId}`);
            setBooking(res.data);
        } catch (e) {
            console.log('Error fetching booking', e);
            setBooking(null);
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

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const startAt = booking?.start_at || booking?.date_start;
    const durationMinutes = (b) => {
        const raw = b?.hours;
        if (raw == null) return null;
        const n = Number(raw);
        if (Number.isNaN(n)) return null;
        if (n <= 24 && n > 0 && n % 1 === 0) return n * 60;
        return n;
    };
    const endAt = (b) => {
        const s = b?.start_at || b?.date_start;
        const mins = durationMinutes(b);
        if (!s || mins == null) return b?.date_end ? new Date(b.date_end) : null;
        const start = new Date(s);
        if (isNaN(start.getTime())) return null;
        return new Date(start.getTime() + mins * 60 * 1000);
    };
    const durationLabel = (b) => {
        const mins = durationMinutes(b);
        if (mins == null) return '—';
        if (mins < 60) return `${mins} мин`;
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        if (m === 0) return `${h} ч`;
        return `${h} ч ${m} мин`;
    };

    const handleCancel = () => {
        Alert.alert(
            'Отмена бронирования',
            'Вы уверены, что хотите отменить бронирование?',
            [
                { text: 'Нет', style: 'cancel' },
                {
                    text: 'Да, отменить',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.post(`/bookings/${bookingId}/cancel`);
                            Alert.alert('Готово', 'Бронирование отменено');
                            navigation.goBack();
                        } catch (e) {
                            Alert.alert('Ошибка', e.response?.data?.error || 'Не удалось отменить');
                        }
                    }
                }
            ]
        );
    };

    const handleAddToCalendar = () => {
        const start = startAt ? new Date(startAt) : null;
        const end = endAt(booking);
        if (!start || isNaN(start.getTime()) || !end) {
            Alert.alert('Ошибка', 'Не удалось определить дату бронирования');
            return;
        }
        const formatGoogleDate = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
        const title = encodeURIComponent(`Аренда: ${booking.boat_title || 'Катер'}`);
        const dates = `${formatGoogleDate(start)}/${formatGoogleDate(end)}`;
        const location = encodeURIComponent([booking.location_address, booking.location_yacht_club, booking.location_city].filter(Boolean).join(', ') || '');
        const details = encodeURIComponent(`Бронирование катера. Стоимость: ${booking.total_price != null ? Number(booking.total_price).toLocaleString('ru-RU') : ''} ₽`);
        const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}${location ? `&location=${location}` : ''}`;
        Linking.openURL(url).catch(() => Alert.alert('Ошибка', 'Не удалось открыть календарь'));
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    if (!booking) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <ArrowLeft size={24} color={theme.colors.textMain} />
                </TouchableOpacity>
                <Text style={theme.typography.h2}>Бронирование не найдено</Text>
            </SafeAreaView>
        );
    }

    const statusColor = getStatusColor(booking.status);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <ArrowLeft size={24} color={theme.colors.textMain} />
                </TouchableOpacity>
                <Text style={theme.typography.h2} numberOfLines={1}>Бронирование</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                <Image
                    source={{ uri: resolvePhotoUri(booking.boat_photo || booking.boat_image) || 'https://placehold.co/400x300/png' }}
                    style={styles.heroImage}
                />
                <View style={styles.content}>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                        <Text style={[styles.statusText, { color: statusColor }]}>
                            {getStatusText(booking.status)}
                        </Text>
                    </View>

                    <Text style={theme.typography.h1}>{booking.boat_title}</Text>
                    <Text style={[theme.typography.h2, { color: theme.colors.primary, marginTop: 8 }]}>
                        {Number(booking.total_price).toLocaleString('ru-RU')} ₽
                    </Text>

                    <View style={styles.divider} />

                    <View style={styles.infoRow}>
                        <Calendar size={20} color={theme.colors.textMuted} />
                        <Text style={styles.infoText}>
                            {startAt ? formatDate(startAt) : '—'}
                            {endAt(booking) ? ` — ${formatDate(endAt(booking).toISOString())}` : ''}
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Clock size={20} color={theme.colors.textMuted} />
                        <Text style={styles.infoText}>
                            {startAt && formatTime(startAt) !== '—' && endAt(booking)
                                ? `${formatTime(startAt)} – ${formatTime(endAt(booking).toISOString())}`
                                : startAt ? formatTime(startAt) : '—'}
                            {durationLabel(booking) !== '—' ? ` (${durationLabel(booking)})` : ''}
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <MapPin size={20} color={theme.colors.textMuted} />
                        <Text style={styles.infoText}>
                            {[booking.location_address, booking.location_yacht_club, booking.location_city].filter(Boolean).join(', ') || 'Адрес не указан'}
                        </Text>
                    </View>

                    {(booking.status === 'confirmed' || booking.status === 'active') ? (
                        <TouchableOpacity style={styles.addToCalendarButton} onPress={handleAddToCalendar}>
                            <CalendarPlus size={20} color={theme.colors.primary} />
                            <Text style={styles.addToCalendarButtonText}>Добавить в календарь</Text>
                        </TouchableOpacity>
                    ) : null}
                    {booking.status === 'pending' || booking.status === 'pending_payment' ? (
                        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                            <Text style={styles.cancelButtonText}>Отменить бронирование</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
    },
    backButton: { padding: 8 },
    scroll: { flex: 1 },
    heroImage: { width: '100%', height: 220, resizeMode: 'cover' },
    content: { padding: theme.spacing.lg },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 6,
        borderRadius: theme.borderRadius.pill,
        marginBottom: theme.spacing.md,
    },
    statusText: { ...theme.typography.bodySm, fontWeight: '600' },
    divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: theme.spacing.lg },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm },
    infoText: { ...theme.typography.body, marginLeft: theme.spacing.sm, flex: 1 },
    addToCalendarButton: {
        marginTop: theme.spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: theme.spacing.md,
        backgroundColor: theme.colors.primary + '18',
        borderRadius: theme.borderRadius.md,
        gap: 8,
    },
    addToCalendarButtonText: { color: theme.colors.primary, fontWeight: '600', fontSize: 16 },
    cancelButton: {
        marginTop: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.error,
        borderRadius: theme.borderRadius.md,
    },
    cancelButtonText: { color: theme.colors.error, fontWeight: '600' },
});

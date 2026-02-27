import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../../theme';
import { api } from '../../../infrastructure/api';
import { Calendar, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react-native';

export default function OwnerBookingsScreen() {
    const [bookings, setBookings] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedTab, setSelectedTab] = useState('pending'); // 'pending', 'upcoming', 'completed'

    useEffect(() => {
        fetchBookings();
    }, []);

    const fetchBookings = async () => {
        try {
            const res = await api.get('/owner/bookings');
            setBookings(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            console.log('Error fetching bookings', e);
            setBookings([]);
        } finally {
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchBookings();
    };

    const filteredBookings = bookings.filter(booking => {
        if (selectedTab === 'pending') return booking.status === 'pending';
        if (selectedTab === 'upcoming') return booking.status === 'confirmed';
        if (selectedTab === 'completed') return booking.status === 'completed';
        return true;
    });

    const getStatusIcon = (status) => {
        const icons = {
            'pending': Clock,
            'confirmed': CheckCircle,
            'completed': CheckCircle,
            'cancelled': XCircle,
        };
        return icons[status] || AlertCircle;
    };

    const getStatusColor = (status) => {
        const colors = {
            'pending': '#FF9800',
            'confirmed': theme.colors.success,
            'completed': theme.colors.textMuted,
            'cancelled': theme.colors.error,
        };
        return colors[status] || theme.colors.textMuted;
    };

    const getStatusText = (status) => {
        const statuses = {
            'pending': 'Ожидает подтверждения',
            'confirmed': 'Подтверждено',
            'completed': 'Завершено',
            'cancelled': 'Отменено',
        };
        return statuses[status] || status;
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const formatTimeRange = (start, end) => {
        const startDate = new Date(start);
        const endDate = new Date(end);
        return `${startDate.getHours()}:${startDate.getMinutes().toString().padStart(2, '0')} - ${endDate.getHours()}:${endDate.getMinutes().toString().padStart(2, '0')}`;
    };

    const handleBookingAction = async (bookingId, action) => {
        try {
            if (action === 'accept') {
                await api.post(`/owner/bookings/${bookingId}/confirm`);
                setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'confirmed' } : b));
            } else {
                await api.post(`/owner/bookings/${bookingId}/decline`);
                setBookings(prev => prev.filter(b => b.id !== bookingId));
            }
        } catch (e) {
            console.log('Booking action error', e);
        }
    };

    const renderBookingCard = ({ item }) => {
        const StatusIcon = getStatusIcon(item.status);
        const statusColor = getStatusColor(item.status);

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.statusContainer}>
                        <StatusIcon size={16} color={statusColor} />
                        <Text style={[styles.statusText, { color: statusColor }]}>
                            {getStatusText(item.status)}
                        </Text>
                    </View>
                    <Text style={styles.priceText}>{item.total_price.toLocaleString('ru-RU')} ₽</Text>
                </View>

                <Text style={theme.typography.h3} numberOfLines={2}>{item.boat_title}</Text>
                <Text style={[theme.typography.bodySm, { color: theme.colors.textMuted, marginTop: 4 }]}>
                    Клиент: {item.client_name}
                </Text>

                <View style={styles.detailsContainer}>
                    <View style={styles.detailRow}>
                        <Calendar size={16} color={theme.colors.textMuted} />
                        <Text style={styles.detailText}>{formatDate(item.date_start)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Clock size={16} color={theme.colors.textMuted} />
                        <Text style={styles.detailText}>{formatTimeRange(item.date_start, item.date_end)}</Text>
                    </View>
                    <Text style={styles.detailText}>
                        Гостей: {item.guests_count} • Капитан: {item.captain_requested ? 'Да' : 'Нет'}
                    </Text>
                </View>

                {item.status === 'pending' && (
                    <View style={styles.actionButtons}>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.acceptButton]}
                            onPress={() => handleBookingAction(item.id, 'accept')}
                        >
                            <Text style={styles.acceptButtonText}>Подтвердить</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.declineButton]}
                            onPress={() => handleBookingAction(item.id, 'decline')}
                        >
                            <Text style={styles.declineButtonText}>Отклонить</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={theme.typography.h1}>Бронирования</Text>
                <Text style={[theme.typography.body, { color: theme.colors.textMuted, marginTop: 4 }]}>
                    Управление бронированиями ваших катеров
                </Text>
            </View>

            {/* Фильтры по статусам */}
            <View style={styles.tabsContainer}>
                {[
                    { key: 'pending', label: 'Ожидают', count: bookings.filter(b => b.status === 'pending').length },
                    { key: 'upcoming', label: 'Предстоящие', count: bookings.filter(b => b.status === 'confirmed').length },
                    { key: 'completed', label: 'Завершенные', count: bookings.filter(b => b.status === 'completed').length },
                ].map(tab => (
                    <TouchableOpacity
                        key={tab.key}
                        style={[styles.tab, selectedTab === tab.key && styles.tabActive]}
                        onPress={() => setSelectedTab(tab.key)}
                    >
                        <Text style={[styles.tabText, selectedTab === tab.key && styles.tabTextActive]}>
                            {tab.label}
                        </Text>
                        <View style={[styles.badge, selectedTab === tab.key && styles.badgeActive]}>
                            <Text style={[styles.badgeText, selectedTab === tab.key && styles.badgeTextActive]}>
                                {tab.count}
                            </Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>

            <FlatList
                data={filteredBookings}
                renderItem={renderBookingCard}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.listContainer}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={[theme.typography.h2, { marginBottom: theme.spacing.sm }]}>
                            Нет бронирований
                        </Text>
                        <Text style={[theme.typography.body, { color: theme.colors.textMuted, textAlign: 'center' }]}>
                            {selectedTab === 'pending' 
                                ? 'У вас нет ожидающих подтверждения бронирований'
                                : selectedTab === 'upcoming'
                                ? 'У вас нет предстоящих бронирований'
                                : 'У вас нет завершенных бронирований'
                            }
                        </Text>
                    </View>
                }
            />
        </SafeAreaView>
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
    tabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabActive: {
        borderBottomColor: theme.colors.primary,
    },
    tabText: {
        ...theme.typography.body,
        color: theme.colors.textMuted,
        fontWeight: '600',
    },
    tabTextActive: {
        color: theme.colors.primary,
    },
    badge: {
        backgroundColor: theme.colors.border,
        borderRadius: theme.borderRadius.pill,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 2,
        marginLeft: theme.spacing.xs,
    },
    badgeActive: {
        backgroundColor: theme.colors.primaryLight,
    },
    badgeText: {
        ...theme.typography.caption,
        color: theme.colors.textMuted,
        fontWeight: '600',
    },
    badgeTextActive: {
        color: theme.colors.primary,
    },
    listContainer: {
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: 100,
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
        ...theme.shadows.card,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusText: {
        ...theme.typography.caption,
        fontWeight: '600',
        marginLeft: 4,
    },
    priceText: {
        ...theme.typography.h2,
        color: theme.colors.primary,
    },
    detailsContainer: {
        marginTop: theme.spacing.md,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    detailText: {
        ...theme.typography.bodySm,
        color: theme.colors.textMuted,
        marginLeft: 8,
    },
    actionButtons: {
        flexDirection: 'row',
        marginTop: theme.spacing.md,
        gap: theme.spacing.md,
    },
    actionButton: {
        flex: 1,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
    },
    acceptButton: {
        backgroundColor: theme.colors.success,
    },
    declineButton: {
        backgroundColor: theme.colors.error,
    },
    acceptButtonText: {
        color: 'white',
        fontWeight: '600',
    },
    declineButtonText: {
        color: 'white',
        fontWeight: '600',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: theme.spacing.xl,
        paddingHorizontal: theme.spacing.xl,
    },
});
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Calendar, DollarSign, TrendingUp, MoreVertical } from 'lucide-react-native';
import { theme } from '../../../theme';
import { api } from '../../../infrastructure/api';
import { API_BASE } from '../../../infrastructure/config';

export default function MyBoatsScreen({ navigation }) {
    const [boats, setBoats] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({ 
        active: 0, 
        pending: 0, 
        total_earnings: 125000,
        bookings_this_month: 8,
        rating: 4.8
    });

    useEffect(() => {
        fetchMyBoats();
    }, []);

    const fetchMyBoats = async () => {
        try {
            const res = await api.get('/boats');
            setBoats(res.data);
            setStats({
                active: res.data.length,
                pending: 0,
                total_earnings: 125000,
                bookings_this_month: 8,
                rating: 4.8
            });
        } catch (e) {
            console.log('Error fetching boats', e);
        } finally {
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchMyBoats();
    };

    const getStatusColor = (status) => {
        const colors = {
            'active': theme.colors.success,
            'paused': '#FF9800',
            'moderation': theme.colors.textMuted
        };
        return colors[status] || theme.colors.textMuted;
    };

    const getStatusText = (status) => {
        const statuses = {
            'active': 'Активен',
            'paused': 'На паузе',
            'moderation': 'На модерации'
        };
        return statuses[status] || status;
    };

    const photoUri = (p) => {
        if (!p) return 'https://placehold.co/400x300/png';
        if (p.startsWith('http')) return p;
        return API_BASE + p;
    };

    const renderBoat = ({ item }) => (
        <TouchableOpacity 
            style={styles.card}
            onPress={() => navigation.navigate('EditBoat', { boatId: item.id })}
        >
            <Image source={{ uri: photoUri(item.photos?.[0]) }} style={styles.cardImage} />
            <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                    <View style={styles.titleContainer}>
                        <Text style={theme.typography.h3} numberOfLines={1}>{item.title}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                                {getStatusText(item.status)}
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.menuButton}>
                        <MoreVertical size={20} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                </View>
                
                <Text style={[theme.typography.bodySm, { color: theme.colors.textMuted, marginBottom: 4 }]}>
                    {item.location_city} • {item.type_name || 'Катер'}
                </Text>
                
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <DollarSign size={14} color={theme.colors.primary} />
                        <Text style={styles.statText}>
                                {item.price_weekend != null && String(item.price_weekend).trim() !== ''
                                    ? `${item.price_per_hour} ₽ будни · ${item.price_weekend} ₽ вых.`
                                    : `${item.price_per_hour} ₽/час`}
                            </Text>
                    </View>
                    <View style={styles.statItem}>
                        <Calendar size={14} color={theme.colors.primary} />
                        <Text style={styles.statText}>{item.bookings_count || 0} броней</Text>
                    </View>
                    <View style={styles.statItem}>
                        <TrendingUp size={14} color={theme.colors.primary} />
                        <Text style={styles.statText}>★ {item.rating || 0.0}</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <View>
                    <Text style={theme.typography.h1}>Мой флот</Text>
                    <Text style={[theme.typography.bodySm, { color: theme.colors.textMuted, marginTop: 4 }]}>
                        Управление вашими катерами и яхтами
                    </Text>
                </View>
                <TouchableOpacity 
                    style={styles.addButton}
                    onPress={() => navigation.navigate('AddBoat')}
                >
                    <Plus color="white" size={24} />
                </TouchableOpacity>
            </View>

            <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                    <View style={[styles.statIcon, { backgroundColor: '#E6F0FA' }]}>
                        <DollarSign size={20} color={theme.colors.primary} />
                    </View>
                    <View style={styles.statContent}>
                        <Text style={theme.typography.h2}>{stats.total_earnings.toLocaleString('ru-RU')} ₽</Text>
                        <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
                            Заработано за месяц
                        </Text>
                    </View>
                </View>
                
                <View style={styles.statsGrid}>
                    <View style={styles.statBox}>
                        <Text style={styles.statNumber}>{stats.active}</Text>
                        <Text style={styles.statLabel}>Активных</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statNumber}>{stats.bookings_this_month}</Text>
                        <Text style={styles.statLabel}>Броней</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statNumber}>{stats.rating}</Text>
                        <Text style={styles.statLabel}>Рейтинг</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statNumber}>{stats.pending}</Text>
                        <Text style={styles.statLabel}>На паузе</Text>
                    </View>
                </View>
            </View>

            <FlatList
                data={boats}
                keyExtractor={item => item.id.toString()}
                renderItem={renderBoat}
                contentContainerStyle={styles.listContainer}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={[theme.typography.h2, { marginBottom: theme.spacing.sm }]}>
                            Пока нет катеров
                        </Text>
                        <Text style={[theme.typography.body, { color: theme.colors.textMuted, textAlign: 'center', marginBottom: theme.spacing.md }]}>
                            Добавьте свой первый катер, чтобы начать зарабатывать
                        </Text>
                        <TouchableOpacity style={styles.emptyButton} onPress={() => navigation.navigate('AddBoat')}>
                            <Text style={styles.emptyButtonText}>Добавить катер</Text>
                        </TouchableOpacity>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: theme.colors.background 
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.xl,
        paddingBottom: theme.spacing.md,
    },
    addButton: {
        backgroundColor: theme.colors.primary,
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.card,
    },
    statsContainer: {
        paddingHorizontal: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
    },
    statCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
        ...theme.shadows.card,
    },
    statIcon: {
        width: 48,
        height: 48,
        borderRadius: theme.borderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.md,
    },
    statContent: {
        flex: 1,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.md,
    },
    statBox: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        alignItems: 'center',
        ...theme.shadows.card,
    },
    statNumber: {
        ...theme.typography.h2,
        color: theme.colors.primary,
        marginBottom: 4,
    },
    statLabel: {
        ...theme.typography.caption,
        color: theme.colors.textMuted,
    },
    listContainer: {
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: 100,
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        marginBottom: theme.spacing.md,
        overflow: 'hidden',
        ...theme.shadows.card,
    },
    cardImage: {
        width: '100%',
        height: 180,
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
    titleContainer: {
        flex: 1,
        marginRight: theme.spacing.sm,
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 4,
        borderRadius: theme.borderRadius.pill,
        marginTop: 4,
    },
    statusText: {
        ...theme.typography.caption,
        fontWeight: '600',
    },
    menuButton: {
        padding: 4,
    },
    statsRow: {
        flexDirection: 'row',
        marginTop: theme.spacing.sm,
        gap: theme.spacing.md,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statText: {
        ...theme.typography.bodySm,
        color: theme.colors.textMuted,
        marginLeft: 4,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: theme.spacing.xl,
        paddingHorizontal: theme.spacing.xl,
    },
    emptyButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: theme.spacing.xl,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
    },
    emptyButtonText: {
        color: 'white',
        fontWeight: '600',
    },
});

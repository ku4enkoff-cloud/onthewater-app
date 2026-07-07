import React, { useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Heart, Zap, MapPin, Star, Clock, Users, Trash2 } from 'lucide-react-native';
import { theme } from '../../shared/theme';
import { getListPhotoUrl } from '../../shared/infrastructure/config';
import { FavoritesContext } from '../../shared/context/FavoritesContext';
import { AuthContext } from '../../shared/context/AuthContext';
import UnauthorizedCard from '../../shared/components/UnauthorizedCard';
import AppImage from '../../shared/components/AppImage';

const formatCardLocation = (item) => {
    const city = String(item?.location_city || item?.location_name || '').trim();
    const region = String(item?.location_region || '').trim();
    if (!city && !region) return '—';
    if (!city) return region;
    if (!region) return city;
    if (city.toLowerCase() === region.toLowerCase()) return city;
    return `${city}, ${region}`;
};

const normalizeBoatTiers = (boat) => {
    const raw = boat?.price_tiers;
    let tiers = raw;
    if (typeof raw === 'string') {
        try { tiers = JSON.parse(raw); } catch (_) { tiers = []; }
    }
    if (!Array.isArray(tiers)) tiers = [];
    return tiers
        .map((t) => ({
            duration: Number(t?.duration) || 0,
            price: Number(t?.price) || 0,
        }))
        .filter((t) => t.duration > 0 && t.price > 0);
};

const formatDuration = (mins) => {
    const m = Number(mins) || 0;
    if (m <= 0) return '—';
    if (m < 60) return `${m} мин`;
    const h = Math.floor(m / 60);
    const mm = m % 60;
    if (mm === 0) return h === 1 ? '1 ч' : `${h} ч`;
    return `${h} ч ${mm} мин`;
};

const getDurationRangeLabel = (boat) => {
    const minDur = Number(boat?.schedule_min_duration) || 0;
    const tierDurations = normalizeBoatTiers(boat).map((t) => t.duration);
    const durations = [...new Set([minDur, ...tierDurations].filter((d) => d > 0))].sort((a, b) => a - b);
    if (durations.length === 0) return '—';
    if (durations.length === 1) return formatDuration(durations[0]);
    return `${formatDuration(durations[0])} - ${formatDuration(durations[durations.length - 1])}`;
};

const getMinDurationPrice = (boat) => {
    const minDuration = Number(boat?.schedule_min_duration) || 60;
    const base = Number(boat?.price_per_hour) || 0;
    if (minDuration === 60) return base;
    const tier = normalizeBoatTiers(boat).find((t) => t.duration === minDuration);
    return tier?.price || base;
};

export default function FavoritesScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { user } = useContext(AuthContext);
    const { favoriteBoats, removeFavorite } = useContext(FavoritesContext);

    if (!user) {
        return (
            <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
                <View style={styles.header}>
                    <Text style={styles.title}>Избранное</Text>
                </View>
                <UnauthorizedCard
                    label="У ВАС НЕТ ИЗБРАННЫХ КАТЕРОВ"
                    message="Войдите, чтобы видеть список избранных катеров"
                    onSignIn={() => navigation.navigate('Login', { fromProfile: true })}
                />
            </View>
        );
    }

    const renderBoatCard = ({ item }) => {
        const instantBook = item.instant_booking !== false;

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('BoatDetail', { boatId: item.id })}
                activeOpacity={0.9}
            >
                <View style={styles.cardImageWrap}>
                    <AppImage
                        uri={getListPhotoUrl(item.photos?.[0]) || 'https://placehold.co/400x300'}
                        style={styles.cardImage}
                        recyclingKey={String(item.id)}
                    />
                    {instantBook && (
                        <View style={styles.instantBadge}>
                            <Text style={styles.instantBadgeText}>Мгновенно</Text>
                        </View>
                    )}
                </View>
                <View style={styles.cardBody}>
                    <View style={styles.cardTopRow}>
                        <Text style={styles.cardTitle} numberOfLines={1}>{item.title || 'Катер'}</Text>
                        <TouchableOpacity
                            style={styles.removeBtn}
                            onPress={(e) => { e.stopPropagation(); removeFavorite(item.id); }}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        >
                            <Trash2 size={18} color={theme.colors.error} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.locationRow}>
                        <MapPin size={12} color={theme.colors.gray500} />
                        <Text style={styles.locationText} numberOfLines={1}>{formatCardLocation(item)}</Text>
                    </View>
                    <View style={styles.metaRow}>
                        <View style={styles.metaItem}>
                            <Clock size={12} color={theme.colors.gray500} />
                            <Text style={styles.metaItemText}>{getDurationRangeLabel(item)}</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Users size={12} color={theme.colors.gray500} />
                            <Text style={styles.metaItemText}>до {item.capacity ?? '—'}</Text>
                        </View>
                    </View>
                    <View style={styles.cardFooter}>
                        <View style={styles.ratingRow}>
                            <Star size={14} color={theme.colors.star} fill={theme.colors.star} />
                            <Text style={styles.ratingNum}>{item.rating ?? '—'}</Text>
                            <Text style={styles.ratingCount}>({item.reviews_count ?? 0})</Text>
                        </View>
                        <Text style={styles.priceText}>
                            {(() => {
                                const minPrice = getMinDurationPrice(item);
                                const minDuration = Number(item?.schedule_min_duration) || 60;
                                return <>от {minPrice.toLocaleString('ru-RU')} ₽<Text style={styles.priceUnit}>/{formatDuration(minDuration)}</Text></>;
                            })()}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
                <Text style={styles.title}>Избранное</Text>
                <Text style={styles.countText}>
                    {favoriteBoats.length} {favoriteBoats.length === 1 ? 'катер' : favoriteBoats.length < 5 ? 'катера' : 'катеров'}
                </Text>
            </View>
            <FlatList
                data={favoriteBoats}
                renderItem={renderBoatCard}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={[
                    styles.list,
                    { paddingBottom: insets.bottom + 88 },
                ]}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <View style={styles.emptyIconWrap}>
                            <Heart size={48} color={theme.colors.gray400} />
                        </View>
                        <Text style={styles.emptyTitle}>Нет сохранённых катеров</Text>
                        <Text style={styles.emptyText}>
                            Добавляйте катера в избранное с главной страницы
                        </Text>
                        <TouchableOpacity
                            style={styles.emptyButton}
                            onPress={() => navigation.navigate('Search')}
                        >
                            <Text style={styles.emptyButtonText}>Смотреть катера</Text>
                        </TouchableOpacity>
                    </View>
                }
            />
        </View>
    );
}

const CARD_IMAGE_SIZE = 128;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.gray50 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.gray100,
    },
    title: { fontSize: 20, fontFamily: theme.fonts.bold, color: theme.colors.gray900 },
    countText: { fontSize: 14, color: theme.colors.gray500 },
    list: { paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.md },
    card: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 20,
        marginBottom: theme.spacing.md,
        overflow: 'hidden',
        ...theme.shadows.card,
    },
    cardImageWrap: {
        width: CARD_IMAGE_SIZE,
        height: CARD_IMAGE_SIZE,
        position: 'relative',
    },
    cardImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    instantBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: theme.colors.primary,
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 6,
    },
    instantBadgeText: { fontSize: 10, fontFamily: theme.fonts.bold, color: theme.colors.dark },
    cardBody: { flex: 1, padding: theme.spacing.sm, justifyContent: 'space-between' },
    cardTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    cardTitle: { flex: 1, fontSize: 15, fontFamily: theme.fonts.bold, color: theme.colors.gray900, marginRight: 8 },
    removeBtn: { padding: 4 },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    locationText: { fontSize: 12, color: theme.colors.gray500, flex: 1 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, marginTop: 4 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaItemText: { fontSize: 12, color: theme.colors.gray500 },
    cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    ratingNum: { fontSize: 13, fontFamily: theme.fonts.semiBold, color: theme.colors.gray900 },
    ratingCount: { fontSize: 12, color: theme.colors.gray400 },
    priceText: { fontSize: 18, fontFamily: theme.fonts.bold, color: theme.colors.primary },
    priceUnit: { fontSize: 12, fontFamily: theme.fonts.medium, color: theme.colors.gray400 },
    empty: {
        paddingVertical: theme.spacing.xxl,
        alignItems: 'center',
    },
    emptyIconWrap: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: theme.colors.gray100,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: theme.spacing.lg,
    },
    emptyTitle: {
        fontSize: 20,
        fontFamily: theme.fonts.bold,
        color: theme.colors.gray900,
        marginBottom: theme.spacing.sm,
    },
    emptyText: {
        ...theme.typography.body,
        color: theme.colors.gray500,
        textAlign: 'center',
        marginBottom: theme.spacing.lg,
    },
    emptyButton: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: theme.borderRadius.xl,
    },
    emptyButtonText: { color: '#FFFFFF', fontFamily: theme.fonts.bold, fontSize: 16 },
});

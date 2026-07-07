import React, { useState, useEffect, useCallback, useContext, useRef, memo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Dimensions,
    ScrollView,
    RefreshControl,
    useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Search, Heart, MapPin, Clock, Users, Zap } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../shared/theme';
import { api } from '../../shared/infrastructure/api';
import { API_BASE, getPhotoUrl, getListPhotoUrl } from '../../shared/infrastructure/config';
import { FavoritesContext } from '../../shared/context/FavoritesContext';
import LocationPickerModal from '../components/LocationPickerModal';
import AppImage from '../../shared/components/AppImage';

const resolvePhotoUri = (src) => getPhotoUrl(src);

const { width } = Dimensions.get('window');

const NAVY = '#1B365D';
const HERO_IMAGE = require('../../../assets/hero.webp');

const FALLBACK_DESTINATIONS = [
    { id: 'moscow', name: 'Москва', image: 'https://images.unsplash.com/photo-1513326738677-9646ab0f3b3b?w=400' },
    { id: 'mo_region', name: 'Московская область', image: 'https://images.unsplash.com/photo-1513326738677-9646ab0f3b3b?w=400' },
    { id: 'spb', name: 'Санкт-Петербург', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400' },
    { id: 'sochi', name: 'Сочи', image: 'https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=400' },
    { id: 'crimea', name: 'Крым', image: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=400' },
    { id: 'kazan', name: 'Казань', image: 'https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?w=400' },
];

const FALLBACK_CATEGORIES = [
    { id: 'sail', name: 'Парусная яхта', image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400' },
    { id: 'yacht', name: 'Яхта', image: 'https://images.unsplash.com/photo-1567894340315-735d7c361db0?w=400' },
    { id: 'motor', name: 'Катер', image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400' },
];

const DEST_CARD_W = 170;
const IS_TABLET = width >= 768;
const CAT_COLUMNS = IS_TABLET ? 3 : 2;
const CAT_GAP = 16;
const CAT_CARD_W = IS_TABLET
    ? (width - 48 - CAT_GAP * (CAT_COLUMNS - 1)) / CAT_COLUMNS
    : (width - 48 - 16) / 2;
const BOAT_CARD_W = IS_TABLET
    ? Math.min(420, Math.max(320, width * 0.36))
    : width * 0.78;

const formatCardLocation = (item) => {
    const city = String(item?.location_city || item?.locationCity || '').trim();
    const region = String(item?.location_region || item?.locationRegion || '').trim();
    const country = String(item?.location_country || item?.locationCountry || '').trim();
    const address = String(item?.location_address || item?.locationAddress || '').trim();
    if (city && region && city.toLowerCase() !== region.toLowerCase()) return `${city}, ${region}`;
    if (city) return city;
    if (region) return region;
    if (country) return country;
    if (address) return address;
    return '—';
};

const normalizeBoatTiers = (boat) => {
    const raw = boat?.price_tiers;
    let tiers = raw;
    if (typeof raw === 'string') {
        try { tiers = JSON.parse(raw); } catch (_) { tiers = []; }
    }
    if (!Array.isArray(tiers)) tiers = [];
    return tiers
        .map((t) => Number(t?.duration) || 0)
        .filter((d) => d > 0);
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

const getBookingPeriodLabel = (boat) => {
    const minDur = Number(boat?.schedule_min_duration) || 0;
    const durations = [...new Set([minDur, ...normalizeBoatTiers(boat)].filter((d) => d > 0))].sort((a, b) => a - b);
    if (durations.length === 0) return '—';
    if (durations.length === 1) return formatDuration(durations[0]);
    return `${formatDuration(durations[0])} - ${formatDuration(durations[durations.length - 1])}`;
};

const getMinDurationPrice = (boat) => {
    const minDuration = Number(boat?.schedule_min_duration) || 60;
    const base = Number(boat?.price_per_hour) || 0;
    if (minDuration === 60) return base;
    const raw = boat?.price_tiers;
    let tiers = raw;
    if (typeof raw === 'string') {
        try { tiers = JSON.parse(raw); } catch (_) { tiers = []; }
    }
    if (!Array.isArray(tiers)) tiers = [];
    const match = tiers.find((t) => (Number(t?.duration) || 0) === minDuration);
    const tierPrice = Number(match?.price) || 0;
    return tierPrice > 0 ? tierPrice : base;
};

const SearchBoatCard = memo(function SearchBoatCard({
    item,
    cardWidth,
    horizontal,
    favorite,
    onPress,
    onToggleFavorite,
}) {
    const instantBook = item.instant_booking !== false;
    const formatPrice = (n) => (n != null ? Number(n).toLocaleString('ru-RU') : '0');
    const minDurationLabel = (boat) => {
        const mins = boat.schedule_min_duration != null ? Number(boat.schedule_min_duration) : 60;
        if (mins < 60) return `${mins} мин`;
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        if (m === 0) return `${h} ч`;
        return `${h} ч ${m} мин`;
    };

    return (
        <TouchableOpacity
            style={[styles.card, horizontal && { width: cardWidth, marginRight: 16, marginBottom: 0 }]}
            onPress={onPress}
            activeOpacity={0.95}
        >
            <View style={styles.cardImageWrap}>
                <AppImage
                    uri={getListPhotoUrl(item.photos?.[0]) || 'https://placehold.co/400x300'}
                    style={styles.cardImage}
                    recyclingKey={String(item.id)}
                />
                <View style={styles.cardBadges}>
                    {instantBook && (
                        <View style={styles.instantBadge}>
                            <Zap size={12} color="#fff" />
                            <Text style={styles.instantBadgeText}>Мгновенно</Text>
                        </View>
                    )}
                </View>
                <TouchableOpacity
                    style={styles.heartButton}
                    onPress={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(item);
                    }}
                >
                    <Heart
                        size={20}
                        color={favorite ? '#ef4444' : theme.colors.gray400}
                        fill={favorite ? '#ef4444' : 'transparent'}
                    />
                </TouchableOpacity>
                <View style={styles.imagePriceBadge}>
                    <Text style={styles.imagePriceMain}>
                        от {formatPrice(getMinDurationPrice(item))} ₽
                    </Text>
                    <Text style={styles.imagePriceUnit}>/{minDurationLabel(item)}</Text>
                </View>
            </View>
            <View style={styles.cardInfo}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.title || 'Катер'}</Text>
                <View style={styles.cardMetaRow}>
                    <MapPin size={12} color={theme.colors.gray500} />
                    <Text style={styles.cardLocation} numberOfLines={1}>
                        {formatCardLocation(item)}
                    </Text>
                </View>
                <View style={styles.cardMetaRow2}>
                    <View style={styles.cardMetaItem}>
                        <Clock size={12} color={theme.colors.gray500} />
                        <Text style={styles.cardMetaText}>{getBookingPeriodLabel(item)}</Text>
                    </View>
                    <View style={styles.cardMetaItem}>
                        <Users size={12} color={theme.colors.gray500} />
                        <Text style={styles.cardMetaText}>до {item.capacity ?? '—'}</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
});

function DestinationImage({ uri, style }) {
    return <AppImage uri={uri} style={style} resizeMode="cover" />;
}

export default function SearchScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
    const isLargeViewport = viewportWidth >= 600;
    const isTabletPortrait = isLargeViewport && viewportHeight >= viewportWidth;
    const categoryGap = 16;
    const categoryColumns = isLargeViewport ? (isTabletPortrait ? 2 : 3) : 2;
    const categoryCardWidth = Math.floor(
        (viewportWidth - theme.spacing.lg * 2 - categoryGap * (categoryColumns - 1)) / categoryColumns
    );
    const boatCardWidth = isLargeViewport
        ? (isTabletPortrait
            ? Math.min(320, Math.max(240, viewportWidth * 0.42))
            : Math.min(380, Math.max(280, viewportWidth * 0.34)))
        : viewportWidth * 0.78;
    const { toggleFavorite, isFavorite } = useContext(FavoritesContext);
    const [boats, setBoats] = useState([]);
    const [boatCategories, setBoatCategories] = useState(FALLBACK_CATEGORIES);
    const [destinations, setDestinations] = useState(FALLBACK_DESTINATIONS);
    const [refreshing, setRefreshing] = useState(false);
    const [locationModalVisible, setLocationModalVisible] = useState(false);
    const homeLoadedRef = useRef(false);
    const skipNextFocusFetchRef = useRef(true);

    const loadHomeData = useCallback(async () => {
        const [boatsRes, categoriesRes, destinationsRes] = await Promise.allSettled([
            api.get('/boats', { params: { popular: 1, limit: 20 } }),
            api.get('/boat-types'),
            api.get('/destinations'),
        ]);

        if (boatsRes.status === 'fulfilled') {
            setBoats(Array.isArray(boatsRes.value.data) ? boatsRes.value.data : []);
        } else {
            console.log('Search Error:', boatsRes.reason);
        }

        if (categoriesRes.status === 'fulfilled') {
            const items = (categoriesRes.value.data || []).map((t) => ({
                id: String(t.id),
                name: t.name || '—',
                image: resolvePhotoUri(t.image) || 'https://placehold.co/400x300?text=',
            }));
            if (items.length > 0) setBoatCategories(items);
        } else {
            console.log('Boat types load error:', categoriesRes.reason);
        }

        if (destinationsRes.status === 'fulfilled') {
            const items = (destinationsRes.value.data || []).map((d) => ({
                id: String(d.id),
                name: d.name || '—',
                image: resolvePhotoUri(d.image) || 'https://placehold.co/400x300?text=',
            }));
            if (items.length > 0) setDestinations(items);
        } else {
            console.log('Destinations load error:', destinationsRes.reason);
        }

        homeLoadedRef.current = true;
    }, []);

    useEffect(() => {
        loadHomeData();
    }, [loadHomeData]);

    useFocusEffect(
        useCallback(() => {
            if (skipNextFocusFetchRef.current) {
                skipNextFocusFetchRef.current = false;
                return undefined;
            }
            if (!homeLoadedRef.current) return undefined;
            loadHomeData();
            return undefined;
        }, [loadHomeData]),
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadHomeData();
        setRefreshing(false);
    }, [loadHomeData]);

    const renderBoatCard = useCallback(({ item }) => (
        <SearchBoatCard
            item={item}
            cardWidth={boatCardWidth}
            horizontal
            favorite={isFavorite(item.id)}
            onPress={() => navigation.navigate('BoatDetail', { boatId: item.id })}
            onToggleFavorite={toggleFavorite}
        />
    ), [boatCardWidth, isFavorite, navigation, toggleFavorite]);

    const boatKeyExtractor = useCallback((item) => String(item.id), []);

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <ScrollView
                style={styles.list}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                <View style={[styles.heroWrap, { paddingTop: insets.top }]}>
                    <AppImage
                        source={HERO_IMAGE}
                        style={styles.heroImage}
                        resizeMode="cover"
                    />
                    <LinearGradient
                        colors={['rgba(251,248,243,0.85)', 'rgba(251,248,243,0.5)', 'transparent']}
                        style={styles.heroGradient}
                        pointerEvents="none"
                    />
                    <View style={[styles.heroContent, { top: insets.top + 12 }]}>
                        <Text style={styles.heroTitle}>Бронируй, плыви, отдыхай</Text>
                        <Text style={styles.heroSubtitle}>
                            Аренда катеров, прогулки с капитаном{'\n'}и незабываемые впечатления на воде.
                        </Text>
                    </View>
                    <View style={[styles.searchBarWrap, { top: insets.top + 118 }]}>
                        <TouchableOpacity
                            style={styles.searchBar}
                            onPress={() => setLocationModalVisible(true)}
                            activeOpacity={0.9}
                        >
                            <Search size={20} color={NAVY} />
                            <Text style={styles.searchPlaceholder}>
                                Куда хотите отправиться?
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Популярные катера</Text>

                <View style={styles.boatsSection}>
                    <FlatList
                        data={boats}
                        horizontal
                        keyExtractor={boatKeyExtractor}
                        renderItem={renderBoatCard}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.boatsListContent}
                        ListEmptyComponent={
                            <View style={styles.emptyHint}>
                                <Text style={styles.emptyText}>Запустите бэкенд и обновите список</Text>
                            </View>
                        }
                    />
                </View>

                <Text style={styles.sectionTitle}>Популярные направления</Text>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.destList}
                >
                    {destinations.map((d) => (
                        <TouchableOpacity
                            key={`dest-${d.id}`}
                            style={styles.destCard}
                            onPress={() =>
                                navigation.navigate('SearchResults', {
                                    cityName: d.name,
                                    useMyLocation: false,
                                    dateISO: new Date().toISOString(),
                                })
                            }
                            activeOpacity={0.9}
                        >
                            <DestinationImage uri={d.image} style={styles.destImage} />
                            <Text style={styles.destName}>{d.name}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <Text style={styles.sectionTitle}>Категории катеров</Text>
                <View style={[styles.catGrid, { gap: categoryGap }]}>
                    {boatCategories.map((c) => (
                        <TouchableOpacity
                            key={`cat-${c.id}`}
                            style={[styles.catCard, { width: categoryCardWidth }]}
                            activeOpacity={0.9}
                            onPress={() => {
                                navigation.navigate('SearchResults', {
                                    cityName: null,
                                    useMyLocation: false,
                                    dateISO: new Date().toISOString(),
                                    boatTypeId: c.id,
                                    boatTypeName: c.name,
                                    allRegions: true,
                                });
                            }}
                        >
                            <AppImage uri={c.image} style={styles.catImage} />
                            <Text style={styles.catName}>{c.name}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
            <LocationPickerModal
                visible={locationModalVisible}
                onClose={() => setLocationModalVisible(false)}
                onSelect={({ useMyLocation, cityName }) => {
                    navigation.navigate('CityBoats', {
                        useMyLocation: !!useMyLocation,
                        cityName: useMyLocation ? null : cityName,
                    });
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.backgroundWarm,
    },
    list: {
        backgroundColor: theme.colors.backgroundWarm,
    },
    /* ---- Hero (full-width image + overlay text) ---- */
    heroWrap: {
        height: 380,
        marginHorizontal: -theme.spacing.lg,
        position: 'relative',
        overflow: 'hidden',
        marginBottom: theme.spacing.sm,
    },
    heroImage: {
        ...StyleSheet.absoluteFillObject,
        width: '100%',
        height: '100%',
    },
    heroGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '55%',
    },
    heroContent: {
        position: 'absolute',
        left: theme.spacing.lg,
        right: theme.spacing.lg,
        zIndex: 1,
    },
    heroTitle: {
        fontSize: 24,
        fontFamily: theme.fonts.bold,
        color: NAVY,
        lineHeight: 34,
        marginBottom: 6,
    },
    heroSubtitle: {
        fontSize: 15,
        fontFamily: theme.fonts.regular,
        color: NAVY,
        lineHeight: 22,
    },
    searchBarWrap: {
        position: 'absolute',
        left: theme.spacing.lg,
        right: theme.spacing.lg,
        zIndex: 1,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        width: '100%',
        maxWidth: 760,
        alignSelf: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 999,
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 6,
    },
    searchPlaceholder: {
        fontSize: 15,
        fontFamily: theme.fonts.regular,
        color: theme.colors.gray400,
    },
    /* ---- Sections ---- */
    sectionTitle: {
        fontSize: 18,
        fontFamily: theme.fonts.bold,
        color: NAVY,
        marginBottom: theme.spacing.lg,
        marginTop: 0,
    },
    /* ---- Destination cards (name below image) ---- */
    destList: {
        paddingRight: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
    },
    destCard: {
        width: DEST_CARD_W,
        marginRight: 16,
    },
    destImage: {
        width: DEST_CARD_W,
        height: 130,
        borderRadius: 16,
        resizeMode: 'cover',
        backgroundColor: theme.colors.gray100,
    },
    destName: {
        fontSize: 14,
        fontFamily: theme.fonts.semiBold,
        color: NAVY,
        marginTop: 8,
    },
    /* ---- Category grid (2 columns) ---- */
    catGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: CAT_GAP,
        marginBottom: theme.spacing.md,
    },
    catCard: {
        width: CAT_CARD_W,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#fff',
    },
    catImage: {
        width: '100%',
        height: IS_TABLET ? 128 : 110,
        resizeMode: 'cover',
    },
    catName: {
        fontSize: IS_TABLET ? 15 : 14,
        fontFamily: theme.fonts.semiBold,
        color: NAVY,
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    /* ---- Content ---- */
    listContent: {
        paddingHorizontal: theme.spacing.lg,
    },
    boatsSection: {
        height: 320,
        marginBottom: theme.spacing.sm,
    },
    boatsListContent: {
        paddingRight: theme.spacing.lg,
        paddingBottom: 4,
    },
    /* ---- Boat cards ---- */
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        marginBottom: theme.spacing.lg,
        overflow: 'hidden',
        alignSelf: 'flex-start',
        ...theme.shadows.card,
    },
    cardImageWrap: {
        width: '100%',
        height: 192,
        position: 'relative',
    },
    cardImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    cardBadges: {
        position: 'absolute',
        top: 12,
        left: 12,
        flexDirection: 'row',
        gap: 8,
    },
    instantBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: NAVY,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 8,
        gap: 6,
    },
    instantBadgeText: {
        fontSize: 11,
        fontFamily: theme.fonts.bold,
        color: '#fff',
    },
    heartButton: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.9)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    imagePriceBadge: {
        position: 'absolute',
        right: 12,
        bottom: 12,
        flexDirection: 'row',
        alignItems: 'baseline',
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
    },
    imagePriceMain: {
        fontSize: 14,
        fontFamily: theme.fonts.bold,
        color: '#FFFFFF',
        lineHeight: 18,
    },
    imagePriceUnit: {
        fontSize: 9,
        fontFamily: theme.fonts.regular,
        color: 'rgba(255,255,255,0.92)',
        marginLeft: 2,
    },
    cardInfo: {
        padding: 16,
    },
    cardTitle: {
        fontSize: 16,
        fontFamily: theme.fonts.bold,
        color: NAVY,
        marginBottom: 4,
    },
    cardMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 8,
    },
    cardLocation: {
        fontSize: 12,
        fontFamily: theme.fonts.regular,
        color: theme.colors.gray500,
        flex: 1,
    },
    cardMetaRow2: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 12,
    },
    cardMetaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    cardMetaText: {
        fontSize: 12,
        fontFamily: theme.fonts.regular,
        color: theme.colors.gray500,
    },
    emptyHint: {
        paddingVertical: theme.spacing.xxl,
        alignItems: 'center',
    },
    emptyText: {
        ...theme.typography.body,
        color: theme.colors.textMuted,
    },
    /* ---- Map mode ---- */
    bottomListContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(255,255,255,0.95)',
        paddingVertical: 12,
    },
    horizontalList: {
        paddingHorizontal: 16,
    },
    miniCard: {
        width: width * 0.7,
        marginRight: 16,
        backgroundColor: '#fff',
        borderRadius: theme.borderRadius.lg,
        overflow: 'hidden',
        ...theme.shadows.card,
    },
    miniCardImage: {
        width: '100%',
        height: 120,
        resizeMode: 'cover',
    },
    miniCardInfo: {
        padding: theme.spacing.sm,
    },
    miniCardTitle: {
        ...theme.typography.h3,
        fontSize: 14,
    },
    miniCardPrice: {
        fontSize: 14,
        fontFamily: theme.fonts.bold,
        color: NAVY,
    },
});

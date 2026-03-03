import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Image,
    TouchableOpacity,
    Dimensions,
    ScrollView,
    RefreshControl,
    AppState,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Search, Heart, MapPin, Clock, Users, Zap } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../shared/theme';
import { api } from '../../shared/infrastructure/api';
import { API_BASE, getPhotoUrl } from '../../shared/infrastructure/config';
import { FavoritesContext } from '../../shared/context/FavoritesContext';
import LocationPickerModal from '../components/LocationPickerModal';

const resolvePhotoUri = (src) => getPhotoUrl(src);

const { width } = Dimensions.get('window');

const NAVY = '#1B365D';
const HERO_IMAGE = require('../../shared/assets/hero.png');

const FALLBACK_DESTINATIONS = [
    { id: 'moscow', name: 'Москва', image: 'https://images.unsplash.com/photo-1513326738677-9646ab0f3b3b?w=400' },
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
const CAT_CARD_W = (width - 48 - 16) / 2;
const BOAT_CARD_W = width * 0.78;

const PLACEHOLDER_IMG = 'https://placehold.co/400x300/e2e8f0/64748b?text=';

function DestinationImage({ uri, style, refreshKey }) {
    const [failed, setFailed] = React.useState(false);
    const src = !uri ? null : uri.includes('/uploads/') ? `${uri}${uri.includes('?') ? '&' : '?'}_=${refreshKey}` : uri;
    React.useEffect(() => setFailed(false), [uri]);
    const displayUri = failed || !src ? PLACEHOLDER_IMG + encodeURIComponent('Фото') : src;
    return (
        <Image
            key={`${displayUri}-${refreshKey}`}
            source={{
                uri: displayUri,
                ...(src?.includes('/uploads/') && !failed && {
                    headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
                }),
            }}
            style={style}
            onError={() => setFailed(true)}
        />
    );
}

export default function SearchScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { toggleFavorite, isFavorite } = useContext(FavoritesContext);
    const [boats, setBoats] = useState([]);
    const [boatCategories, setBoatCategories] = useState([]);
    const [destinations, setDestinations] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [locationModalVisible, setLocationModalVisible] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);

    const fetchBoatCategories = useCallback(async () => {
        try {
            const res = await api.get('/boat-types');
            const items = (res.data || []).map((t) => ({
                id: String(t.id),
                name: t.name || '—',
                image: resolvePhotoUri(t.image) || 'https://placehold.co/400x300?text=',
            }));
            setBoatCategories(items);
        } catch (e) {
            console.log('Boat types load error:', e);
        }
    }, []);

    const fetchDestinations = useCallback(async () => {
        try {
            const res = await api.get('/destinations');
            const items = (res.data || []).map((d) => ({
                id: String(d.id),
                name: d.name || '—',
                image: resolvePhotoUri(d.image) || 'https://placehold.co/400x300?text=',
            }));
            setDestinations(items);
        } catch (e) {
            console.log('Destinations load error:', e);
        }
    }, []);

    const fetchBoats = useCallback(async () => {
        try {
            const res = await api.get('/boats', { params: { popular: 1, limit: 20 } });
            setBoats(res.data);
        } catch (e) {
            console.log('Search Error:', e);
        }
    }, []);

    useEffect(() => {
        fetchBoats();
        fetchBoatCategories();
        fetchDestinations();
    }, [fetchBoats, fetchBoatCategories, fetchDestinations]);

    useFocusEffect(
        useCallback(() => {
            fetchBoats();
            fetchBoatCategories();
            fetchDestinations().then(() => setRefreshKey((k) => k + 1));
        }, [fetchBoats, fetchBoatCategories, fetchDestinations])
    );

    useEffect(() => {
        const sub = AppState.addEventListener('change', (state) => {
            if (state === 'active') {
                fetchBoats();
                fetchBoatCategories();
                fetchDestinations().then(() => setRefreshKey((k) => k + 1));
            }
        });
        return () => sub.remove();
    }, [fetchBoats, fetchBoatCategories, fetchDestinations]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([fetchBoats(), fetchBoatCategories(), fetchDestinations()]);
        setRefreshKey((k) => k + 1);
        setRefreshing(false);
    }, [fetchBoats, fetchBoatCategories, fetchDestinations]);

    const formatPrice = (n) => (n != null ? Number(n).toLocaleString('ru-RU') : '0');
        const minDurationLabel = (item) => {
            const mins = item.schedule_min_duration != null ? Number(item.schedule_min_duration) : 60;
            if (mins < 60) return `${mins} мин`;
            const h = Math.floor(mins / 60);
            const m = mins % 60;
            if (m === 0) return `${h} ч`;
            return `${h} ч ${m} мин`;
        };

    const renderBoatCard = ({ item }, horizontal = false) => {
        const favorite = isFavorite(item.id);
        const instantBook = item.instant_booking !== false;

        return (
            <TouchableOpacity
                style={[styles.card, horizontal && { width: BOAT_CARD_W, marginRight: 16, marginBottom: 0 }]}
                onPress={() => navigation.navigate('BoatDetail', { boatId: item.id })}
                activeOpacity={0.95}
            >
                <View style={styles.cardImageWrap}>
                    <Image
                        source={{ uri: resolvePhotoUri(item.photos?.[0]) || 'https://placehold.co/400x300' }}
                        style={styles.cardImage}
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
                        onPress={(e) => { e.stopPropagation(); toggleFavorite(item); }}
                    >
                        <Heart
                            size={20}
                            color={favorite ? '#ef4444' : theme.colors.gray400}
                            fill={favorite ? '#ef4444' : 'transparent'}
                        />
                    </TouchableOpacity>
                </View>
                <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.title || 'Катер'}</Text>
                    <View style={styles.cardMetaRow}>
                        <MapPin size={12} color={theme.colors.gray500} />
                        <Text style={styles.cardLocation} numberOfLines={1}>
                            {item.location_city || '—'}
                        </Text>
                    </View>
                    <View style={styles.cardMetaRow2}>
                        <View style={styles.cardMetaItem}>
                            <Clock size={12} color={theme.colors.gray500} />
                            <Text style={styles.cardMetaText}>2–8 ч</Text>
                        </View>
                        <View style={styles.cardMetaItem}>
                            <Users size={12} color={theme.colors.gray500} />
                            <Text style={styles.cardMetaText}>до {item.capacity ?? '—'}</Text>
                        </View>
                    </View>
                    <View style={styles.cardFooter}>
                        <View style={styles.cardPriceBlock}>
                            <Text style={styles.cardPriceLine}>
                                от {formatPrice(item.price_per_hour)} ₽
                            </Text>
                            <Text style={styles.cardDurationLine}>{minDurationLabel(item)}</Text>
                        </View>
                        <View style={styles.viewBtn}>
                            <Text style={styles.viewBtnText}>Смотреть</Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const ListHeader = () => (
        <>
            {/* Hero: full-width image with text overlay (Boatsetter style) */}
            <View style={[styles.heroWrap, { paddingTop: insets.top }]}>
                <Image source={HERO_IMAGE} style={styles.heroImage} resizeMode="cover" />
                <LinearGradient
                    colors={['rgba(251,248,243,0.85)', 'rgba(251,248,243,0.5)', 'transparent']}
                    style={styles.heroGradient}
                    pointerEvents="none"
                />
                <View style={[styles.heroContent, { top: insets.top + 12 }]}>
                    <Text style={styles.heroTitle}>Бронируй, плыви,{'\n'}отдыхай</Text>
                    <Text style={styles.heroSubtitle}>
                        Аренда катеров, прогулки с капитаном{'\n'}и незабываемые впечатления на воде.
                    </Text>
                </View>
                <View style={styles.searchBarWrap}>
                    <TouchableOpacity
                        style={styles.searchBar}
                        onPress={() => navigation.navigate('LocationSelect')}
                        activeOpacity={0.9}
                    >
                        <Search size={20} color={NAVY} />
                        <Text style={styles.searchPlaceholder}>
                            Куда хотите отправиться?
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Recommended boats header */}
            <Text style={styles.sectionTitle}>Рекомендуемые катера</Text>
        </>
    );

    const BoatsSection = () => (
        <View style={styles.boatsSection}>
            <FlatList
                data={boats}
                horizontal
                keyExtractor={(item) => item.id.toString()}
                renderItem={(args) => renderBoatCard(args, true)}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.boatsListContent}
                ListEmptyComponent={
                    <View style={styles.emptyHint}>
                        <Text style={styles.emptyText}>Запустите бэкенд и обновите список</Text>
                    </View>
                }
            />
        </View>
    );

    const ListFooter = () => (
        <View>
            {/* Top destinations */}
            <Text style={styles.sectionTitle}>Популярные направления</Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.destList}
            >
                {(destinations.length ? destinations : FALLBACK_DESTINATIONS).map((d) => (
                    <TouchableOpacity
                        key={d.id}
                        style={styles.destCard}
                        onPress={() => navigation.navigate('CityBoats', { cityName: d.name })}
                        activeOpacity={0.9}
                    >
                        <DestinationImage uri={d.image} style={styles.destImage} refreshKey={refreshKey} />
                        <Text style={styles.destName}>{d.name}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Top boating categories */}
            <Text style={styles.sectionTitle}>Категории катеров</Text>
            <View style={styles.catGrid}>
                {(boatCategories.length ? boatCategories : FALLBACK_CATEGORIES).map((c) => (
                    <TouchableOpacity
                        key={c.id}
                        style={styles.catCard}
                        activeOpacity={0.9}
                        onPress={() => {
                            setSelectedCategory(c);
                            setLocationModalVisible(true);
                        }}
                    >
                        <Image source={{ uri: c.image }} style={styles.catImage} />
                        <Text style={styles.catName}>{c.name}</Text>
                    </TouchableOpacity>
                ))}
            </View>
            <View style={{ height: 24 }} />
        </View>
    );

    const listContent = (
        <ScrollView
            style={styles.list}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 88 }]}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            <ListHeader />
            <BoatsSection />
            <ListFooter />
        </ScrollView>
    );

    // Главный экран — hero, катера, направления, категории (без карты; карта в CityMapScreen)
    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            {listContent}
            <LocationPickerModal
                visible={locationModalVisible}
                onClose={() => {
                    setLocationModalVisible(false);
                    setSelectedCategory(null);
                }}
                onSelect={({ useMyLocation, cityName }) => {
                    navigation.navigate('CityBoats', {
                        useMyLocation: !!useMyLocation,
                        cityName: useMyLocation ? null : cityName,
                        boatTypeId: selectedCategory?.id,
                        boatTypeName: selectedCategory?.name,
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
        marginBottom: theme.spacing.lg,
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
    },
    heroTitle: {
        fontSize: 28,
        fontFamily: theme.fonts.bold,
        color: NAVY,
        lineHeight: 34,
        marginBottom: 6,
    },
    heroSubtitle: {
        fontSize: 15,
        fontFamily: theme.fonts.regular,
        color: theme.colors.gray500,
        lineHeight: 22,
    },
    searchBarWrap: {
        position: 'absolute',
        bottom: 56,
        left: theme.spacing.lg,
        right: theme.spacing.lg,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
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
        marginBottom: theme.spacing.md,
        marginTop: theme.spacing.sm,
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
        gap: 16,
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
        height: 110,
        resizeMode: 'cover',
    },
    catName: {
        fontSize: 14,
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
        height: 400,
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
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: theme.colors.gray100,
    },
    cardPriceBlock: {
        flexDirection: 'column',
        justifyContent: 'center',
    },
    cardPriceLine: {
        fontSize: 22,
        fontFamily: theme.fonts.bold,
        color: NAVY,
        marginBottom: 2,
    },
    cardDurationLine: {
        fontSize: 13,
        fontFamily: theme.fonts.regular,
        color: theme.colors.gray500,
    },
    viewBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: NAVY,
        borderRadius: 12,
    },
    viewBtnText: {
        fontSize: 14,
        fontFamily: theme.fonts.semiBold,
        color: '#fff',
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

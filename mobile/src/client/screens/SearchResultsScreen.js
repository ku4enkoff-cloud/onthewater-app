import React, { useState, useEffect, useCallback, useContext, useMemo, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Image,
    TouchableOpacity,
    ScrollView,
    Modal,
    NativeModules,
    ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronDown, Heart, Zap, MapPin, Star, SlidersHorizontal, X } from 'lucide-react-native';
import { theme } from '../../shared/theme';
import { api } from '../../shared/infrastructure/api';
import { API_BASE } from '../../shared/infrastructure/config';
import { FavoritesContext } from '../../shared/context/FavoritesContext';

const resolvePhotoUri = (src) => {
    if (!src) return 'https://placehold.co/400x300';
    if (src.startsWith('http') || src.startsWith('file://')) return src;
    return API_BASE + (src.startsWith('/') ? src : '/' + src);
};
import FiltersModal from '../components/FiltersModal';
import PriceFilterModal from '../components/PriceFilterModal';
import PassengersFilterModal from '../components/PassengersFilterModal';
import DurationFilterModal from '../components/DurationFilterModal';
import BoatTypeFilterModal from '../components/BoatTypeFilterModal';

const NAVY = '#1B365D';

const CITY_COORDS = {
    'Москва': { lat: 55.751244, lon: 37.618423 },
    'Санкт-Петербург': { lat: 59.93428, lon: 30.335099 },
    'Сочи': { lat: 43.585472, lon: 39.723098 },
    'Крым': { lat: 44.952117, lon: 34.102417 },
    'Казань': { lat: 55.830955, lon: 49.06608 },
};
const DEFAULT_MAP_CENTER = { lat: 55.751244, lon: 37.618423 };

const isMapAvailable = NativeModules.yamap != null;
let YaMap = null;
let Marker = null;
if (isMapAvailable) {
    try {
        const yamap = require('react-native-yamap');
        YaMap = yamap.default;
        Marker = yamap.Marker;
    } catch (_) {}
}

const DEFAULT_FILTERS = {
    priceLow: 0,
    priceHigh: 50000,
    passengers: 1,
    duration: null,
    captain: null,
    activity: null,
    boatTypeId: null,
    boatTypeName: null,
};

const pluralizeReviews = (n) => {
    if (n === 1) return 'отзыв';
    if (n >= 2 && n <= 4) return 'отзыва';
    return 'отзывов';
};
const pluralizeBookings = (n) => {
    if (n === 1) return 'бронирование';
    if (n >= 2 && n <= 4) return 'бронирования';
    return 'бронирований';
};

export default function SearchResultsScreen({ route, navigation }) {
    const insets = useSafeAreaInsets();
    const { cityName, dateISO, useMyLocation, boatTypeId, boatTypeName } = route.params || {};
    const { toggleFavorite, isFavorite } = useContext(FavoritesContext);
    const [allBoats, setAllBoats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtersVisible, setFiltersVisible] = useState(false);
    const [priceModalVisible, setPriceModalVisible] = useState(false);
    const [passengersModalVisible, setPassengersModalVisible] = useState(false);
    const [durationModalVisible, setDurationModalVisible] = useState(false);
    const [boatTypeModalVisible, setBoatTypeModalVisible] = useState(false);
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [mapModalVisible, setMapModalVisible] = useState(false);
    const [mapBoats, setMapBoats] = useState([]);
    const [mapLoading, setMapLoading] = useState(false);
    const [mapCenter, setMapCenter] = useState(DEFAULT_MAP_CENTER);
    const mapRef = useRef(null);
    const mapPollRef = useRef(null);
    const lastMapCenterRef = useRef(null);

    const dateObj = dateISO ? new Date(dateISO) : new Date();
    const formattedDate = dateObj.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });

    const displayCity = useMyLocation ? 'Рядом со мной' : (cityName || 'Москва');

    const fetchBoats = useCallback(async () => {
        setLoading(true);
        try {
            let lat = 55.751244;
            let lng = 37.618423;
            if (useMyLocation) {
                try {
                    const expoLocation = require('expo-location');
                    const { status } =
                        (await expoLocation.requestForegroundPermissionsAsync?.()) || {};
                    if (status === 'granted') {
                        const pos = await expoLocation.getCurrentPositionAsync?.({});
                        if (pos?.coords) {
                            lat = pos.coords.latitude;
                            lng = pos.coords.longitude;
                        }
                    }
                } catch (_) {}
            }
            const res = await api.get('/boats', { params: { lat, lng, radius: 50 } });
            const list = Array.isArray(res.data) ? res.data : [];
            let filtered =
                useMyLocation || !cityName
                    ? list
                    : list.filter(
                          (b) =>
                              (b.location_city || '').trim().toLowerCase() ===
                              (cityName || '').toLowerCase(),
                      );
            if (boatTypeId) {
                filtered = filtered.filter(
                    (b) =>
                        String(b.type_id) === String(boatTypeId) ||
                        (boatTypeName && (b.type_name || '').toLowerCase() === (boatTypeName || '').toLowerCase()),
                );
            }
            setAllBoats(filtered);
        } catch (e) {
            console.log('SearchResults fetch error', e);
            setAllBoats([]);
        } finally {
            setLoading(false);
        }
    }, [cityName, useMyLocation, boatTypeId, boatTypeName]);

    useEffect(() => {
        fetchBoats();
    }, [fetchBoats]);

    const fetchBoatsForMap = useCallback(async (lat, lng) => {
        setMapLoading(true);
        try {
            const res = await api.get('/boats', { params: { lat, lng, radius: 50 } });
            setMapBoats(Array.isArray(res.data) ? res.data : []);
        } catch (_) {
            setMapBoats([]);
        } finally {
            setMapLoading(false);
        }
    }, []);

    const openMapModal = useCallback(() => {
        const center = cityName && CITY_COORDS[cityName]
            ? CITY_COORDS[cityName]
            : boats.length && boats[0].lat != null
                ? { lat: boats[0].lat, lon: boats[0].lng }
                : DEFAULT_MAP_CENTER;
        setMapCenter(center);
        setMapBoats(boats);
        setMapModalVisible(true);
        lastMapCenterRef.current = { lat: center.lat, lon: center.lon };
    }, [boats, cityName]);

    useEffect(() => {
        if (!mapModalVisible || !YaMap || !mapRef.current) return;
        const poll = () => {
            try {
                mapRef.current?.getCameraPosition?.((pos) => {
                    const lat = pos?.lat ?? pos?.latitude;
                    const lon = pos?.lon ?? pos?.longitude;
                    if (lat == null || lon == null) return;
                    const last = lastMapCenterRef.current;
                    const same = last && Math.abs(last.lat - lat) < 0.01 && Math.abs(last.lon - lon) < 0.01;
                    if (!same) {
                        lastMapCenterRef.current = { lat, lon };
                        fetchBoatsForMap(lat, lon);
                    }
                });
            } catch (_) {}
        };
        poll();
        mapPollRef.current = setInterval(poll, 2500);
        return () => {
            if (mapPollRef.current) clearInterval(mapPollRef.current);
        };
    }, [mapModalVisible, fetchBoatsForMap]);

    const priceRange = useMemo(() => {
        const prices = allBoats
            .map((b) => Number(b.price_per_hour) || 0)
            .filter((p) => p > 0);
        if (prices.length === 0) return { min: 0, max: 50000 };
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        return { min, max: max > min ? max : min + 1000 };
    }, [allBoats]);

    const maxPassengers = useMemo(() => {
        const caps = allBoats.map((b) => Number(b.capacity) || 0).filter((c) => c > 0);
        if (caps.length === 0) return 20;
        return Math.max(1, Math.max(...caps));
    }, [allBoats]);

    const durationOptions = useMemo(() => {
        const fallback = [30, 60, 120, 180, 240, 360, 480];
        if (allBoats.length === 0) return fallback;
        const offeredSet = new Set();
        for (const b of allBoats) {
            const sm = Number(b.schedule_min_duration) || 60;
            offeredSet.add(sm);
            const tiers = Array.isArray(b.price_tiers) ? b.price_tiers : [];
            for (const t of tiers) {
                const d = Number(t.duration) || 0;
                if (d > 0) offeredSet.add(d);
            }
        }
        const offered = [...offeredSet].sort((a, b) => a - b);
        return offered.length > 0 ? offered : fallback;
    }, [allBoats]);

    const boatTypes = useMemo(() => {
        const seen = new Map();
        for (const b of allBoats) {
            const id = b.type_id ?? b.type_name;
            const name = b.type_name || 'Без типа';
            if (id != null && id !== '' && !seen.has(String(id))) {
                seen.set(String(id), { id, name });
            }
        }
        return [...seen.values()].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }, [allBoats]);

    useEffect(() => {
        if (priceRange.min === 0 && priceRange.max === 50000) return;
        setFilters((prev) => {
            if (prev.priceLow === 0 && prev.priceHigh === 50000) {
                return { ...prev, priceLow: priceRange.min, priceHigh: priceRange.max };
            }
            return prev;
        });
    }, [priceRange.min, priceRange.max]);

    const boats = useMemo(() => {
        let list = [...allBoats];
        const { priceLow, priceHigh, passengers, captain } = filters;
        if (priceLow > priceRange.min || priceHigh < priceRange.max) {
            list = list.filter((b) => {
                const p = Number(b.price_per_hour) || 0;
                return p >= priceLow && p <= priceHigh;
            });
        }
        if (passengers > 1) {
            list = list.filter((b) => (Number(b.capacity) || 0) >= passengers);
        }
        if (filters.duration) {
            list = list.filter((b) => (Number(b.schedule_min_duration) || 60) <= filters.duration);
        }
        if (captain === 'С капитаном') {
            list = list.filter((b) => b.captain_included);
        } else if (captain === 'Без капитана') {
            list = list.filter((b) => !b.captain_included);
        }
        if (filters.boatTypeId) {
            list = list.filter(
                (b) =>
                    String(b.type_id) === String(filters.boatTypeId) ||
                    ((b.type_name || '').toLowerCase() === (filters.boatTypeName || '').toLowerCase()),
            );
        }
        return list;
    }, [allBoats, filters, priceRange.min, priceRange.max]);

    const isPriceFilterActive = filters.priceLow > priceRange.min || filters.priceHigh < priceRange.max;
    const isPassengersFilterActive = filters.passengers !== 1;
    const isDurationFilterActive = !!filters.duration;
    const isBoatTypeFilterActive = !!filters.boatTypeId || !!filters.boatTypeName;

    const formatPriceShort = (v) => {
        const n = Number(v) || 0;
        if (n >= 1000) return Math.round(n / 1000).toLocaleString('ru-RU') + ' 000';
        return String(n);
    };

    const activeFilters = useMemo(() => {
        let n = 0;
        if (filters.priceLow > priceRange.min || filters.priceHigh < priceRange.max) n++;
        if (filters.passengers !== 1) n++;
        if (filters.duration) n++;
        if (filters.boatTypeId || filters.boatTypeName) n++;
        if (filters.captain) n++;
        if (filters.activity) n++;
        return n;
    }, [filters, priceRange.min, priceRange.max]);

    const renderBoatCard = ({ item }) => {
        const photoCount = Array.isArray(item.photos) ? item.photos.length : 0;
        const favorite = isFavorite(item.id);
        const instantBook = item.instant_booking !== false;
        const hasTopOwner = item.rating >= 4.8 && !instantBook;

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('BoatDetail', { boatId: item.id })}
                activeOpacity={0.95}
            >
                <View style={styles.cardImageWrap}>
                    <Image
                        source={{ uri: resolvePhotoUri(item.photos?.[0]) }}
                        style={styles.cardImage}
                    />
                    {instantBook && (
                        <View style={styles.instantBadge}>
                            <Zap size={12} color="#10B981" fill="#10B981" />
                            <Text style={styles.instantBadgeText}>INSTANT BOOK</Text>
                        </View>
                    )}
                    <TouchableOpacity
                        style={styles.heartButton}
                        onPress={(e) => {
                            e.stopPropagation();
                            toggleFavorite(item);
                        }}
                    >
                        <Heart
                            size={22}
                            color={favorite ? '#ef4444' : '#fff'}
                            fill={favorite ? '#ef4444' : 'transparent'}
                            strokeWidth={2}
                        />
                    </TouchableOpacity>
                    {photoCount > 0 && (
                        <View style={styles.photoCounter}>
                            <Text style={styles.photoCounterText}>1/{photoCount}</Text>
                        </View>
                    )}
                    <View style={styles.priceBadge}>
                        {item.price_weekend != null && String(item.price_weekend).trim() !== '' ? (
                            <>
                                <Text style={styles.priceBadgeText}>от {(Number(item.price_per_hour) || 0).toLocaleString('ru-RU')} ₽</Text>
                                <Text style={styles.priceUnit}> будни</Text>
                                <Text style={styles.priceSep}> · </Text>
                                <Text style={styles.priceBadgeText}>{(Number(item.price_weekend) || 0).toLocaleString('ru-RU')} ₽</Text>
                                <Text style={styles.priceUnit}> вых.</Text>
                            </>
                        ) : (
                            <>
                                <Text style={styles.priceBadgeText}>от {(Number(item.price_per_hour) || 0).toLocaleString('ru-RU')} ₽</Text>
                                <Text style={styles.priceUnit}>
                                    /{(() => {
                                        const m = Number(item.schedule_min_duration) || 60;
                                        if (m === 60) return 'час';
                                        if (m < 60) return `${m} мин`;
                                        const h = Math.floor(m / 60);
                                        const min = m % 60;
                                        if (min === 0) return h === 1 ? 'час' : `${h} ч`;
                                        return `${h} ч ${min} мин`;
                                    })()}
                                </Text>
                            </>
                        )}
                    </View>
                </View>

                <View style={styles.cardInfo}>
                    <View style={styles.badgeRow}>
                        {hasTopOwner && (
                            <View style={styles.topOwnerBadge}>
                                <Text style={styles.topOwnerIcon}>🏆</Text>
                                <Text style={styles.topOwnerText}>TOP OWNER</Text>
                            </View>
                        )}
                        <Text style={styles.locationText}>
                            {(item.location_city || '').toUpperCase()}
                        </Text>
                    </View>

                    <View style={styles.titleRow}>
                        <Text style={styles.cardTitle} numberOfLines={1}>
                            {item.title || 'Катер'}
                        </Text>
                        <View style={styles.reviewsBookingsWrap}>
                                <View style={styles.ratingRow}>
                                    <Star size={16} color={theme.colors.star} fill={theme.colors.star} />
                                    <Text style={styles.ratingNum}>{item.rating ?? 0}</Text>
                                    <Text style={styles.ratingCount}>
                                        <Text style={styles.ratingCountNum}>({item.reviews_count ?? 0} </Text>
                                        <Text style={styles.ratingCountWord}>{pluralizeReviews(item.reviews_count ?? 0)})</Text>
                                    </Text>
                                </View>
                                <Text style={styles.reviewsBookingsSub}>
                                    {item.bookings_count ?? 0} {pluralizeBookings(item.bookings_count ?? 0)}
                                </Text>
                            </View>
                    </View>

                    <Text style={styles.metaText}>
                        До {item.capacity ?? '—'} гостей
                        {item.captain_included ? ' • С капитаном' : ''}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* Compact header: back + city/date bubble + chevron */}
            <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                    <ChevronLeft size={24} color={NAVY} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.headerBubble}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.8}
                >
                    <View>
                        <Text style={styles.bubbleCity}>{displayCity}</Text>
                        <Text style={styles.bubbleDate}>{formattedDate}</Text>
                    </View>
                    <ChevronDown size={20} color={NAVY} />
                </TouchableOpacity>
            </View>

            {/* Filter chips row */}
            <View style={styles.filtersContainer}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filtersContent}
                >
                    <TouchableOpacity
                        style={activeFilters > 0 ? styles.filterChipActive : styles.filterChip}
                        onPress={() => setFiltersVisible(true)}
                    >
                        <SlidersHorizontal size={14} color={activeFilters > 0 ? NAVY : theme.colors.gray700} />
                        <Text style={activeFilters > 0 ? styles.filterChipActiveText : styles.filterChipText}>
                            Фильтры{activeFilters > 0 ? ` (${activeFilters})` : ''}
                        </Text>
                    </TouchableOpacity>
                    {isPriceFilterActive ? (
                        <TouchableOpacity
                            style={styles.priceChipActive}
                            activeOpacity={0.7}
                            onPress={() => setPriceModalVisible(true)}
                        >
                            <Text style={styles.priceChipActiveText}>
                                {formatPriceShort(filters.priceLow)} – {formatPriceShort(filters.priceHigh)} ₽
                            </Text>
                            <TouchableOpacity
                                hitSlop={8}
                                onPress={(e) => {
                                    e.stopPropagation();
                                    setFilters((prev) => ({
                                        ...prev,
                                        priceLow: priceRange.min,
                                        priceHigh: priceRange.max,
                                    }));
                                }}
                            >
                                <X size={14} color={NAVY} />
                            </TouchableOpacity>
                        </TouchableOpacity>
                    ) : (
                        <FilterChip label="Цена" onPress={() => setPriceModalVisible(true)} />
                    )}
                    {isPassengersFilterActive ? (
                        <TouchableOpacity
                            style={styles.priceChipActive}
                            activeOpacity={0.7}
                            onPress={() => setPassengersModalVisible(true)}
                        >
                            <Text style={styles.priceChipActiveText}>
                                {filters.passengers} {filters.passengers === 1 ? 'гость' : filters.passengers >= 2 && filters.passengers <= 4 ? 'гостя' : 'гостей'}
                            </Text>
                            <TouchableOpacity
                                hitSlop={8}
                                onPress={(e) => {
                                    e.stopPropagation();
                                    setFilters((prev) => ({ ...prev, passengers: 1 }));
                                }}
                            >
                                <X size={14} color={NAVY} />
                            </TouchableOpacity>
                        </TouchableOpacity>
                    ) : (
                        <FilterChip label="Гости" onPress={() => setPassengersModalVisible(true)} />
                    )}
                    {isDurationFilterActive ? (
                        <TouchableOpacity
                            style={styles.priceChipActive}
                            activeOpacity={0.7}
                            onPress={() => setDurationModalVisible(true)}
                        >
                            <Text style={styles.priceChipActiveText}>
                                {(() => {
                                    const d = filters.duration;
                                    if (d < 60) return `${d} мин`;
                                    const h = Math.floor(d / 60);
                                    const m = d % 60;
                                    if (m > 0) return `${h} ч ${m} мин`;
                                    if (h === 1) return '1 час';
                                    if (h >= 2 && h <= 4) return `${h} часа`;
                                    return `${h} часов`;
                                })()}
                            </Text>
                            <TouchableOpacity
                                hitSlop={8}
                                onPress={(e) => {
                                    e.stopPropagation();
                                    setFilters((prev) => ({ ...prev, duration: null }));
                                }}
                            >
                                <X size={14} color={NAVY} />
                            </TouchableOpacity>
                        </TouchableOpacity>
                    ) : (
                        <FilterChip label="Длительность" onPress={() => setDurationModalVisible(true)} />
                    )}
                    {isBoatTypeFilterActive ? (
                        <TouchableOpacity
                            style={styles.priceChipActive}
                            activeOpacity={0.7}
                            onPress={() => setBoatTypeModalVisible(true)}
                        >
                            <Text style={styles.priceChipActiveText} numberOfLines={1}>
                                {filters.boatTypeName || 'Тип'}
                            </Text>
                            <TouchableOpacity
                                hitSlop={8}
                                onPress={(e) => {
                                    e.stopPropagation();
                                    setFilters((prev) => ({ ...prev, boatTypeId: null, boatTypeName: null }));
                                }}
                            >
                                <X size={14} color={NAVY} />
                            </TouchableOpacity>
                        </TouchableOpacity>
                    ) : (
                        <FilterChip
                            label="Тип катера"
                            onPress={() => setBoatTypeModalVisible(true)}
                        />
                    )}
                </ScrollView>
            </View>

            <FiltersModal
                visible={filtersVisible}
                onClose={() => setFiltersVisible(false)}
                filters={filters}
                onApply={setFilters}
                totalResults={boats.length}
            />
            <PriceFilterModal
                visible={priceModalVisible}
                onClose={() => setPriceModalVisible(false)}
                priceMin={priceRange.min}
                priceMax={priceRange.max}
                priceLow={filters.priceLow}
                priceHigh={filters.priceHigh}
                onApply={(p) => setFilters((prev) => ({ ...prev, ...p }))}
            />
            <PassengersFilterModal
                visible={passengersModalVisible}
                onClose={() => setPassengersModalVisible(false)}
                passengers={filters.passengers}
                maxPassengers={maxPassengers}
                onApply={(p) => setFilters((prev) => ({ ...prev, ...p }))}
            />
            <DurationFilterModal
                visible={durationModalVisible}
                onClose={() => setDurationModalVisible(false)}
                duration={filters.duration}
                durationOptions={durationOptions}
                onApply={(p) => setFilters((prev) => ({ ...prev, ...p }))}
            />
            <BoatTypeFilterModal
                visible={boatTypeModalVisible}
                onClose={() => setBoatTypeModalVisible(false)}
                boatTypeId={filters.boatTypeId}
                boatTypeName={filters.boatTypeName}
                boatTypes={boatTypes}
                onApply={(p) => setFilters((prev) => ({ ...prev, ...p }))}
            />

            {/* Boat list */}
            <FlatList
                data={boats}
                renderItem={renderBoatCard}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={[
                    styles.list,
                    { paddingBottom: insets.bottom + 80 },
                ]}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.empty}>
                            <Text style={styles.emptyText}>
                                {useMyLocation
                                    ? 'Рядом с вами пока нет объявлений'
                                    : `В городе «${cityName || '—'}» пока нет объявлений`}
                            </Text>
                        </View>
                    ) : null
                }
            />

            {loading && (
                <View style={styles.loadingOverlay}>
                    <Text style={styles.loadingText}>Загрузка...</Text>
                </View>
            )}

            {/* Floating map button */}
            <View style={[styles.mapButtonWrap, { bottom: insets.bottom + 24 }]}>
                <TouchableOpacity
                    style={styles.mapButton}
                    onPress={openMapModal}
                    activeOpacity={0.9}
                >
                    <MapPin size={18} color="#fff" />
                    <Text style={styles.mapButtonText}>Карта</Text>
                </TouchableOpacity>
            </View>

            {/* Map modal */}
            <Modal
                visible={mapModalVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setMapModalVisible(false)}
            >
                <View style={[styles.mapModalOverlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
                    <View style={styles.mapModalContent}>
                        <View style={styles.mapModalHeader}>
                            <TouchableOpacity
                                onPress={() => setMapModalVisible(false)}
                                style={styles.mapModalClose}
                                hitSlop={12}
                            >
                                <Text style={styles.mapModalCloseText}>✕</Text>
                            </TouchableOpacity>
                            <Text style={styles.mapModalTitle} numberOfLines={1}>
                                {displayCity} — катера на карте
                            </Text>
                            <View style={{ width: 36 }} />
                        </View>
                        {!isMapAvailable || !YaMap ? (
                            <View style={styles.mapPlaceholder}>
                                <Text style={styles.mapPlaceholderText}>
                                    Карта доступна в полной сборке приложения (expo run:android / expo run:ios)
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.mapContainer}>
                                <YaMap
                                    ref={mapRef}
                                    style={StyleSheet.absoluteFillObject}
                                    initialRegion={{
                                        lat: mapCenter.lat,
                                        lon: mapCenter.lon,
                                        zoom: 12,
                                    }}
                                >
                                    {mapBoats.filter((b) => b.lat != null && b.lng != null).map((boat) => (
                                        <Marker
                                            key={boat.id}
                                            point={{ lat: boat.lat, lon: boat.lng }}
                                            onPress={() => {
                                                setMapModalVisible(false);
                                                navigation.navigate('BoatDetail', { boatId: boat.id });
                                            }}
                                        />
                                    ))}
                                </YaMap>
                                {mapLoading && (
                                    <View style={styles.mapLoadingOverlay}>
                                        <ActivityIndicator size="large" color={NAVY} />
                                    </View>
                                )}
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

function FilterChip({ label, onPress }) {
    return (
        <TouchableOpacity style={styles.filterChip} activeOpacity={0.7} onPress={onPress}>
            <Text style={styles.filterChipText}>{label}</Text>
            <ChevronDown size={14} color={theme.colors.gray700} />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F4',
    },

    /* ---- Compact header ---- */
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: theme.spacing.md,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    backButton: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    headerBubble: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    bubbleCity: {
        fontSize: 16,
        fontFamily: theme.fonts.semiBold,
        color: NAVY,
    },
    bubbleDate: {
        fontSize: 13,
        fontFamily: theme.fonts.regular,
        color: theme.colors.textMuted,
        marginTop: 1,
    },

    /* ---- Filter chips ---- */
    filtersContainer: {
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    filtersContent: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: 10,
        gap: 8,
    },
    filterChipActive: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#E8E5E0',
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: NAVY,
    },
    filterChipActiveText: {
        fontSize: 13,
        fontFamily: theme.fonts.semiBold,
        color: NAVY,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#F3F4F6',
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    filterChipText: {
        fontSize: 13,
        fontFamily: theme.fonts.medium,
        color: theme.colors.gray700,
    },
    priceChipActive: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#E8EEF5',
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: NAVY,
    },
    priceChipActiveText: {
        fontSize: 13,
        fontFamily: theme.fonts.semiBold,
        color: NAVY,
    },

    /* ---- List ---- */
    list: {
        paddingHorizontal: theme.spacing.md,
        paddingTop: theme.spacing.md,
    },

    /* ---- Boat card ---- */
    card: {
        backgroundColor: '#fff',
        borderRadius: 14,
        marginBottom: theme.spacing.lg,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
        elevation: 3,
    },
    cardImageWrap: {
        width: '100%',
        height: 240,
        position: 'relative',
    },
    cardImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    instantBadge: {
        position: 'absolute',
        top: 12,
        left: 12,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: NAVY,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 8,
        gap: 5,
    },
    instantBadgeText: {
        fontSize: 11,
        fontFamily: theme.fonts.bold,
        color: '#fff',
        letterSpacing: 0.5,
    },
    heartButton: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.25)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    photoCounter: {
        position: 'absolute',
        bottom: 12,
        left: 12,
        backgroundColor: 'rgba(0,0,0,0.55)',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 6,
    },
    photoCounterText: {
        fontSize: 12,
        fontFamily: theme.fonts.semiBold,
        color: '#fff',
    },
    priceBadge: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        flexDirection: 'row',
        alignItems: 'baseline',
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 10,
    },
    priceBadgeText: {
        fontSize: 16,
        fontFamily: theme.fonts.bold,
        color: '#fff',
    },
    priceUnit: {
        fontSize: 13,
        fontFamily: theme.fonts.regular,
        color: 'rgba(255,255,255,0.8)',
    },
    priceSep: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.8)',
        marginHorizontal: 2,
    },
    cardInfo: {
        padding: theme.spacing.md,
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    topOwnerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF3C7',
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 6,
        gap: 4,
    },
    topOwnerIcon: { fontSize: 12 },
    topOwnerText: {
        fontSize: 11,
        fontFamily: theme.fonts.bold,
        color: '#92400E',
        letterSpacing: 0.5,
    },
    locationText: {
        fontSize: 12,
        fontFamily: theme.fonts.regular,
        color: theme.colors.textMuted,
        letterSpacing: 0.5,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 8,
        marginBottom: 4,
    },
    cardTitle: {
        flex: 1,
        fontSize: 17,
        fontFamily: theme.fonts.bold,
        color: NAVY,
    },
    reviewsBookingsWrap: {
        alignItems: 'flex-end',
        paddingTop: 2,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    ratingNum: {
        fontSize: 15,
        fontFamily: theme.fonts.bold,
        color: NAVY,
        marginLeft: 4,
    },
    ratingCount: {
        fontSize: 14,
        fontFamily: theme.fonts.regular,
        marginLeft: 2,
    },
    ratingCountNum: {
        fontFamily: theme.fonts.semiBold,
        color: NAVY,
    },
    ratingCountWord: {
        fontFamily: theme.fonts.regular,
        color: theme.colors.textMuted,
    },
    reviewsBookingsSub: {
        fontSize: 12,
        fontFamily: theme.fonts.regular,
        color: theme.colors.textMuted,
        marginTop: 4,
    },
    metaText: {
        fontSize: 14,
        fontFamily: theme.fonts.regular,
        color: theme.colors.textMuted,
    },

    /* ---- Empty / loading ---- */
    empty: {
        paddingVertical: theme.spacing.xxl,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        fontFamily: theme.fonts.regular,
        color: theme.colors.textMuted,
        textAlign: 'center',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        fontFamily: theme.fonts.medium,
        color: theme.colors.textMuted,
    },

    /* ---- Map button ---- */
    mapButtonWrap: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    mapButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: NAVY,
        paddingVertical: 14,
        paddingHorizontal: 28,
        borderRadius: 28,
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 8,
    },
    mapButtonText: {
        fontSize: 16,
        fontFamily: theme.fonts.bold,
        color: '#fff',
    },

    /* ---- Map modal ---- */
    mapModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    mapModalContent: {
        flex: 1,
        backgroundColor: theme.colors.background,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: 'hidden',
    },
    mapModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    mapModalClose: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: theme.colors.gray100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    mapModalCloseText: {
        fontSize: 18,
        color: theme.colors.gray700,
    },
    mapModalTitle: {
        flex: 1,
        fontSize: 17,
        fontFamily: theme.fonts.semiBold,
        color: NAVY,
        textAlign: 'center',
    },
    mapPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.lg,
    },
    mapPlaceholderText: {
        fontSize: 15,
        fontFamily: theme.fonts.regular,
        color: theme.colors.textMuted,
        textAlign: 'center',
    },
    mapContainer: {
        flex: 1,
        position: 'relative',
    },
    mapLoadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});

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
    ActivityIndicator,
    InteractionManager,
    useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Rect, Text as SvgText } from 'react-native-svg';
import { ChevronLeft, ChevronDown, Heart, Zap, MapPin, Star, SlidersHorizontal, X } from 'lucide-react-native';
import { theme } from '../../shared/theme';
import { api } from '../../shared/infrastructure/api';
import { API_BASE, getPhotoUrl } from '../../shared/infrastructure/config';
import { FavoritesContext } from '../../shared/context/FavoritesContext';

const resolvePhotoUri = (src) => getPhotoUrl(src) || 'https://placehold.co/400x300';
import FiltersModal from '../components/FiltersModal';
import PriceFilterModal from '../components/PriceFilterModal';
import PassengersFilterModal from '../components/PassengersFilterModal';
import DurationFilterModal from '../components/DurationFilterModal';
import BoatTypeFilterModal from '../components/BoatTypeFilterModal';
import LocationDateModal from '../components/LocationDateModal';
import { isYamapNativeAvailable } from '../../shared/yamapNative';
import { ensureYamapInitialized } from '../../shared/yamapInit';

const NAVY = '#1B365D';

const CITY_COORDS = {
    'Москва': { lat: 55.751244, lon: 37.618423 },
    'Московская область': { lat: 55.5, lon: 38.0 },
    'Санкт-Петербург': { lat: 59.93428, lon: 30.335099 },
    'Сочи': { lat: 43.585472, lon: 39.723098 },
    'Крым': { lat: 44.952117, lon: 34.102417 },
    'Казань': { lat: 55.830955, lon: 49.06608 },
};
const DEFAULT_MAP_CENTER = { lat: 55.751244, lon: 37.618423 };

const isMapAvailable = isYamapNativeAvailable;
let YaMap = null;
let Marker = null;
if (isMapAvailable) {
    try {
        const yamap = require('react-native-yamap-plus');
        YaMap = yamap.Yamap;
        Marker = yamap.Marker;
    } catch (_) {}
}
const USE_CUSTOM_PRICE_MARKERS = true;

/** Кружок с числом катеров в локации (включая «1»). */
function MapClusterBubble({ count, selected }) {
    const size = 40;
    const cx = size / 2;
    const cy = size / 2;
    const label = String(count);
    return (
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <Circle
                cx={cx}
                cy={cy}
                r={17}
                fill="#FFFFFF"
                stroke={NAVY}
                strokeWidth={selected ? 3 : 2}
            />
            <SvgText
                x={cx}
                y={cy + (label.length > 2 ? 4 : 5)}
                fill={NAVY}
                fontSize={label.length > 2 ? 12 : 14}
                fontWeight="700"
                fontFamily={theme.fonts.bold}
                textAnchor="middle"
            >
                {label}
            </SvgText>
        </Svg>
    );
}

function MapPriceBubble({ price, selected }) {
    const color = NAVY;
    const w = 88;
    const h = 32;
    const radius = 8;
    return (
        <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
            <Rect
                x={1}
                y={1}
                width={w - 2}
                height={h - 2}
                rx={radius}
                ry={radius}
                fill={color}
                stroke="rgba(255,255,255,0.5)"
                strokeWidth={1.5}
            />
            <SvgText
                x={w / 2}
                y={h / 2 + 5}
                fill="#fff"
                fontSize={14}
                fontWeight="700"
                fontFamily={theme.fonts.bold}
                textAnchor="middle"
            >
                {price}
            </SvgText>
        </Svg>
    );
}

const DEFAULT_FILTERS = {
    priceLow: 0,
    priceHigh: 50000,
    passengers: 1,
    duration: null,
    captain: null,
    waterSports: [],
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

const formatCardLocation = (item) => {
    const city = String(item?.location_city || item?.locationCity || '').trim();
    const region = String(item?.location_region || item?.locationRegion || '').trim();
    const country = String(item?.location_country || item?.locationCountry || '').trim();
    const address = String(item?.location_address || item?.locationAddress || '').trim();
    if (city && region && city.toLowerCase() !== region.toLowerCase()) return `${city}, ${region}`.toUpperCase();
    if (city) return city.toUpperCase();
    if (region) return region.toUpperCase();
    if (country) return country.toUpperCase();
    if (address) return address.toUpperCase();
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
        .map((t) => ({
            duration: Number(t?.duration) || 0,
            price: Number(t?.price) || 0,
        }))
        .filter((t) => t.duration > 0 && t.price > 0);
};

const getExactPriceForDuration = (boat, durationMin) => {
    const d = Number(durationMin) || 0;
    if (d <= 0) return null;
    const minDuration = Number(boat?.schedule_min_duration) || 60;
    if (d === minDuration) {
        const base = Number(boat?.price_per_hour) || 0;
        return base > 0 ? base : null;
    }
    const tier = normalizeBoatTiers(boat).find((t) => t.duration === d);
    return tier?.price || null;
};

const formatDurationChipLabel = (mins) => {
    const m = Number(mins) || 60;
    if (m === 60) return 'час';
    if (m < 60) return `${m} мин`;
    const h = Math.floor(m / 60);
    const mm = m % 60;
    if (mm === 0) return h === 1 ? 'час' : `${h} ч`;
    return `${h} ч ${mm} мин`;
};

const getBoatAmenities = (boat) => {
    const raw = boat?.amenities;
    if (Array.isArray(raw)) return raw.map((v) => String(v || '').trim()).filter(Boolean);
    if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed.map((v) => String(v || '').trim()).filter(Boolean);
        } catch (_) {}
    }
    return [];
};

/** Те же фильтры, что и для списка — карта должна показывать то же количество катеров. */
function applyBoatFilters(list, filters, priceRange) {
    let result = [...list];
    const { priceLow, priceHigh, passengers, captain } = filters;
    if (priceLow > priceRange.min || priceHigh < priceRange.max) {
        result = result.filter((b) => {
            const p = filters.duration
                ? (getExactPriceForDuration(b, filters.duration) ?? 0)
                : (Number(b.price_per_hour) || 0);
            return p >= priceLow && p <= priceHigh;
        });
    }
    if (passengers > 1) {
        result = result.filter((b) => (Number(b.capacity) || 0) >= passengers);
    }
    if (filters.duration) {
        result = result.filter((b) => getExactPriceForDuration(b, filters.duration) != null);
    }
    if (Array.isArray(filters.waterSports) && filters.waterSports.length > 0) {
        const selected = filters.waterSports.map((s) => String(s || '').trim().toLowerCase()).filter(Boolean);
        result = result.filter((b) => {
            const am = getBoatAmenities(b).map((s) => s.toLowerCase());
            return selected.some((s) => am.includes(s));
        });
    }
    if (captain === 'С капитаном') {
        result = result.filter((b) => b.captain_included);
    } else if (captain === 'Без капитана') {
        result = result.filter((b) => !b.captain_included);
    }
    if (filters.boatTypeId || filters.boatTypeName) {
        const byName = (filters.boatTypeName || '').trim();
        const typeIdRaw = String(filters.boatTypeId || '');
        const typeIdPart = typeIdRaw.includes('|') ? typeIdRaw.split('|')[0] : typeIdRaw;
        result = result.filter((b) => {
            if (byName) {
                return (b.type_name || '').toLowerCase() === byName.toLowerCase();
            }
            if (typeIdPart) return String(b.type_id) === typeIdPart;
            return false;
        });
    }
    return result;
}

function dedupeBoatsById(list) {
    const seen = new Set();
    return list.filter((b) => {
        if (b.id == null) return true;
        const id = String(b.id);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
    });
}

/** Одинаковые lat/lng дают один кластер с завышенным числом; слегка разводим точки. */
const MAP_COORD_GROUP_DECIMALS = 4;
const MAP_SPREAD_RADIUS_DEG = 0.00008;

function buildClusteredMapMarkers(boats) {
    const seenIds = new Set();
    const groups = new Map();

    for (const b of boats) {
        const lat = Number(b.lat);
        const lon = Number(b.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
        const id = b.id != null ? String(b.id) : null;
        if (id) {
            if (seenIds.has(id)) continue;
            seenIds.add(id);
        }
        const key = `${lat.toFixed(MAP_COORD_GROUP_DECIMALS)},${lon.toFixed(MAP_COORD_GROUP_DECIMALS)}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(b);
    }

    const markers = [];
    for (const group of groups.values()) {
        if (group.length === 1) {
            const boat = group[0];
            markers.push({
                point: { lat: Number(boat.lat), lon: Number(boat.lng) },
                data: boat,
            });
            continue;
        }
        const baseLat = Number(group[0].lat);
        const baseLon = Number(group[0].lng);
        const cosLat = Math.cos((baseLat * Math.PI) / 180) || 1;
        group.forEach((boat, i) => {
            const angle = (2 * Math.PI * i) / group.length;
            markers.push({
                point: {
                    lat: baseLat + MAP_SPREAD_RADIUS_DEG * Math.cos(angle),
                    lon: baseLon + (MAP_SPREAD_RADIUS_DEG * Math.sin(angle)) / cosLat,
                },
                data: boat,
            });
        });
    }
    return markers;
}

/** Радиус группировки (м) зависит от zoom: на общем плане — шире, при приближении — точнее. */
function mapClusterRadiusMeters(zoom) {
    const z = Number.isFinite(Number(zoom)) ? Number(zoom) : 10;
    return Math.min(40000, Math.max(500, 900000 / 2 ** z));
}

/** Группируем близкие катера в один кружок; count=1 тоже показываем. */
function buildLocationClusterMarkers(boats, zoom = 10) {
    const seenIds = new Set();
    const items = [];

    for (const b of boats) {
        const lat = Number(b.lat);
        const lon = Number(b.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
        const id = b.id != null ? String(b.id) : null;
        if (id) {
            if (seenIds.has(id)) continue;
            seenIds.add(id);
        }
        items.push({ boat: b, lat, lon });
    }
    if (items.length === 0) return [];

    const radiusM = mapClusterRadiusMeters(zoom);
    const parent = items.map((_, i) => i);
    const find = (i) => {
        let root = i;
        while (parent[root] !== root) {
            parent[root] = parent[parent[root]];
            root = parent[root];
        }
        return root;
    };
    const union = (a, b) => {
        const ra = find(a);
        const rb = find(b);
        if (ra !== rb) parent[rb] = ra;
    };

    for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
            if (distanceMeters(items[i].lat, items[i].lon, items[j].lat, items[j].lon) <= radiusM) {
                union(i, j);
            }
        }
    }

    const groups = new Map();
    for (let i = 0; i < items.length; i++) {
        const root = find(i);
        if (!groups.has(root)) groups.set(root, []);
        groups.get(root).push(items[i].boat);
    }

    const clusters = [];
    let idx = 0;
    for (const group of groups.values()) {
        const latSum = group.reduce((s, b) => s + Number(b.lat), 0);
        const lonSum = group.reduce((s, b) => s + Number(b.lng), 0);
        clusters.push({
            id: `c-${idx++}`,
            point: { lat: latSum / group.length, lon: lonSum / group.length },
            count: group.length,
            boats: group,
        });
    }
    return clusters;
}

const MAP_NEARBY_METERS = 180;
const MAP_NEARBY_MARKER_METERS = 100;

function distanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const rad = (d) => (d * Math.PI) / 180;
    const dLat = rad(lat2 - lat1);
    const dLon = rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

function sameCoordGroup(boatA, boatB) {
    const latA = Number(boatA?.lat);
    const lonA = Number(boatA?.lng);
    const latB = Number(boatB?.lat);
    const lonB = Number(boatB?.lng);
    if (!Number.isFinite(latA) || !Number.isFinite(lonA) || !Number.isFinite(latB) || !Number.isFinite(lonB)) {
        return false;
    }
    return (
        latA.toFixed(MAP_COORD_GROUP_DECIMALS) === latB.toFixed(MAP_COORD_GROUP_DECIMALS) &&
        lonA.toFixed(MAP_COORD_GROUP_DECIMALS) === lonB.toFixed(MAP_COORD_GROUP_DECIMALS)
    );
}

/** Катера с близкими координатами / наложенными метками — показываем одной группой снизу. */
function findNearbyMapBoats(tappedBoat, markers, tappedPoint) {
    if (!tappedBoat) return [];
    const tp = tappedPoint ?? { lat: Number(tappedBoat.lat), lon: Number(tappedBoat.lng) };
    const boats = [];
    const seen = new Set();

    for (const m of markers) {
        const b = m?.data;
        if (!b?.id || seen.has(String(b.id))) continue;

        let match = String(b.id) === String(tappedBoat.id) || sameCoordGroup(b, tappedBoat);

        if (!match && Number.isFinite(tp.lat) && Number.isFinite(tp.lon) && m?.point) {
            const plat = Number(m.point.lat);
            const plon = Number(m.point.lon);
            if (Number.isFinite(plat) && Number.isFinite(plon)) {
                match = distanceMeters(tp.lat, tp.lon, plat, plon) <= MAP_NEARBY_MARKER_METERS;
            }
        }

        if (!match && Number.isFinite(tp.lat) && Number.isFinite(tp.lon)) {
            const blat = Number(b.lat);
            const blon = Number(b.lng);
            if (Number.isFinite(blat) && Number.isFinite(blon)) {
                match = distanceMeters(tp.lat, tp.lon, blat, blon) <= MAP_NEARBY_METERS;
            }
        }

        if (match) {
            seen.add(String(b.id));
            boats.push(b);
        }
    }

    return boats.length ? boats : [tappedBoat];
}

/** Zoom для перехода к ценовым маркерам при ручном pinch (не при тапе по кластеру). */
const MAP_ZOOM_ENTER_PRICE_MODE = 13;
/** Ниже этого zoom — снова групповые маркеры (гистерезис: вход 13, выход 11). */
const MAP_ZOOM_EXIT_PRICE_MODE = 11;
/** Первый тап по кластеру: показать все метки области, без сильного приближения. */
const MAP_ZOOM_CLUSTER_OPEN_MIN = 10;
const MAP_ZOOM_CLUSTER_OPEN_MAX = 12;
/** Повторный тап по выбранной ценовой метке — детальный вид. */
const MAP_ZOOM_MARKER_CLOSE = 15;
/** Минимальный сдвиг карты для повторной подгрузки. */
const MAP_PAN_MIN_DEG = 0.028;
const MAP_GEO_FETCH_RADIUS_KM = 50;
const MAP_GEO_FETCH_RADIUS_MAX_KM = 250;
const MAP_GEO_FETCH_RADIUS_MIN_KM = 8;

function radiusKmForZoom(zoom) {
    const z = Number.isFinite(Number(zoom)) ? Number(zoom) : 10;
    return Math.min(MAP_GEO_FETCH_RADIUS_MAX_KM, Math.max(MAP_GEO_FETCH_RADIUS_MIN_KM, 400 / 2 ** (z - 6)));
}

function radiusKmForBounds(bounds) {
    if (!bounds) return MAP_GEO_FETCH_RADIUS_KM;
    const centerLat = (bounds.minLat + bounds.maxLat) / 2;
    const centerLon = (bounds.minLon + bounds.maxLon) / 2;
    const corners = [
        [bounds.minLat, bounds.minLon],
        [bounds.minLat, bounds.maxLon],
        [bounds.maxLat, bounds.minLon],
        [bounds.maxLat, bounds.maxLon],
    ];
    const maxM = Math.max(
        ...corners.map(([lat, lon]) => distanceMeters(centerLat, centerLon, lat, lon)),
    );
    return Math.min(
        MAP_GEO_FETCH_RADIUS_MAX_KM,
        Math.max(MAP_GEO_FETCH_RADIUS_MIN_KM, (maxM / 1000) * 1.12),
    );
}

function filterBoatsInBounds(boats, bounds) {
    if (!bounds || !Array.isArray(boats)) return boats || [];
    return boats.filter((b) => {
        const lat = Number(b.lat);
        const lon = Number(b.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
        return (
            lat >= bounds.minLat &&
            lat <= bounds.maxLat &&
            lon >= bounds.minLon &&
            lon <= bounds.maxLon
        );
    });
}

/** Центр и zoom, чтобы все катера кластера были видны на экране. */
function computeFitCameraForBoats(boats) {
    const coords = (boats || [])
        .map((b) => ({ lat: Number(b.lat), lon: Number(b.lng) }))
        .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));
    if (!coords.length) return null;

    if (coords.length === 1) {
        return {
            lat: coords[0].lat,
            lon: coords[0].lon,
            zoom: Math.min(MAP_ZOOM_CLUSTER_OPEN_MAX, MAP_ZOOM_CLUSTER_OPEN_MIN + 1),
        };
    }

    const lats = coords.map((p) => p.lat);
    const lons = coords.map((p) => p.lon);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    const centerLat = (minLat + maxLat) / 2;
    const centerLon = (minLon + maxLon) / 2;

    const latSpan = Math.max(0.003, maxLat - minLat);
    const lonSpan = Math.max(0.003, maxLon - minLon);
    const span = Math.max(latSpan, lonSpan) * 1.5;

    let zoom = MAP_ZOOM_CLUSTER_OPEN_MAX;
    if (span > 0.2) zoom = 9;
    else if (span > 0.1) zoom = 10;
    else if (span > 0.05) zoom = 11;
    else if (span > 0.02) zoom = 12;
    else zoom = MAP_ZOOM_CLUSTER_OPEN_MAX;

    return {
        lat: centerLat,
        lon: centerLon,
        zoom: Math.min(MAP_ZOOM_CLUSTER_OPEN_MAX, Math.max(MAP_ZOOM_CLUSTER_OPEN_MIN, zoom)),
    };
}

function deriveMapAreaLabel(boatList, fallback) {
    if (!Array.isArray(boatList) || boatList.length === 0) return fallback;
    const regionCounts = new Map();
    for (const b of boatList) {
        const r = String(b?.location_region || '').trim();
        if (!r) continue;
        regionCounts.set(r, (regionCounts.get(r) || 0) + 1);
    }
    if (!regionCounts.size) return fallback;
    let top = '';
    let max = 0;
    for (const [r, n] of regionCounts) {
        if (n > max) {
            max = n;
            top = r;
        }
    }
    return top || fallback;
}

function parseCameraZoom(pos) {
    if (!pos) return null;
    const raw = pos.zoom ?? pos.zoomLevel ?? pos.scale;
    const z = Number(raw);
    return Number.isFinite(z) ? z : null;
}

function parseCameraPoint(pos) {
    if (!pos) return null;
    const latRaw = pos?.point?.lat ?? pos?.lat ?? pos?.latitude;
    const lonRaw = pos?.point?.lon ?? pos?.lon ?? pos?.longitude;
    const lat = Number(latRaw);
    const lon = Number(lonRaw);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { lat, lon };
}

function applyCameraToLiveRef(liveRef, pos) {
    const point = parseCameraPoint(pos);
    const zoom = parseCameraZoom(pos);
    const prev = liveRef.current;
    liveRef.current = {
        lat: point?.lat ?? prev.lat,
        lon: point?.lon ?? prev.lon,
        zoom: zoom ?? prev.zoom,
    };
}

function visibleRegionBounds(region) {
    if (!region) return null;
    const corners = [region.topLeft, region.topRight, region.bottomLeft, region.bottomRight].filter(Boolean);
    if (!corners.length) return null;
    const lats = corners.map((p) => Number(p.lat)).filter(Number.isFinite);
    const lons = corners.map((p) => Number(p.lon)).filter(Number.isFinite);
    if (!lats.length || !lons.length) return null;
    const pad = 0.015;
    return {
        minLat: Math.min(...lats) - pad,
        maxLat: Math.max(...lats) + pad,
        minLon: Math.min(...lons) - pad,
        maxLon: Math.max(...lons) + pad,
    };
}

function filterMarkersInVisibleRegion(markers, region) {
    const bounds = visibleRegionBounds(region);
    if (!bounds) return markers;
    return markers.filter(({ point }) => {
        const lat = Number(point?.lat);
        const lon = Number(point?.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
        return (
            lat >= bounds.minLat &&
            lat <= bounds.maxLat &&
            lon >= bounds.minLon &&
            lon <= bounds.maxLon
        );
    });
}

function filterMarkersNearCamera(markers, camera, zoom) {
    const point = parseCameraPoint(camera) ?? camera;
    const lat = Number(point?.lat);
    const lon = Number(point?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return markers;
    const z = Number(zoom) || MAP_ZOOM_ENTER_PRICE_MODE;
    const radiusDeg = 0.35 / Math.pow(2, Math.max(0, z - 10));
    return markers.filter(({ point: p }) => {
        const plat = Number(p?.lat);
        const plon = Number(p?.lon);
        if (!Number.isFinite(plat) || !Number.isFinite(plon)) return false;
        return Math.abs(plat - lat) <= radiusDeg && Math.abs(plon - lon) <= radiusDeg;
    });
}

function getMapMarkerPriceLabel(boat) {
    if (!boat) return '';
    const prices = [];
    const base = Number(boat.price_per_hour) || 0;
    if (base > 0) prices.push(base);
    for (const t of normalizeBoatTiers(boat)) {
        if (t.price > 0) prices.push(t.price);
    }
    if (!prices.length) return '';
    return `${Math.min(...prices).toLocaleString('ru-RU')} ₽`;
}

export default function SearchResultsScreen({ route, navigation }) {
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const isTablet = width >= 600;
    const tabletColumns = isTablet ? (width >= 1200 ? 3 : 2) : 1;
    const gridGap = 12;
    const listSidePadding = theme.spacing.md;
    const cardWidth = isTablet
        ? Math.floor((width - listSidePadding * 2 - gridGap * (tabletColumns - 1)) / tabletColumns)
        : null;
    const { cityName, dateISO, useMyLocation, boatTypeId, boatTypeName, allRegions } = route.params || {};
    const { toggleFavorite, isFavorite } = useContext(FavoritesContext);
    const [allBoats, setAllBoats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtersVisible, setFiltersVisible] = useState(false);
    const [priceModalVisible, setPriceModalVisible] = useState(false);
    const [passengersModalVisible, setPassengersModalVisible] = useState(false);
    const [durationModalVisible, setDurationModalVisible] = useState(false);
    const [captainModalVisible, setCaptainModalVisible] = useState(false);
    const [boatTypeModalVisible, setBoatTypeModalVisible] = useState(false);
    const [locationDateModalVisible, setLocationDateModalVisible] = useState(false);
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [mapModalVisible, setMapModalVisible] = useState(false);
    const [mapViewReady, setMapViewReady] = useState(false);
    const [mapInitFailed, setMapInitFailed] = useState(false);
    const [mapBoats, setMapBoats] = useState([]);
    const [mapLoading, setMapLoading] = useState(false);
    const [mapCenter, setMapCenter] = useState(DEFAULT_MAP_CENTER);
    const [mapZoom, setMapZoom] = useState(10);
    const [mapClusterZoom, setMapClusterZoom] = useState(10);
    const [mapViewMode, setMapViewMode] = useState('cluster');
    const [priceVisibleMarkers, setPriceVisibleMarkers] = useState([]);
    const [mapLiveRegion, setMapLiveRegion] = useState(null);
    const [mapAreaLabel, setMapAreaLabel] = useState('');
    const [selectedMapBoats, setSelectedMapBoats] = useState([]);
    const userLocationRef = useRef(null);
    const mapRef = useRef(null);
    const mapLiveCameraRef = useRef({ lat: DEFAULT_MAP_CENTER.lat, lon: DEFAULT_MAP_CENTER.lon, zoom: 10 });
    const mapViewModeRef = useRef('cluster');
    const clusteredMarkersDataRef = useRef([]);
    const priceVisibleMarkersRef = useRef([]);
    const mapModeTransitionRef = useRef(false);
    const priceMarkerTapRef = useRef({ boatId: null });
    const [clusterMapEpoch, setClusterMapEpoch] = useState(0);
    const mapGeoFetchTimerRef = useRef(null);
    const lastViewportFetchRef = useRef(null);
    const mapModalOpenRef = useRef(false);
    const mapUsesGeoSearchRef = useRef(false);
    const [mapClosing, setMapClosing] = useState(false);

    const dateObj = dateISO ? new Date(dateISO) : new Date();
    const formattedDate = dateObj.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });

    const displayCity = useMyLocation ? 'Рядом со мной' : (allRegions ? 'Все регионы' : (cityName || 'Москва'));

    const isRegion = (name) => name && (String(name).includes('область') || String(name).trim().toLowerCase() === 'московская область');

    const fetchBoats = useCallback(async () => {
        setLoading(true);
        try {
            let list = [];
            if (allRegions) {
                const res = await api.get('/boats', { params: { popular: 1, limit: 200 } });
                list = Array.isArray(res.data) ? res.data : [];
            } else if (useMyLocation) {
                let lat = 55.751244;
                let lng = 37.618423;
                try {
                    const expoLocation = require('expo-location');
                    const { status } =
                        (await expoLocation.requestForegroundPermissionsAsync?.()) || {};
                    if (status === 'granted') {
                        const pos = await expoLocation.getCurrentPositionAsync?.({});
                        if (pos?.coords) {
                            lat = pos.coords.latitude;
                            lng = pos.coords.longitude;
                            userLocationRef.current = { lat, lon: lng };
                        } else userLocationRef.current = null;
                    } else userLocationRef.current = null;
                } catch (_) {
                    userLocationRef.current = null;
                }
                const res = await api.get('/boats', { params: { lat, lng, radius: 50 } });
                list = Array.isArray(res.data) ? res.data : [];
            } else if (cityName && isRegion(cityName)) {
                const res = await api.get('/boats', { params: { region: cityName } });
                list = Array.isArray(res.data) ? res.data : [];
            } else if (cityName) {
                const res = await api.get('/boats', { params: { city: cityName } });
                list = Array.isArray(res.data) ? res.data : [];
            } else {
                const res = await api.get('/boats', { params: { lat: 55.751244, lng: 37.618423, radius: 50 } });
                list = Array.isArray(res.data) ? res.data : [];
            }
            let filtered = list;
            if (boatTypeId) {
                filtered = filtered.filter(
                    (b) =>
                        String(b.type_id) === String(boatTypeId) ||
                        (boatTypeName && (b.type_name || '').toLowerCase() === (boatTypeName || '').toLowerCase()),
                );
            }
            setAllBoats(dedupeBoatsById(filtered));
        } catch (e) {
            console.log('SearchResults fetch error', e);
            setAllBoats([]);
        } finally {
            setLoading(false);
        }
    }, [cityName, useMyLocation, boatTypeId, boatTypeName, allRegions]);

    useEffect(() => {
        fetchBoats();
    }, [fetchBoats]);

    const priceRange = useMemo(() => {
        const prices = allBoats
            .map((b) => Number(b.price_per_hour) || 0)
            .filter((p) => p > 0);
        if (prices.length === 0) return { min: 0, max: 50000 };
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        return { min, max: max > min ? max : min + 1000 };
    }, [allBoats]);

    const boats = useMemo(
        () => applyBoatFilters(allBoats, filters, priceRange),
        [allBoats, filters, priceRange.min, priceRange.max],
    );

    const fetchBoatsForMap = useCallback(
        async (opts = {}) => {
            const {
                lat,
                lng,
                radius = MAP_GEO_FETCH_RADIUS_KM,
                bounds = null,
                fallbackLabel = '',
            } = opts;
            if (lat == null || lng == null) return;
            setMapLoading(true);
            try {
                const res = await api.get('/boats', {
                    params: { lat, lng, radius },
                });
                let list = Array.isArray(res.data) ? res.data : [];
                let filtered = dedupeBoatsById(applyBoatFilters(list, filters, priceRange));
                if (bounds) {
                    filtered = filterBoatsInBounds(filtered, bounds);
                }
                if (mapModalOpenRef.current) {
                    setMapBoats(filtered);
                    mapUsesGeoSearchRef.current = true;
                    setMapAreaLabel(deriveMapAreaLabel(filtered, fallbackLabel || displayCity));
                    lastViewportFetchRef.current = { lat, lng, radiusKm: radius, bounds };
                }
            } catch (_) {
                if (mapModalOpenRef.current) setMapBoats([]);
            } finally {
                if (mapModalOpenRef.current) setMapLoading(false);
            }
        },
        [filters, priceRange, displayCity],
    );

    const fetchBoatsForMapViewport = useCallback(() => {
        if (!mapModalOpenRef.current) return;

        const runFetch = (lat, lng, radiusKm, bounds) => {
            const last = lastViewportFetchRef.current;
            const moved =
                !last ||
                Math.abs(last.lat - lat) >= MAP_PAN_MIN_DEG ||
                Math.abs(last.lng - lng) >= MAP_PAN_MIN_DEG;
            const zoomChanged =
                !last ||
                Math.abs((last.radiusKm || 0) - radiusKm) / Math.max(last.radiusKm || 1, 1) > 0.12;
            if (!moved && !zoomChanged) return;

            fetchBoatsForMap({
                lat,
                lng,
                radius: radiusKm,
                bounds,
                fallbackLabel: displayCity,
            });
        };

        if (!mapRef.current?.getVisibleRegion) {
            const cam = mapLiveCameraRef.current;
            const radiusKm = radiusKmForZoom(cam.zoom);
            runFetch(cam.lat, cam.lon, radiusKm, null);
            return;
        }

        try {
            mapRef.current.getVisibleRegion((region) => {
                if (!mapModalOpenRef.current) return;
                const bounds = visibleRegionBounds(region);
                if (!bounds) {
                    const cam = mapLiveCameraRef.current;
                    runFetch(cam.lat, cam.lon, radiusKmForZoom(cam.zoom), null);
                    return;
                }
                const centerLat = (bounds.minLat + bounds.maxLat) / 2;
                const centerLon = (bounds.minLon + bounds.maxLon) / 2;
                const radiusKm = radiusKmForBounds(bounds);
                runFetch(centerLat, centerLon, radiusKm, bounds);
            });
        } catch (_) {
            const cam = mapLiveCameraRef.current;
            runFetch(cam.lat, cam.lon, radiusKmForZoom(cam.zoom), null);
        }
    }, [fetchBoatsForMap, displayCity]);

    const openMapModal = useCallback(() => {
        let center;
        let zoom = 10;
        if (useMyLocation && userLocationRef.current) {
            center = { lat: userLocationRef.current.lat, lon: userLocationRef.current.lon };
        } else if (cityName && CITY_COORDS[cityName]) {
            center = CITY_COORDS[cityName];
            if (isRegion(cityName)) zoom = 8;
        } else if (boats.length > 0) {
            const withCoords = boats.filter((b) => b.lat != null && b.lng != null);
            if (withCoords.length > 0) {
                const avgLat = withCoords.reduce((s, b) => s + Number(b.lat), 0) / withCoords.length;
                const avgLon = withCoords.reduce((s, b) => s + Number(b.lng), 0) / withCoords.length;
                center = { lat: avgLat, lon: avgLon };
            } else {
                center = DEFAULT_MAP_CENTER;
            }
        } else {
            center = DEFAULT_MAP_CENTER;
        }
        setMapCenter(center);
        setMapZoom(zoom);
        setMapClusterZoom(zoom);
        mapLiveCameraRef.current = { lat: center.lat, lon: center.lon, zoom };
        setMapLiveRegion(null);
        setMapViewMode('cluster');
        setClusterMapEpoch((e) => e + 1);
        setPriceVisibleMarkers([]);
        setMapBoats([]);
        setMapAreaLabel(displayCity);
        setSelectedMapBoats([]);
        mapUsesGeoSearchRef.current = true;
        lastViewportFetchRef.current = null;
        mapModalOpenRef.current = true;
        setMapClosing(false);
        setMapModalVisible(true);
        setMapViewReady(false);
    }, [boats, cityName, useMyLocation, displayCity]);

    const closeMapModal = useCallback(() => {
        mapModalOpenRef.current = false;
        if (mapGeoFetchTimerRef.current) {
            clearTimeout(mapGeoFetchTimerRef.current);
            mapGeoFetchTimerRef.current = null;
        }
        setMapClosing(true);
        // Сначала очищаем маркеры, даём нативу обработать удаление, затем закрываем — снижает риск "Failed to remove MapObject"
        setTimeout(() => {
            setMapModalVisible(false);
            setMapClosing(false);
        }, 220);
    }, []);

    useEffect(() => {
        if (!mapModalVisible) {
            mapModalOpenRef.current = false;
            setMapViewReady(false);
            setMapInitFailed(false);
            setMapViewMode('cluster');
            setPriceVisibleMarkers([]);
            setMapLiveRegion(null);
            return;
        }
        let cancelled = false;
        let timer;
        ensureYamapInitialized().then((ok) => {
            if (cancelled) return;
            if (!ok) {
                setMapInitFailed(true);
                return;
            }
            timer = setTimeout(() => {
                if (!cancelled) setMapViewReady(true);
            }, 400);
        });
        return () => {
            cancelled = true;
            if (timer) clearTimeout(timer);
        };
    }, [mapModalVisible]);

    useEffect(() => {
        if (!mapModalVisible || !mapViewReady || mapClosing) return undefined;
        const timer = setTimeout(() => {
            lastViewportFetchRef.current = null;
            fetchBoatsForMapViewport();
        }, 350);
        return () => clearTimeout(timer);
    }, [mapModalVisible, mapViewReady, mapClosing, clusterMapEpoch, fetchBoatsForMapViewport]);

    useEffect(() => {
        mapViewModeRef.current = mapViewMode;
    }, [mapViewMode]);

    const refreshPriceVisibleMarkers = useCallback((onDone) => {
        const allMarkers = clusteredMarkersDataRef.current;
        if (!allMarkers.length) {
            setPriceVisibleMarkers([]);
            onDone?.();
            return;
        }
        const finish = (next) => {
            setPriceVisibleMarkers(next.length > 0 ? next : allMarkers);
            onDone?.();
        };
        if (!mapRef.current?.getVisibleRegion) {
            mapRef.current?.getCameraPosition?.((pos) => {
                applyCameraToLiveRef(mapLiveCameraRef, pos);
                finish(filterMarkersNearCamera(allMarkers, pos, parseCameraZoom(pos)));
            });
            return;
        }
        try {
            mapRef.current.getVisibleRegion((region) => {
                const filtered = filterMarkersInVisibleRegion(allMarkers, region);
                if (filtered.length > 0) {
                    finish(filtered);
                    return;
                }
                mapRef.current?.getCameraPosition?.((pos) => {
                    applyCameraToLiveRef(mapLiveCameraRef, pos);
                    finish(filterMarkersNearCamera(allMarkers, pos, parseCameraZoom(pos)));
                });
            });
        } catch (_) {
            finish(allMarkers);
        }
    }, []);

    const enterPriceMode = useCallback(() => {
        if (mapModeTransitionRef.current || mapViewModeRef.current === 'price') return;
        mapModeTransitionRef.current = true;
        const finish = () => {
            refreshPriceVisibleMarkers(() => {
                setMapViewMode('price');
                mapModeTransitionRef.current = false;
            });
        };
        if (!mapRef.current?.getCameraPosition) {
            setMapLiveRegion({ ...mapLiveCameraRef.current });
            finish();
            return;
        }
        mapRef.current.getCameraPosition((pos) => {
            applyCameraToLiveRef(mapLiveCameraRef, pos);
            setMapLiveRegion({ ...mapLiveCameraRef.current });
            finish();
        });
    }, [refreshPriceVisibleMarkers]);

    const exitPriceMode = useCallback(() => {
        if (mapViewModeRef.current !== 'price' || mapModeTransitionRef.current) return;
        mapModeTransitionRef.current = true;
        const finish = () => {
            setPriceVisibleMarkers([]);
            setSelectedMapBoats([]);
            setClusterMapEpoch((e) => e + 1);
            setMapViewMode('cluster');
            mapModeTransitionRef.current = false;
        };
        if (!mapRef.current?.getCameraPosition) {
            setMapLiveRegion({ ...mapLiveCameraRef.current });
            finish();
            return;
        }
        mapRef.current.getCameraPosition((pos) => {
            applyCameraToLiveRef(mapLiveCameraRef, pos);
            setMapLiveRegion({ ...mapLiveCameraRef.current });
            finish();
        });
    }, []);

    const syncMapModeForZoom = useCallback(
        (zoom, phase = 'move') => {
            if (zoom == null) return;
            if (mapViewModeRef.current === 'cluster' && zoom >= MAP_ZOOM_ENTER_PRICE_MODE) {
                enterPriceMode();
                return;
            }
            // Выход в кластеры — только после жеста (не во время pinch), иначе ломается группировка.
            if (phase === 'end' && mapViewModeRef.current === 'price' && zoom <= MAP_ZOOM_EXIT_PRICE_MODE) {
                exitPriceMode();
                return;
            }
            if (mapViewModeRef.current === 'price' && phase === 'end') {
                refreshPriceVisibleMarkers();
            }
        },
        [enterPriceMode, exitPriceMode, refreshPriceVisibleMarkers],
    );

    const handleCameraPositionChange = useCallback((event) => {
        const native = event?.nativeEvent ?? event;
        applyCameraToLiveRef(mapLiveCameraRef, native);
        syncMapModeForZoom(parseCameraZoom(native), 'move');
    }, [syncMapModeForZoom]);

    const scheduleMapViewportFetch = useCallback(() => {
        if (mapModeTransitionRef.current) return;
        if (mapGeoFetchTimerRef.current) clearTimeout(mapGeoFetchTimerRef.current);
        mapGeoFetchTimerRef.current = setTimeout(() => {
            mapGeoFetchTimerRef.current = null;
            fetchBoatsForMapViewport();
        }, 450);
    }, [fetchBoatsForMapViewport]);

    const handleCameraPositionChangeEnd = useCallback(
        (event) => {
            const native = event?.nativeEvent ?? event;
            applyCameraToLiveRef(mapLiveCameraRef, native);
            const zoom = parseCameraZoom(native);
            syncMapModeForZoom(zoom, 'end');
            if (mapViewModeRef.current === 'cluster' && zoom != null) {
                setMapClusterZoom(zoom);
            }
            scheduleMapViewportFetch();
        },
        [syncMapModeForZoom, scheduleMapViewportFetch],
    );

    useEffect(() => {
        if (!mapModalVisible || !mapViewReady || mapViewMode !== 'price') return undefined;
        const pollZoom = () => {
            if (!mapModalOpenRef.current || mapViewModeRef.current !== 'price') return;
            try {
                mapRef.current?.getCameraPosition?.((pos) => {
                    applyCameraToLiveRef(mapLiveCameraRef, pos);
                    const zoom = parseCameraZoom(pos);
                    if (zoom != null && zoom <= MAP_ZOOM_EXIT_PRICE_MODE) {
                        exitPriceMode();
                    }
                });
            } catch (_) {}
        };
        pollZoom();
        const id = setInterval(pollZoom, 500);
        return () => clearInterval(id);
    }, [mapModalVisible, mapViewReady, mapViewMode, exitPriceMode]);

    const zoomMapToPoint = useCallback((point, zoom) => {
        if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lon)) return;
        mapModeTransitionRef.current = true;
        mapLiveCameraRef.current = { lat: point.lat, lon: point.lon, zoom };
        setMapLiveRegion({ lat: point.lat, lon: point.lon, zoom });
        setMapClusterZoom(zoom);
        try {
            mapRef.current?.setCenter?.(point, zoom, 0, 0, 0.35);
        } catch (_) {}
        setTimeout(() => {
            mapModeTransitionRef.current = false;
        }, 500);
    }, []);

    const handleMapBoatPress = useCallback((boat, markerPoint) => {
        if (!boat) return;
        const nearby = findNearbyMapBoats(
            boat,
            mapViewModeRef.current === 'price' && priceVisibleMarkersRef.current.length
                ? priceVisibleMarkersRef.current
                : clusteredMarkersDataRef.current,
            markerPoint,
        );
        const boatId = String(boat.id);
        const nearbyIds = nearby.map((b) => String(b.id)).sort().join(',');

        setSelectedMapBoats((prev) => {
            const prevIds = prev.map((b) => String(b.id)).sort().join(',');
            const isSameSelection = prevIds === nearbyIds && prevIds.length > 0;
            const isSingleBoat = nearby.length === 1;

            if (
                isSameSelection &&
                isSingleBoat &&
                priceMarkerTapRef.current.boatId === boatId
            ) {
                const pt = markerPoint ?? { lat: Number(boat.lat), lon: Number(boat.lng) };
                zoomMapToPoint(pt, MAP_ZOOM_MARKER_CLOSE);
                return prev;
            }

            priceMarkerTapRef.current = { boatId };
            if (isSameSelection) return [];
            return nearby;
        });
    }, [zoomMapToPoint]);

    useEffect(() => {
        if (!mapModalVisible || mapClosing) return;
        lastViewportFetchRef.current = null;
        fetchBoatsForMapViewport();
    }, [mapModalVisible, mapClosing, filters, fetchBoatsForMapViewport]);

    const handleLocationClusterPress = useCallback((cluster) => {
        if (!cluster?.point || mapModeTransitionRef.current) return;
        const { boats: clusterBoats } = cluster;
        const markers = buildClusteredMapMarkers(clusterBoats || []);
        const fit = computeFitCameraForBoats(clusterBoats || []);
        const point = fit
            ? { lat: fit.lat, lon: fit.lon }
            : cluster.point;
        const zoom = fit?.zoom ?? MAP_ZOOM_CLUSTER_OPEN_MAX;

        mapModeTransitionRef.current = true;
        priceMarkerTapRef.current = { boatId: null };
        mapLiveCameraRef.current = { lat: point.lat, lon: point.lon, zoom };
        setMapLiveRegion({ lat: point.lat, lon: point.lon, zoom });
        setMapClusterZoom(zoom);
        setPriceVisibleMarkers(markers);
        setSelectedMapBoats([]);
        setMapViewMode('price');
        try {
            mapRef.current?.setCenter?.(point, zoom, 0, 0, 0.35);
        } catch (_) {}
        setTimeout(() => {
            mapModeTransitionRef.current = false;
        }, 500);
    }, []);

    const isMapBoatSelected = useCallback(
        (boatId) => selectedMapBoats.some((b) => String(b.id) === String(boatId)),
        [selectedMapBoats],
    );

    const clusteredMarkersData = useMemo(() => {
        if (mapClosing) return [];
        return buildClusteredMapMarkers(mapBoats);
    }, [mapBoats, mapClosing]);

    const locationClusterMarkers = useMemo(() => {
        if (mapClosing) return [];
        return buildLocationClusterMarkers(mapBoats, mapClusterZoom);
    }, [mapBoats, mapClosing, mapClusterZoom]);

    useEffect(() => {
        clusteredMarkersDataRef.current = clusteredMarkersData;
    }, [clusteredMarkersData]);

    useEffect(() => {
        priceVisibleMarkersRef.current = priceVisibleMarkers;
    }, [priceVisibleMarkers]);

    const mapInitialRegion = mapLiveRegion ?? {
        lat: mapCenter.lat,
        lon: mapCenter.lon,
        zoom: mapZoom,
    };

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
        const seenByName = new Map();
        for (const b of allBoats) {
            const rawName = b.type_name || 'Без типа';
            const key = rawName.trim().toLowerCase();
            if (!key) continue;
            if (!seenByName.has(key)) {
                const typeId = b.type_id ?? rawName;
                // Уникальный id: type_id + name, чтобы разные типы с одним type_id не выделялись вместе
                const id = `${typeId}|${rawName}`;
                seenByName.set(key, { id, typeId, name: rawName });
            }
        }
        return [...seenByName.values()].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }, [allBoats]);

    // При переходе с главного экрана по категории сразу отмечаем тип катера в фильтрах
    useEffect(() => {
        if (!boatTypeId && !boatTypeName) return;
        setFilters((prev) => {
            const sameId =
                (boatTypeId == null && prev.boatTypeId == null) ||
                String(prev.boatTypeId) === String(boatTypeId);
            const sameName =
                (boatTypeName == null && prev.boatTypeName == null) ||
                (prev.boatTypeName || '').toLowerCase() === (boatTypeName || '').toLowerCase();
            if (sameId && sameName) return prev;
            return {
                ...prev,
                boatTypeId: boatTypeId ?? prev.boatTypeId,
                boatTypeName: boatTypeName ?? prev.boatTypeName,
            };
        });
    }, [boatTypeId, boatTypeName]);

    useEffect(() => {
        if (priceRange.min === 0 && priceRange.max === 50000) return;
        setFilters((prev) => {
            if (prev.priceLow === 0 && prev.priceHigh === 50000) {
                return { ...prev, priceLow: priceRange.min, priceHigh: priceRange.max };
            }
            return prev;
        });
    }, [priceRange.min, priceRange.max]);

    const isPriceFilterActive = filters.priceLow > priceRange.min || filters.priceHigh < priceRange.max;
    const isPassengersFilterActive = filters.passengers !== 1;
    const isDurationFilterActive = !!filters.duration;
    const isBoatTypeFilterActive = !!filters.boatTypeId || !!filters.boatTypeName;
    const isCaptainFilterActive = !!filters.captain;

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
        return n;
    }, [filters, priceRange.min, priceRange.max]);

    const renderBoatCard = ({ item }) => {
        const photoCount = Array.isArray(item.photos) ? item.photos.length : 0;
        const favorite = isFavorite(item.id);
        const instantBook = item.instant_booking !== false;
        const hasTopOwner = item.rating >= 4.8 && !instantBook;

        return (
            <TouchableOpacity
                style={[styles.card, isTablet && { width: cardWidth }]}
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
                        {(() => {
                            const activeDuration = filters.duration || (Number(item.schedule_min_duration) || 60);
                            const activePrice =
                                getExactPriceForDuration(item, activeDuration) ??
                                (Number(item.price_per_hour) || 0);
                            const dur = formatDurationChipLabel(activeDuration);
                            return (
                                <>
                                    <Text style={styles.priceBadgeText}>от {activePrice.toLocaleString('ru-RU')} ₽</Text>
                                    <Text style={styles.priceUnit}>/{dur}</Text>
                                </>
                            );
                        })()}
                    </View>
                </View>

                <View style={styles.cardInfo}>
                    <View style={styles.badgeRow}>
                        {hasTopOwner && (
                            <View style={styles.topOwnerBadge}>
                                <Text style={styles.topOwnerIcon}>🏆</Text>
                                <Text style={styles.topOwnerText}>Бывалый</Text>
                            </View>
                        )}
                        <Text style={styles.locationText}>
                            {formatCardLocation(item)}
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
                    onPress={() => setLocationDateModalVisible(true)}
                    activeOpacity={0.8}
                >
                    <View>
                        <Text style={styles.bubbleCity}>{displayCity}</Text>
                        <Text style={styles.bubbleDate}>{formattedDate}</Text>
                    </View>
                    <ChevronDown size={20} color={NAVY} />
                </TouchableOpacity>
            </View>

            {/* Boat types row (под городом и датой) */}
            {boatTypes.length > 0 && (
                <View style={styles.boatTypesRow}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.boatTypesContent}
                    >
                        {boatTypes.map((t) => {
                            const isSelected =
                                String(filters.boatTypeId) === String(t.id) ||
                                (filters.boatTypeName && (filters.boatTypeName || '').toLowerCase() === (t.name || '').toLowerCase());
                            return (
                                <TouchableOpacity
                                    key={t.id}
                                    style={[styles.boatTypeCard, isSelected && styles.boatTypeCardSelected]}
                                    onPress={() =>
                                        setFilters((prev) =>
                                            isSelected
                                                ? { ...prev, boatTypeId: null, boatTypeName: null }
                                                : {
                                                      ...prev,
                                                      boatTypeId: t.id,
                                                      boatTypeName: t.name,
                                                  }
                                        )
                                    }
                                    activeOpacity={0.7}
                                >
                                    <Text
                                        style={[
                                            styles.boatTypeCardText,
                                            isSelected && styles.boatTypeCardTextSelected,
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {t.name}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            )}

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
                    <TouchableOpacity
                        style={isCaptainFilterActive ? styles.filterChipActive : styles.filterChip}
                        activeOpacity={0.7}
                        onPress={() => setCaptainModalVisible(true)}
                    >
                        <Text style={isCaptainFilterActive ? styles.filterChipActiveText : styles.filterChipText}>
                            Капитан
                        </Text>
                        <ChevronDown size={14} color={isCaptainFilterActive ? NAVY : theme.colors.gray700} />
                    </TouchableOpacity>
                </ScrollView>
            </View>

            <FiltersModal
                visible={filtersVisible}
                onClose={() => setFiltersVisible(false)}
                filters={filters}
                onApply={setFilters}
                totalResults={boats.length}
                priceMin={priceRange.min}
                priceMax={priceRange.max}
                durationOptions={durationOptions}
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
            <Modal visible={captainModalVisible} animationType="slide" transparent>
                <View style={styles.captainModalOverlay}>
                    <TouchableOpacity style={styles.captainModalBackdrop} activeOpacity={1} onPress={() => setCaptainModalVisible(false)} />
                    <View style={[styles.captainModalSheet, isTablet && styles.captainModalSheetTablet, { paddingBottom: insets.bottom + 20 }]}>
                        <View style={styles.captainModalHeader}>
                            <Text style={styles.captainModalTitle}>Капитан</Text>
                            <TouchableOpacity onPress={() => setCaptainModalVisible(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                                <X size={24} color={NAVY} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.captainModalContent}>
                            <TouchableOpacity
                                style={[styles.captainOption, filters.captain === 'С капитаном' && styles.captainOptionActive]}
                                onPress={() => { setFilters((prev) => ({ ...prev, captain: 'С капитаном' })); setCaptainModalVisible(false); }}
                            >
                                <Text style={[styles.captainOptionText, filters.captain === 'С капитаном' && styles.captainOptionTextActive]}>С капитаном</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.captainOption, filters.captain === 'Без капитана' && styles.captainOptionActive]}
                                onPress={() => { setFilters((prev) => ({ ...prev, captain: 'Без капитана' })); setCaptainModalVisible(false); }}
                            >
                                <Text style={[styles.captainOptionText, filters.captain === 'Без капитана' && styles.captainOptionTextActive]}>Без капитана</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.captainClearBtn}
                                onPress={() => { setFilters((prev) => ({ ...prev, captain: null })); setCaptainModalVisible(false); }}
                            >
                                <Text style={styles.captainClearText}>Сбросить</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            <BoatTypeFilterModal
                visible={boatTypeModalVisible}
                onClose={() => setBoatTypeModalVisible(false)}
                boatTypeId={filters.boatTypeId}
                boatTypeName={filters.boatTypeName}
                boatTypes={boatTypes}
                onApply={(p) => setFilters((prev) => ({ ...prev, ...p }))}
            />
            <LocationDateModal
                visible={locationDateModalVisible}
                onClose={() => setLocationDateModalVisible(false)}
                initialCity={cityName || 'Москва'}
                initialUseLocation={!!useMyLocation}
                initialDateISO={dateISO}
                onApply={({ cityName: newCity, useMyLocation: newUseLoc, dateISO: newDateISO }) => {
                    navigation.replace('SearchResults', {
                        cityName: newUseLoc ? null : newCity,
                        useMyLocation: newUseLoc,
                        dateISO: newDateISO,
                        boatTypeId,
                        boatTypeName,
                    });
                }}
            />

            {/* Boat list */}
            <FlatList
                key={`boats-${tabletColumns}`}
                data={boats}
                renderItem={renderBoatCard}
                keyExtractor={(item, index) => `boat-${item.id}-${index}`}
                numColumns={tabletColumns}
                columnWrapperStyle={tabletColumns > 1 ? styles.gridRow : undefined}
                contentContainerStyle={[
                    styles.list,
                    { paddingHorizontal: listSidePadding },
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
                onRequestClose={closeMapModal}
            >
                <View style={[styles.mapModalOverlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
                    <View style={styles.mapModalContent}>
                        <View style={styles.mapModalHeader}>
                            <TouchableOpacity
                                onPress={closeMapModal}
                                style={styles.mapModalClose}
                                hitSlop={12}
                            >
                                <Text style={styles.mapModalCloseText}>✕</Text>
                            </TouchableOpacity>
                            <Text style={styles.mapModalTitle} numberOfLines={1}>
                                {mapAreaLabel || displayCity} — катера на карте
                            </Text>
                            <View style={{ width: 36 }} />
                        </View>
                        {!isMapAvailable || !Marker || !YaMap ? (
                            <View style={styles.mapPlaceholder}>
                                <Text style={styles.mapPlaceholderText}>
                                    Карта доступна в полной сборке приложения (expo run:android / expo run:ios)
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.mapContainer}>
                                {mapInitFailed ? (
                                    <View style={styles.mapLoadingOverlay}>
                                        <Text style={styles.mapPlaceholderText}>
                                            Не удалось загрузить карту. Проверьте ключ MapKit в кабинете Яндекса для Bundle ID ru.onthewater.client и пересоберите приложение.
                                        </Text>
                                    </View>
                                ) : !mapViewReady ? (
                                    <View style={styles.mapLoadingOverlay}>
                                        <ActivityIndicator size="large" color={NAVY} />
                                        <Text style={styles.mapPlaceholderText}>Загрузка карты...</Text>
                                    </View>
                                ) : mapViewMode === 'price' ? (
                                    <YaMap
                                        key={`map-price-e${clusterMapEpoch}`}
                                        ref={mapRef}
                                        style={StyleSheet.absoluteFillObject}
                                        initialRegion={mapInitialRegion}
                                        onCameraPositionChange={handleCameraPositionChange}
                                        onCameraPositionChangeEnd={handleCameraPositionChangeEnd}
                                    >
                                        {priceVisibleMarkers.map((info, index) => {
                                            const boat = info.data;
                                            const isSelected = isMapBoatSelected(boat?.id);
                                            const price = getMapMarkerPriceLabel(boat);
                                            return (
                                                <Marker
                                                    key={`map-price-${boat?.id ?? index}`}
                                                    point={info.point}
                                                    anchor={{ x: 0.5, y: 1 }}
                                                    onPress={() => boat && handleMapBoatPress(boat, info.point)}
                                                >
                                                    <MapPriceBubble price={price} selected={isSelected} />
                                                </Marker>
                                            );
                                        })}
                                    </YaMap>
                                ) : (
                                    <YaMap
                                        key={`map-loc-cluster-e${clusterMapEpoch}`}
                                        ref={mapRef}
                                        style={StyleSheet.absoluteFillObject}
                                        initialRegion={mapInitialRegion}
                                        onCameraPositionChange={handleCameraPositionChange}
                                        onCameraPositionChangeEnd={handleCameraPositionChangeEnd}
                                    >
                                        {locationClusterMarkers.map((cluster) => (
                                            <Marker
                                                key={`map-loc-${cluster.id}`}
                                                point={cluster.point}
                                                anchor={{ x: 0.5, y: 0.5 }}
                                                onPress={() => handleLocationClusterPress(cluster)}
                                            >
                                                <MapClusterBubble count={cluster.count} />
                                            </Marker>
                                        ))}
                                    </YaMap>
                                )}
                                {mapLoading && (
                                    <View style={styles.mapLoadingOverlay}>
                                        <ActivityIndicator size="large" color={NAVY} />
                                    </View>
                                )}
                                <TouchableOpacity
                                    style={[styles.mapListButton, { bottom: 24 + insets.bottom }]}
                                    onPress={closeMapModal}
                                    activeOpacity={0.9}
                                >
                                    <Text style={styles.mapListButtonText}>Список</Text>
                                </TouchableOpacity>
                                {selectedMapBoats.length > 0 && (
                                    <View
                                        style={[
                                            styles.mapBoatSheetWrap,
                                            { bottom: 24 + 52 + 16 + insets.bottom },
                                        ]}
                                    >
                                        {selectedMapBoats.length > 1 ? (
                                            <Text style={styles.mapBoatSheetHint}>
                                                {selectedMapBoats.length} катера рядом — выберите
                                            </Text>
                                        ) : null}
                                        <ScrollView
                                            style={{
                                                maxHeight: Math.min(300, selectedMapBoats.length * 100 + 8),
                                            }}
                                            showsVerticalScrollIndicator={selectedMapBoats.length > 2}
                                            keyboardShouldPersistTaps="handled"
                                        >
                                            {selectedMapBoats.map((boat, idx) => (
                                                <TouchableOpacity
                                                    key={String(boat.id)}
                                                    style={[
                                                        styles.mapBoatSheet,
                                                        idx > 0 ? styles.mapBoatSheetStacked : null,
                                                    ]}
                                                    onPress={() => {
                                                        const boatId = boat.id;
                                                        closeMapModal();
                                                        InteractionManager.runAfterInteractions(() => {
                                                            setTimeout(() => {
                                                                navigation.navigate('BoatDetail', { boatId });
                                                            }, 300);
                                                        });
                                                    }}
                                                    activeOpacity={0.92}
                                                >
                                                    <Image
                                                        source={{ uri: resolvePhotoUri(boat.photos?.[0]) }}
                                                        style={styles.mapBoatSheetImage}
                                                    />
                                                    <View style={styles.mapBoatSheetInfo}>
                                                        <Text style={styles.mapBoatSheetTitle} numberOfLines={1}>
                                                            {boat.title || 'Катер'}
                                                        </Text>
                                                        <View style={styles.mapBoatSheetMeta}>
                                                            <Star
                                                                size={14}
                                                                color={theme.colors.star}
                                                                fill={theme.colors.star}
                                                            />
                                                            <Text style={styles.mapBoatSheetRating}>
                                                                {boat.rating ?? 0} ({boat.bookings_count ?? 0}{' '}
                                                                {pluralizeBookings(boat.bookings_count ?? 0)})
                                                            </Text>
                                                        </View>
                                                        <View style={styles.mapBoatSheetPriceRow}>
                                                            {boat.instant_booking !== false && (
                                                                <Zap size={14} color="#10B981" fill="#10B981" />
                                                            )}
                                                            <Text style={styles.mapBoatSheetPrice}>
                                                                от {(Number(boat.price_per_hour) || 0).toLocaleString('ru-RU')}{' '}
                                                                ₽/час
                                                            </Text>
                                                        </View>
                                                    </View>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
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

    /* ---- Boat types row (под городом и датой) ---- */
    boatTypesRow: {
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    boatTypesContent: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: 8,
        paddingRight: theme.spacing.lg,
    },
    boatTypeCard: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 14,
        marginRight: 10,
    },
    boatTypeCardSelected: {
        backgroundColor: NAVY,
    },
    boatTypeCardText: {
        fontSize: 13,
        fontFamily: theme.fonts.medium,
        color: theme.colors.gray700,
        textAlign: 'center',
    },
    boatTypeCardTextSelected: {
        color: '#fff',
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
    gridRow: {
        justifyContent: 'space-between',
        marginBottom: 0,
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
    mapBubbleWrap: {
        width: 80,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    mapBubbleTextWrap: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
    },
    mapBubbleText: {
        fontSize: 14,
        fontFamily: theme.fonts.bold,
        color: '#fff',
    },
    mapListButton: {
        position: 'absolute',
        left: 16,
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: NAVY,
        paddingVertical: 14,
        borderRadius: 28,
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 4,
    },
    mapListButtonText: {
        fontSize: 16,
        fontFamily: theme.fonts.bold,
        color: '#fff',
    },
    mapBoatSheetWrap: {
        position: 'absolute',
        left: 16,
        right: 16,
    },
    mapBoatSheetHint: {
        marginBottom: 8,
        fontSize: 13,
        fontFamily: theme.fonts.semiBold,
        color: NAVY,
        textAlign: 'center',
    },
    mapBoatSheet: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    mapBoatSheetStacked: {
        marginTop: 8,
    },
    mapBoatSheetImage: {
        width: 100,
        height: 80,
        borderRadius: 10,
        backgroundColor: theme.colors.gray100,
    },
    mapBoatSheetInfo: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'space-between',
    },
    mapBoatSheetTitle: {
        fontSize: 15,
        fontFamily: theme.fonts.semiBold,
        color: NAVY,
    },
    mapBoatSheetMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    mapBoatSheetRating: {
        fontSize: 13,
        fontFamily: theme.fonts.regular,
        color: theme.colors.textMuted,
    },
    mapBoatSheetPriceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    mapBoatSheetPrice: {
        fontSize: 15,
        fontFamily: theme.fonts.bold,
        color: NAVY,
    },
    mapLoadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    captainModalOverlay: { flex: 1, justifyContent: 'flex-end' },
    captainModalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
    captainModalSheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 24,
    },
    captainModalSheetTablet: {
        width: '100%',
        maxWidth: 920,
        alignSelf: 'center',
    },
    captainModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 18,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    captainModalTitle: { fontSize: 18, fontFamily: theme.fonts.bold, color: NAVY },
    captainModalContent: { paddingTop: 16, gap: 10 },
    captainOption: {
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#D1D5DB',
        backgroundColor: '#fff',
    },
    captainOptionActive: { borderColor: NAVY, backgroundColor: 'rgba(27,54,93,0.06)' },
    captainOptionText: { fontSize: 16, fontFamily: theme.fonts.medium, color: theme.colors.gray700 },
    captainOptionTextActive: { color: NAVY, fontFamily: theme.fonts.semiBold },
    captainClearBtn: { alignSelf: 'flex-start', paddingVertical: 10 },
    captainClearText: { fontSize: 15, fontFamily: theme.fonts.medium, color: NAVY, textDecorationLine: 'underline' },
});

import React, { useEffect, useState, useContext, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    Modal,
    FlatList,
    TextInput,
    Dimensions,
    Alert,
    Platform,
    KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme } from '../../shared/theme';
import { api } from '../../shared/infrastructure/api';
import { API_BASE } from '../../shared/infrastructure/config';
import { AuthContext } from '../../shared/context/AuthContext';
import { FavoritesContext } from '../../shared/context/FavoritesContext';
import {
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Star,
    X,
    User,
    Users,
    Anchor,
    MessageCircle,
    MapPin,
    CheckCircle2,
    Share2,
    Heart,
    Shield,
    Smile,
    Minus,
    Plus,
    Clock,
    Wifi,
    Music,
    LifeBuoy,
    Sun,
    Tv,
    Bluetooth,
    Droplets,
    UtensilsCrossed,
    Video,
    ShieldCheck,
} from 'lucide-react-native';

const { width, height } = Dimensions.get('window');
const NAVY = '#1B365D';
const IMAGE_HEIGHT = 300;

const resolvePhotoUri = (src) => {
    if (!src) return 'https://placehold.co/800x600/png';
    if (src.startsWith('http') || src.startsWith('file://')) return src;
    return API_BASE + src;
};

const DEFAULT_PRICING_TIERS = [
    { hours: 2, multiplier: 2 },
    { hours: 3, multiplier: 3 },
    { hours: 4, multiplier: 4 },
    { hours: 6, multiplier: 5.5 },
    { hours: 8, multiplier: 7 },
];

const formatDuration = (minutes) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs === 0) return `${mins} мин`;
    if (mins === 0) {
        if (hrs === 1) return '1 час';
        if (hrs < 5) return `${hrs} часа`;
        return `${hrs} часов`;
    }
    return `${hrs} ч ${mins} мин`;
};

const AMENITY_ICONS = {
    gps: ShieldCheck, wifi: Wifi, bluetooth: Bluetooth, audio: Music, tv: Tv,
    shower: Droplets, kitchen: UtensilsCrossed, sunroof: Sun, anchor: Anchor, lifevest: LifeBuoy,
    'GPS-навигация': ShieldCheck, 'Wi-Fi': Wifi, 'Bluetooth': Bluetooth, 'Аудиосистема': Music,
    'Телевизор': Tv, 'Душ': Droplets, 'Кухня': UtensilsCrossed, 'Тент от солнца': Sun,
    'Якорь': Anchor, 'Спасжилеты': LifeBuoy, 'Спасательные жилеты': LifeBuoy,
    'Туалет': Droplets, 'Кондиционер': Sun, 'Холодильник': UtensilsCrossed,
    'Трап для купания': LifeBuoy, 'Эхолот': ShieldCheck,
};

const TIME_SLOTS = [];
for (let h = 9; h <= 20; h++) {
    TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`);
    TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`);
}
/** Занятые интервалы катера [start, end) в формате 'HH:MM'. Подставьте данные с API. */
const BUSY_INTERVALS = [
    { start: '12:00', end: '13:30' },
    { start: '15:30', end: '16:00' },
    { start: '18:00', end: '19:00' },
];

const slotToMinutes = (slot) => {
    const [h, m] = slot.split(':').map(Number);
    return h * 60 + m;
};
const minutesToSlot = (total) => {
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};
/** Слот занят, если время попадает в один из BUSY_INTERVALS */
const isSlotInBusyInterval = (slot) =>
    BUSY_INTERVALS.some((b) => {
        const t = slotToMinutes(slot);
        const start = slotToMinutes(b.start);
        const end = slotToMinutes(b.end);
        return t >= start && t < end;
    });
/** Можно ли начать бронирование в slot при длительности durationMin (мин), чтобы не пересекаться с занятыми интервалами */
const isStartTimeValid = (slot, durationMin) => {
    if (isSlotInBusyInterval(slot)) return false;
    const startMin = slotToMinutes(slot);
    const endMin = startMin + durationMin;
    return BUSY_INTERVALS.every((b) => {
        const bStart = slotToMinutes(b.start);
        const bEnd = slotToMinutes(b.end);
        return endMin <= bStart || startMin >= bEnd;
    });
};

// Календарь: Пн–Вс, рабочие дни катера и полностью занятые
const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const getWeekdayKey = (d) => WEEKDAY_KEYS[d.getDay()];
const toDateKey = (d) => d.toISOString().split('T')[0];
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const getCalendarGrid = (monthDate) => {
    const y = monthDate.getFullYear();
    const m = monthDate.getMonth();
    const first = new Date(y, m, 1);
    let start = new Date(first);
    const dow = first.getDay();
    const toMonday = dow === 0 ? 6 : dow - 1;
    start.setDate(start.getDate() - toMonday);
    const grid = [];
    for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 7; col++) {
            const cell = new Date(start);
            cell.setDate(start.getDate() + row * 7 + col);
            grid.push({
                date: cell,
                isCurrentMonth: cell.getMonth() === m,
            });
        }
    }
    return grid;
};

export default function BoatDetailScreen({ route, navigation }) {
    const insets = useSafeAreaInsets();
    const { user } = useContext(AuthContext);
    const favCtx = useContext(FavoritesContext);
    const toggleFavorite = favCtx?.toggleFavorite || (() => {});
    const isFavorite = favCtx?.isFavorite || (() => false);
    const { boatId } = route.params || {};
    const [boat, setBoat] = useState(null);
    const [loading, setLoading] = useState(true);
    const [reviews, setReviews] = useState([]);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [reviewsVisible, setReviewsVisible] = useState(false);
    const [writeReviewVisible, setWriteReviewVisible] = useState(false);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewText, setReviewText] = useState('');
    const [reviewSubmitting, setReviewSubmitting] = useState(false);
    const [photoIndex, setPhotoIndex] = useState(0);
    const [photoGalleryVisible, setPhotoGalleryVisible] = useState(false);
    const galleryFlatListRef = useRef(null);
    const [descExpanded, setDescExpanded] = useState(false);
    const [specsOpen, setSpecsOpen] = useState(false);
    const [featuresExpanded, setFeaturesExpanded] = useState(false);
    const [similarBoats, setSimilarBoats] = useState([]);
    const [selectedDuration, setSelectedDuration] = useState(null);
    const [bookingVisible, setBookingVisible] = useState(false);
    const [bookingSuccessVisible, setBookingSuccessVisible] = useState(false);
    const [bookDate, setBookDate] = useState(() => new Date());
    const [bookShowDatePicker, setBookShowDatePicker] = useState(false);
    const [bookTime, setBookTime] = useState(null);
    const [bookShowTimePicker, setBookShowTimePicker] = useState(false);
    const [pendingTime, setPendingTime] = useState(null);
    const [calendarMonth, setCalendarMonth] = useState(() => new Date());
    const [fullyBookedDates, setFullyBookedDates] = useState(new Set());
    const [bookHours, setBookHours] = useState(60);
    const [bookCaptain, setBookCaptain] = useState(true);
    const [bookPassengers, setBookPassengers] = useState(4);
    const scrollRef = useRef(null);

    const scrollToCancellationPolicy = () => {
        if (scrollRef.current) scrollRef.current.scrollToEnd({ animated: true });
    };

    useEffect(() => {
        if (boatId) fetchBoat();
    }, [boatId]);

    useFocusEffect(
        useCallback(() => {
            if (boatId) fetchBoat();
        }, [boatId]),
    );

    const fetchBoat = async () => {
        try {
            const res = await api.get(`/boats/${boatId}`);
            setBoat(res.data);
            fetchSimilar(res.data);
            fetchReviewsData();
        } catch (e) {
            console.log('Error fetching boat', e);
        } finally {
            setLoading(false);
        }
    };

    const fetchSimilar = async (currentBoat) => {
        try {
            const res = await api.get('/boats', { params: { lat: 55.75, lng: 37.62, radius: 50 } });
            const list = (Array.isArray(res.data) ? res.data : []).filter(
                (b) => b.id !== currentBoat.id,
            );
            setSimilarBoats(list.slice(0, 5));
        } catch (_) {}
    };

    const fetchReviewsData = async () => {
        try {
            const res = await api.get(`/boats/${boatId}/reviews`);
            setReviews(Array.isArray(res.data) ? res.data : []);
        } catch (_) {
            setReviews([]);
        }
    };

    const openReviewsModal = async () => {
        setReviewsVisible(true);
        setReviewsLoading(true);
        setWriteReviewVisible(false);
        setReviewRating(5);
        setReviewText('');
        try {
            const res = await api.get(`/boats/${boatId}/reviews`);
            setReviews(Array.isArray(res.data) ? res.data : []);
        } catch (_) {
            setReviews([]);
        } finally {
            setReviewsLoading(false);
        }
    };

    const openWriteReview = () => {
        if (!user) {
            Alert.alert('Вход в аккаунт', 'Войдите, чтобы оставить отзыв', [
                { text: 'Отмена', style: 'cancel' },
                { text: 'Войти', onPress: () => navigation.navigate('Login', { fromProfile: false }) },
            ]);
            return;
        }
        setWriteReviewVisible(true);
        setReviewRating(5);
        setReviewText('');
    };

    const submitReview = async () => {
        if (!user) return;
        setReviewSubmitting(true);
        try {
            await api.post(`/boats/${boatId}/reviews`, { rating: reviewRating, text: reviewText });
            setWriteReviewVisible(false);
            setReviewText('');
            setReviewRating(5);
            await fetchReviewsData();
            const boatRes = await api.get(`/boats/${boatId}`);
            setBoat(boatRes.data);
        } catch (err) {
            const msg = err.response?.data?.error || 'Не удалось отправить отзыв';
            Alert.alert('Ошибка', msg);
        } finally {
            setReviewSubmitting(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={NAVY} />
            </View>
        );
    }
    if (!boat) {
        return (
            <View style={styles.centered}>
                <Text style={{ fontSize: 18, fontFamily: theme.fonts.semiBold, color: NAVY }}>
                    Катер не найден
                </Text>
            </View>
        );
    }

    const photos = boat.photos?.length ? boat.photos.map(resolvePhotoUri) : ['https://placehold.co/800x600/png'];
    const description = boat.description || '';
    const descShort = description.length > 160 ? description.slice(0, 160) + '...' : description;
    const amenities = boat.amenities?.length ? boat.amenities : [];
    const rating = boat.rating ?? 0;
    const reviewsCount = boat.reviews_count ?? 0;
    const favorite = isFavorite(boat.id);
    const basePrice = Number(boat.price_per_hour) || 0;
    const minDuration = boat.schedule_min_duration || 60;
    const serverTiers = boat.price_tiers;
    const hasServerTiers = Array.isArray(serverTiers) && serverTiers.length > 0;

    let weekendBase = boat.price_weekend != null && String(boat.price_weekend).trim() !== '' ? Number(boat.price_weekend) : null;
    if (weekendBase == null && hasServerTiers) {
        const firstWithWeekend = serverTiers.find(
            (t) => t.price_weekend != null && String(t.price_weekend).trim() !== '' && Number(t.price) > 0
        );
        if (firstWithWeekend) {
            const ratio = Number(firstWithWeekend.price_weekend) / Number(firstWithWeekend.price);
            weekendBase = Math.round(basePrice * ratio);
        }
    }
    const displayTiers = hasServerTiers
        ? [
              { durationMin: minDuration, price: basePrice, priceWeekend: weekendBase },
              ...serverTiers.map((t) => ({
                  durationMin: t.duration,
                  price: Number(t.price) || 0,
                  priceWeekend: t.price_weekend != null && String(t.price_weekend).trim() !== '' ? Number(t.price_weekend) : null,
              })),
          ]
        : DEFAULT_PRICING_TIERS.map((t) => {
              const durationMin = t.hours * 60;
              return {
                  durationMin,
                  price: Math.round(basePrice * t.multiplier),
                  priceWeekend: weekendBase != null
                      ? Math.round(weekendBase * (durationMin / minDuration))
                      : null,
              };
          });

    const minDurationLabel = formatDuration(minDuration);

    const getPrice = (durationMin) => {
        const exact = displayTiers.find((t) => t.durationMin === durationMin);
        if (exact) return exact.price;
        const pricePerMin = basePrice / minDuration;
        return Math.round(pricePerMin * durationMin);
    };

    const isWeekend = (d) => d.getDay() === 0 || d.getDay() === 6;
    const getPriceForDate = (date, durationMin) => {
        const exact = displayTiers.find((t) => t.durationMin === durationMin);
        const weekdayPrice = exact ? exact.price : getPrice(durationMin);
        if (isWeekend(date)) {
            if (exact?.priceWeekend != null) return exact.priceWeekend;
            const withWeekend = displayTiers.find((t) => t.priceWeekend != null);
            if (withWeekend) {
                const ratio = withWeekend.priceWeekend / withWeekend.price;
                return Math.round(weekdayPrice * ratio);
            }
        }
        return weekdayPrice;
    };

    const handleBook = () => {
        if (!user) {
            navigation.navigate('Login', { fromProfile: false });
            return;
        }
        const dur = selectedDuration || displayTiers[0]?.durationMin || 120;
        setBookHours(dur);
        setBookingVisible(true);
    };

    const bookPrice = getPriceForDate(bookDate, bookHours);
    const formatBookDate = (d) =>
        d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

    const onBookDateChange = (event, selected) => {
        setBookShowDatePicker(Platform.OS === 'ios');
        if (selected) setBookDate(selected);
    };

    const formatBookTime = (slot) => slot || '';

    const submitBooking = async () => {
        try {
            await api.post('/bookings', {
                boat_id: boat.id,
                start_at: bookTime
                    ? `${bookDate.toISOString().split('T')[0]}T${bookTime}:00`
                    : bookDate.toISOString(),
                hours: bookHours,
                passengers: bookPassengers,
                captain: bookCaptain,
                total_price: getPriceForDate(bookDate, bookHours),
            });
            setBookingVisible(false);
            setBookingSuccessVisible(true);
        } catch (e) {
            Alert.alert('Ошибка', e.response?.data?.error || 'Не удалось отправить запрос');
        }
    };

    const hasCancellationPolicy = !!(boat.cancellation_policy && String(boat.cancellation_policy).trim());
    const responseSpeedLabel = '—';

    return (
        <View style={styles.container}>
            <ScrollView
                ref={scrollRef}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
            >
                {/* ============ HERO PHOTO ============ */}
                <View style={styles.gallery}>
                    <ScrollView
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onMomentumScrollEnd={(e) =>
                            setPhotoIndex(Math.round(e.nativeEvent.contentOffset.x / width))
                        }
                    >
                        {photos.map((uri, i) => (
                            <TouchableOpacity
                                key={i}
                                activeOpacity={1}
                                onPress={() => {
                                    setPhotoIndex(i);
                                    setPhotoGalleryVisible(true);
                                }}
                                style={styles.heroImageWrap}
                            >
                                <Image source={{ uri }} style={styles.heroImage} resizeMode="cover" />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                    <LinearGradient
                        colors={['rgba(0,0,0,0.35)', 'transparent', 'transparent']}
                        style={StyleSheet.absoluteFill}
                        pointerEvents="none"
                    />
                    <View style={[styles.topNav, { paddingTop: insets.top + 8 }]}>
                        <TouchableOpacity style={styles.navBtn} onPress={() => navigation.goBack()}>
                            <ChevronLeft size={22} color={NAVY} />
                        </TouchableOpacity>
                        <View style={styles.navRight}>
                            <TouchableOpacity style={styles.navBtn} onPress={() => Alert.alert('Поделиться', 'В следующей версии.')}>
                                <Share2 size={20} color={NAVY} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.navBtn} onPress={() => toggleFavorite(boat)}>
                                <Heart size={20} color={favorite ? '#ef4444' : NAVY} fill={favorite ? '#ef4444' : 'transparent'} />
                            </TouchableOpacity>
                        </View>
                    </View>
                    {photos.length > 1 && (
                        <View style={styles.photoCounter}>
                            <Text style={styles.photoCounterText}>
                                {photoIndex + 1}/{photos.length}
                            </Text>
                        </View>
                    )}
                    {photos.length > 1 && (
                        <View style={styles.dots}>
                            {photos.map((_, i) => (
                                <View key={i} style={[styles.dot, i === photoIndex && styles.dotActive]} />
                            ))}
                        </View>
                    )}
                    {Array.isArray(boat.video_uris) && boat.video_uris.length > 0 && (
                        <View style={styles.videoBadge}>
                            <Video size={14} color="#fff" />
                            <Text style={styles.videoBadgeText}>Видео: {boat.video_uris.length}</Text>
                        </View>
                    )}
                </View>

                {/* Full-screen photo gallery modal */}
                <Modal
                    visible={photoGalleryVisible}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setPhotoGalleryVisible(false)}
                >
                    <View style={[fsGalleryStyles.overlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
                        <TouchableOpacity
                            style={[fsGalleryStyles.closeBtn, { top: insets.top + 8 }]}
                            onPress={() => setPhotoGalleryVisible(false)}
                            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                        >
                            <X size={28} color="#fff" />
                        </TouchableOpacity>
                        <FlatList
                            ref={galleryFlatListRef}
                            data={photos}
                            keyExtractor={(_, i) => String(i)}
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            initialScrollIndex={Math.min(photoIndex, photos.length - 1)}
                            getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
                            onMomentumScrollEnd={(e) =>
                                setPhotoIndex(Math.round(e.nativeEvent.contentOffset.x / width))
                            }
                            renderItem={({ item: uri }) => (
                                <View style={fsGalleryStyles.slide}>
                                    <Image source={{ uri }} style={fsGalleryStyles.fullImage} resizeMode="contain" />
                                </View>
                            )}
                        />
                        {photos.length > 1 && (
                            <>
                                <TouchableOpacity
                                    style={[fsGalleryStyles.navBtn, fsGalleryStyles.navLeft]}
                                    onPress={() => {
                                        const next = Math.max(0, photoIndex - 1);
                                        setPhotoIndex(next);
                                        galleryFlatListRef.current?.scrollToIndex({ index: next, animated: true });
                                    }}
                                    disabled={photoIndex <= 0}
                                >
                                    <ChevronLeft size={36} color={photoIndex <= 0 ? 'rgba(255,255,255,0.3)' : '#fff'} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[fsGalleryStyles.navBtn, fsGalleryStyles.navRight]}
                                    onPress={() => {
                                        const next = Math.min(photos.length - 1, photoIndex + 1);
                                        setPhotoIndex(next);
                                        galleryFlatListRef.current?.scrollToIndex({ index: next, animated: true });
                                    }}
                                    disabled={photoIndex >= photos.length - 1}
                                >
                                    <ChevronRight size={36} color={photoIndex >= photos.length - 1 ? 'rgba(255,255,255,0.3)' : '#fff'} />
                                </TouchableOpacity>
                                <View style={[fsGalleryStyles.counter, { bottom: insets.bottom + 24 }]}>
                                    <Text style={fsGalleryStyles.counterText}>
                                        {photoIndex + 1}/{photos.length}
                                    </Text>
                                </View>
                            </>
                        )}
                    </View>
                </Modal>

                <View style={styles.content}>
                    {/* ============ TYPE + CITY + TITLE + RATING ============ */}
                    {boat.type_name ? (
                        <Text style={styles.typeLabel}>Тип судна: {boat.type_name}</Text>
                    ) : null}
                    <Text style={styles.cityLabel}>
                        {(boat.location_city || '').toUpperCase()}
                    </Text>
                    <Text style={styles.title}>{boat.title}</Text>
                    <TouchableOpacity style={styles.ratingRow} onPress={openReviewsModal}>
                        <Star size={16} color={theme.colors.star} fill={theme.colors.star} />
                        <Text style={styles.ratingText}> {rating}</Text>
                        <Text style={styles.ratingCount}> ({reviewsCount} отзывов)</Text>
                    </TouchableOpacity>

                    {/* ============ INFO GRID 2x2 ============ */}
                    <View style={styles.infoGrid}>
                        <View style={styles.infoCell}>
                            <View style={[styles.infoBadge, { backgroundColor: '#E5E7EB' }]}>
                                <Text style={[styles.infoBadgeText, { color: '#4B5563' }]}>{responseSpeedLabel}</Text>
                            </View>
                            <Text style={styles.infoCellLabel}>Скорость{'\n'}ответа</Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.infoCell, styles.infoCellBorderLeft]}
                            onPress={hasCancellationPolicy ? scrollToCancellationPolicy : undefined}
                            activeOpacity={hasCancellationPolicy ? 0.7 : 1}
                            disabled={!hasCancellationPolicy}
                        >
                            <View style={[styles.infoBadge, { backgroundColor: hasCancellationPolicy ? '#DCFCE7' : '#F3F4F6' }]}>
                                <Text style={[styles.infoBadgeText, { color: hasCancellationPolicy ? '#166534' : '#6B7280' }]}>
                                    {hasCancellationPolicy ? 'Есть' : 'Нет'}
                                </Text>
                            </View>
                            <Text style={styles.infoCellLabel}>Политика{'\n'}отмены</Text>
                        </TouchableOpacity>
                        <View style={[styles.infoCell, styles.infoCellBorderTop]}>
                            <Users size={22} color={NAVY} />
                            <Text style={styles.infoCellLabel}>До {boat.capacity || '—'}{'\n'}гостей</Text>
                        </View>
                        <View style={[styles.infoCell, styles.infoCellBorderLeft, styles.infoCellBorderTop]}>
                            <Smile size={22} color={NAVY} />
                            <Text style={styles.infoCellLabel}>
                                {boat.captain_included ? 'С капитаном' : 'Без капитана'}
                            </Text>
                        </View>
                    </View>

                    {/* ============ THE BOAT (DESCRIPTION) ============ */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>О катере</Text>
                        <Text style={styles.bodyText}>
                            {descExpanded ? description : descShort}
                        </Text>
                        {description.length > 160 && (
                            <TouchableOpacity onPress={() => setDescExpanded(!descExpanded)}>
                                <Text style={styles.viewAll}>
                                    {descExpanded ? 'Свернуть' : 'Подробнее'}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={styles.divider} />

                    {/* ============ FEATURES (icons like add boat) ============ */}
                    {amenities.length > 0 && (
                        <>
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Удобства</Text>
                                <View style={styles.amenitiesGrid}>
                                    {(featuresExpanded ? amenities : amenities.slice(0, 6)).map((nameOrId, i) => {
                                        const IconComp = AMENITY_ICONS[nameOrId] || CheckCircle2;
                                        const label = typeof nameOrId === 'string' ? nameOrId : '';
                                        return (
                                            <View key={i} style={styles.amenityItem}>
                                                <View style={styles.amenityIconWrap}>
                                                    <IconComp size={20} color={NAVY} strokeWidth={1.8} />
                                                </View>
                                                <Text style={styles.amenityItemLabel} numberOfLines={2}>{label}</Text>
                                            </View>
                                        );
                                    })}
                                </View>
                                {amenities.length > 6 && (
                                    <TouchableOpacity onPress={() => setFeaturesExpanded(!featuresExpanded)}>
                                        <Text style={styles.viewAll}>
                                            {featuresExpanded ? 'Скрыть' : 'Показать все'}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                            <View style={styles.divider} />
                        </>
                    )}

                    {/* ============ SPECIFICATIONS (collapsible) ============ */}
                    <TouchableOpacity
                        style={styles.collapsibleHeader}
                        onPress={() => setSpecsOpen(!specsOpen)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.sectionTitle}>Характеристики</Text>
                        <ChevronDown
                            size={22}
                            color={NAVY}
                            style={{ transform: [{ rotate: specsOpen ? '180deg' : '0deg' }] }}
                        />
                    </TouchableOpacity>
                    {specsOpen && (
                        <View style={styles.specsContent}>
                            {boat.manufacturer ? <SpecRow label="Производитель" value={boat.manufacturer} /> : null}
                            {boat.model ? <SpecRow label="Модель" value={boat.model} /> : null}
                            <SpecRow label="Год выпуска" value={boat.year || '—'} />
                            <SpecRow label="Вместимость" value={`${boat.capacity || '—'} гостей`} />
                            <SpecRow label="Длина" value={boat.length_m ? `${boat.length_m} м` : '—'} />
                            <SpecRow label="Тип судна" value={boat.type_name || '—'} />
                        </View>
                    )}
                    <View style={styles.divider} />

                    {/* ============ BOOKING OPTIONS ============ */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Варианты бронирования</Text>
                        <View style={styles.bookingCard}>
                            <Text style={styles.bookingCardTitle}>
                                {boat.captain_included ? 'С капитаном' : 'Аренда'}
                            </Text>
                            <View style={styles.bookingDivider} />
                            {displayTiers.map((tier, i) => {
                                const isFirst = i === 0;
                                const sel = selectedDuration === tier.durationMin;
                                return (
                                    <TouchableOpacity
                                        key={tier.durationMin}
                                        style={[
                                            styles.pricingRow,
                                            sel && styles.pricingRowActive,
                                        ]}
                                        onPress={() => setSelectedDuration(tier.durationMin)}
                                        activeOpacity={0.7}
                                    >
                                        <Text
                                            style={[
                                                styles.pricingHours,
                                                sel && styles.pricingTextActive,
                                            ]}
                                        >
                                            {formatDuration(tier.durationMin)}
                                        </Text>
                                        <View style={styles.pricingPriceWrap}>
                                            {tier.priceWeekend != null ? (
                                                <>
                                                    <Text
                                                        style={[
                                                            styles.pricingPriceBudni,
                                                            isFirst && styles.pricingPriceBudniBase,
                                                            sel && styles.pricingPriceBudniActive,
                                                        ]}
                                                    >
                                                        {tier.price.toLocaleString('ru-RU')} ₽ будни
                                                    </Text>
                                                    <Text style={styles.pricingPriceWeekend}>
                                                        {tier.priceWeekend.toLocaleString('ru-RU')} ₽ вых.
                                                    </Text>
                                                </>
                                            ) : (
                                                <Text
                                                    style={[
                                                        isFirst ? styles.pricingPriceBase : styles.pricingPrice,
                                                        sel && styles.pricingTextActive,
                                                    ]}
                                                >
                                                    {tier.price.toLocaleString('ru-RU')} ₽
                                                </Text>
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    <View style={styles.divider} />

                    {/* ============ REVIEWS ============ */}
                    <View style={styles.section}>
                        <View style={styles.reviewsHeaderRow}>
                            <Text style={styles.sectionTitle}>Отзывы</Text>
                            <View style={styles.reviewsRatingSmall}>
                                <Star size={16} color={theme.colors.star} fill={theme.colors.star} />
                                <Text style={styles.reviewsRatingText}> {rating}</Text>
                                <Text style={styles.reviewsRatingCount}> ({reviewsCount} оценок)</Text>
                            </View>
                        </View>
                        {reviews.length > 0 ? (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                {reviews.slice(0, 5).map((r, i) => (
                                    <View key={r.id || i} style={styles.reviewCard}>
                                        <View style={styles.reviewCardHeader}>
                                            <View style={styles.reviewAvatar}>
                                                <Text style={styles.reviewAvatarText}>
                                                    {(r.user_name || 'Г').charAt(0)}
                                                </Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.reviewAuthor}>{r.user_name || 'Гость'}</Text>
                                                <Text style={styles.reviewDate}>
                                                    {r.created_at
                                                        ? new Date(r.created_at).toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' })
                                                        : ''}
                                                </Text>
                                            </View>
                                            <Text style={styles.reviewCounter}>{i + 1}/{reviews.length}</Text>
                                        </View>
                                        <View style={styles.reviewStarsRow}>
                                            {[1, 2, 3, 4, 5].map((n) => (
                                                <Star
                                                    key={n}
                                                    size={14}
                                                    color={n <= (r.rating ?? 5) ? theme.colors.star : '#D1D5DB'}
                                                    fill={n <= (r.rating ?? 5) ? theme.colors.star : 'transparent'}
                                                />
                                            ))}
                                        </View>
                                        <Text style={styles.reviewText} numberOfLines={3}>
                                            {r.text || ''}
                                        </Text>
                                    </View>
                                ))}
                            </ScrollView>
                        ) : (
                            <Text style={styles.noReviews}>Пока нет отзывов</Text>
                        )}
                    </View>

                    <View style={styles.divider} />

                    {/* ============ BOAT LOCATION ============ */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Расположение</Text>
                        {boat.lat != null && boat.lng != null ? (
                            <Image
                                source={{
                                    uri: `https://static-maps.yandex.ru/1.x/?ll=${boat.lng},${boat.lat}&size=${Math.round(width)},180&z=15&l=map&pt=${boat.lng},${boat.lat}`,
                                }}
                                style={styles.staticMap}
                                resizeMode="cover"
                            />
                        ) : (
                            <View style={styles.locationPlaceholder}>
                                <MapPin size={32} color={NAVY} />
                                <Text style={styles.locationCity}>—</Text>
                            </View>
                        )}
                        <View style={styles.locationAddressBlock}>
                            <MapPin size={18} color={NAVY} />
                            <Text style={styles.locationCity}>
                                {[boat.location_country, boat.location_city, boat.location_address].filter(Boolean).join(', ') || '—'}
                            </Text>
                        </View>
                        {boat.location_yacht_club ? (
                            <Text style={styles.locationHint}>Яхт-клуб: {boat.location_yacht_club}</Text>
                        ) : null}
                    </View>

                    <View style={styles.divider} />

                    {/* ============ OWNER ============ */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Владелец</Text>
                        <View style={styles.crewCard}>
                            <View style={styles.crewTop}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.crewName}>
                                        {boat.owner_name || '—'}
                                    </Text>
                                    <View style={styles.crewBadgeRow}>
                                        {rating >= 4.8 && (
                                            <View style={styles.topOwnerBadge}>
                                                <Text style={styles.topOwnerIcon}>🏆</Text>
                                                <Text style={styles.topOwnerText}>TOP OWNER</Text>
                                            </View>
                                        )}
                                        <Star size={14} color={theme.colors.star} fill={theme.colors.star} />
                                        <Text style={styles.crewRating}>{rating} ({reviewsCount} оценок)</Text>
                                    </View>
                                </View>
                                <View style={styles.crewAvatar}>
                                    <User size={28} color={theme.colors.gray400} />
                                </View>
                            </View>
                            <TouchableOpacity
                                style={styles.messageBtn}
                                onPress={() => navigation.navigate('ChatDetail', { chatId: `boat-${boatId}`, boatId })}
                            >
                                <Text style={styles.messageBtnText}>НАПИСАТЬ ВЛАДЕЛЬЦУ</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    {/* ============ THINGS TO KNOW (rules + cancellation) ============ */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Важно знать</Text>
                        {boat.rules ? (
                            <>
                                <Text style={styles.subSectionTitle}>Правила поведения на катере</Text>
                                <Text style={styles.bodyText}>{boat.rules}</Text>
                            </>
                        ) : null}
                        {hasCancellationPolicy ? (
                            <View style={{ marginTop: boat.rules ? 16 : 0 }}>
                                <Text style={styles.subSectionTitle}>Условия отмены бронирования</Text>
                                <Text style={styles.bodyText}>{boat.cancellation_policy}</Text>
                            </View>
                        ) : null}
                        {!boat.rules && !hasCancellationPolicy ? (
                            <Text style={styles.bodyText}>Информация не указана.</Text>
                        ) : null}
                    </View>

                    <View style={styles.divider} />

                    {/* ============ SIMILAR BOATS ============ */}
                    {similarBoats.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Похожие катера</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                {similarBoats.map((sb) => (
                                    <TouchableOpacity
                                        key={sb.id}
                                        style={styles.similarCard}
                                        onPress={() => navigation.push('BoatDetail', { boatId: sb.id })}
                                        activeOpacity={0.9}
                                    >
                                        <View style={styles.similarImageWrap}>
                                            <Image
                                                source={{ uri: resolvePhotoUri(sb.photos?.[0]) }}
                                                style={styles.similarImage}
                                            />
                                            <TouchableOpacity
                                                style={styles.similarHeart}
                                                onPress={(e) => { e.stopPropagation(); toggleFavorite(sb); }}
                                            >
                                                <Heart
                                                    size={18}
                                                    color={isFavorite(sb.id) ? '#ef4444' : '#fff'}
                                                    fill={isFavorite(sb.id) ? '#ef4444' : 'transparent'}
                                                />
                                            </TouchableOpacity>
                                            <View style={styles.similarPriceBadge}>
                                                <Text style={styles.similarPriceText}>
                                                    {sb.price_weekend != null && String(sb.price_weekend).trim() !== ''
                                                        ? `${sb.price_per_hour} ₽ будни · ${sb.price_weekend} ₽ вых.`
                                                        : `от ${sb.price_per_hour} ₽`}
                                                </Text>
                                            </View>
                                            {(sb.photos?.length || 0) > 0 && (
                                                <View style={styles.similarPhotoCount}>
                                                    <Text style={styles.similarPhotoCountText}>
                                                        1/{sb.photos.length}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                        <View style={styles.similarInfo}>
                                            {sb.rating >= 4.8 && (
                                                <View style={styles.topOwnerBadgeSmall}>
                                                    <Text style={{ fontSize: 10 }}>🏆</Text>
                                                    <Text style={styles.topOwnerTextSmall}>TOP OWNER</Text>
                                                </View>
                                            )}
                                            <View style={styles.similarTitleRow}>
                                                <Text style={styles.similarCity}>
                                                    {(sb.location_city || '').toUpperCase()}
                                                </Text>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                                                    <Star size={12} color={theme.colors.star} fill={theme.colors.star} />
                                                    <Text style={styles.similarRating}>
                                                        {sb.rating} ({sb.bookings_count ?? 0})
                                                    </Text>
                                                </View>
                                            </View>
                                            <Text style={styles.similarTitle} numberOfLines={1}>
                                                {sb.title}
                                            </Text>
                                            <Text style={styles.similarMeta}>
                                                До {sb.capacity ?? '—'} гостей
                                                {sb.captain_included ? ' • С капитаном' : ''}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* ============ STICKY BOTTOM BAR ============ */}
            <View style={[styles.bottomBar, { paddingBottom: 12 + insets.bottom }]}>
                <View>
                    {(() => {
                        const activeDuration = selectedDuration || displayTiers[0]?.durationMin || 60;
                        const selectedTier = displayTiers.find((t) => t.durationMin === activeDuration);
                        const priceBudni = selectedTier ? selectedTier.price : getPrice(activeDuration);
                        const minPrice = selectedTier?.priceWeekend != null
                            ? Math.min(priceBudni, selectedTier.priceWeekend)
                            : priceBudni;
                        return (
                            <>
                                <Text style={styles.bottomPrice}>от {minPrice.toLocaleString('ru-RU')} ₽</Text>
                                <Text style={styles.bottomHours}>{formatDuration(activeDuration)}</Text>
                            </>
                        );
                    })()}
                </View>
                <TouchableOpacity style={styles.bookBtn} onPress={handleBook} activeOpacity={0.9}>
                    <Text style={styles.bookBtnText}>ЗАБРОНИРОВАТЬ</Text>
                </TouchableOpacity>
            </View>

            {/* ============ BOOKING MODAL ============ */}
            <Modal visible={bookingVisible} animationType="slide" transparent onRequestClose={() => setBookingVisible(false)}>
                <View style={bk.overlay}>
                    <View style={[bk.sheet, { paddingBottom: insets.bottom + 16 }]}>
                        {/* Header */}
                        <View style={bk.header}>
                            <TouchableOpacity onPress={() => setBookingVisible(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                                <ChevronLeft size={24} color={NAVY} />
                            </TouchableOpacity>
                            <Text style={bk.headerTitle}>Запрос на бронирование</Text>
                            <View style={{ width: 24 }} />
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={bk.scrollContent}>
                            <Text style={bk.sectionTitle}>Детали бронирования</Text>

                            {/* Duration chips */}
                            <View style={bk.chipsRow}>
                                {displayTiers.map((tier) => (
                                    <TouchableOpacity
                                        key={tier.durationMin}
                                        style={[bk.chip, bookHours === tier.durationMin && bk.chipActive]}
                                        onPress={() => setBookHours(tier.durationMin)}
                                    >
                                        <Text style={[bk.chipNum, bookHours === tier.durationMin && bk.chipNumActive]}>
                                            {formatDuration(tier.durationMin)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Date field */}
                            <TouchableOpacity
                                style={bk.inputField}
                                onPress={() => {
                                    setCalendarMonth(new Date(bookDate.getFullYear(), bookDate.getMonth(), 1));
                                    setBookShowDatePicker(true);
                                }}
                                activeOpacity={0.7}
                            >
                                <View>
                                    <Text style={bk.inputLabel}>Дата</Text>
                                    <Text style={bk.inputValue}>{formatBookDate(bookDate)}</Text>
                                </View>
                                <TouchableOpacity onPress={() => setBookDate(new Date())} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                    <X size={18} color={theme.colors.gray400} />
                                </TouchableOpacity>
                            </TouchableOpacity>

                            {/* Календарь: рабочие дни — зелёные, нерабочие/занятые — красные */}
                            {bookShowDatePicker && (() => {
                                let wd = boat?.schedule_work_days;
                                if (typeof wd === 'string') try { wd = JSON.parse(wd); } catch { wd = null; }
                                const workDays = wd && typeof wd === 'object'
                                    ? { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: true, ...wd }
                                    : { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: true };
                                const isWorkingDay = (d) => workDays[getWeekdayKey(d)] === true;
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                const grid = getCalendarGrid(calendarMonth);
                                const monthTitle = calendarMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
                                const prevMonth = () => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));
                                const nextMonth = () => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));
                                return (
                                    <Modal visible transparent animationType="fade">
                                        <View style={cal.overlay}>
                                            <View style={cal.sheet}>
                                                <View style={cal.header}>
                                                    <TouchableOpacity onPress={() => setBookShowDatePicker(false)} hitSlop={12}>
                                                        <X size={22} color={NAVY} />
                                                    </TouchableOpacity>
                                                    <Text style={cal.headerTitle}>Выберите дату</Text>
                                                    <View style={{ width: 22 }} />
                                                </View>
                                                <View style={cal.monthRow}>
                                                    <TouchableOpacity onPress={prevMonth} style={cal.arrowBtn}>
                                                        <ChevronLeft size={24} color={NAVY} />
                                                    </TouchableOpacity>
                                                    <Text style={cal.monthTitle}>{monthTitle}</Text>
                                                    <TouchableOpacity onPress={nextMonth} style={cal.arrowBtn}>
                                                        <ChevronRight size={24} color={NAVY} />
                                                    </TouchableOpacity>
                                                </View>
                                                <View style={cal.weekdayRow}>
                                                    {WEEKDAY_LABELS.map((label, i) => (
                                                        <Text key={label} style={[cal.weekdayText, (i === 5 || i === 6) && cal.weekdayWeekend]}>
                                                            {label}
                                                        </Text>
                                                    ))}
                                                </View>
                                                <View style={cal.grid}>
                                                    {grid.map(({ date, isCurrentMonth }, idx) => {
                                                        const key = toDateKey(date);
                                                        const isPast = date < today;
                                                        const working = isWorkingDay(date);
                                                        const fullyBooked = fullyBookedDates.has(key);
                                                        const unavailable = !working || fullyBooked || isPast;
                                                        const selectable = isCurrentMonth && !unavailable;
                                                        const selected = sameDay(date, bookDate);
                                                        return (
                                                            <TouchableOpacity
                                                                key={idx}
                                                                style={[
                                                                    cal.dayCell,
                                                                    !isCurrentMonth && cal.dayOtherMonth,
                                                                    selectable && cal.dayAvailable,
                                                                    unavailable && isCurrentMonth && cal.dayUnavailable,
                                                                    selected && cal.daySelected,
                                                                ]}
                                                                onPress={() => {
                                                                    if (selectable) {
                                                                        setBookDate(date);
                                                                        setBookShowDatePicker(false);
                                                                    }
                                                                }}
                                                                disabled={!selectable}
                                                                activeOpacity={selectable ? 0.7 : 1}
                                                            >
                                                                <Text style={[
                                                                    cal.dayNum,
                                                                    !isCurrentMonth && cal.dayNumOther,
                                                                    selectable && cal.dayNumAvailable,
                                                                    unavailable && isCurrentMonth && cal.dayNumUnavailable,
                                                                    selected && cal.dayNumSelected,
                                                                ]}>
                                                                    {date.getDate()}
                                                                </Text>
                                                            </TouchableOpacity>
                                                        );
                                                    })}
                                                </View>
                                            </View>
                                        </View>
                                    </Modal>
                                );
                            })()}

                            {/* Start time */}
                            <TouchableOpacity
                                style={bk.inputField}
                                onPress={() => { setPendingTime(bookTime); setBookShowTimePicker(true); }}
                                activeOpacity={0.7}
                            >
                                {bookTime ? (
                                    <View>
                                        <Text style={bk.inputLabel}>Время начала</Text>
                                        <Text style={bk.inputValue}>{formatBookTime(bookTime)}</Text>
                                    </View>
                                ) : (
                                    <Text style={bk.inputPlaceholder}>Время начала</Text>
                                )}
                                <Clock size={18} color={theme.colors.gray400} />
                            </TouchableOpacity>

                            {/* Passengers stepper */}
                            <View style={bk.passengerRow}>
                                <TouchableOpacity
                                    style={[bk.stepBtn, bookPassengers <= 1 && bk.stepBtnDisabled]}
                                    onPress={() => setBookPassengers(Math.max(1, bookPassengers - 1))}
                                    disabled={bookPassengers <= 1}
                                >
                                    <Minus size={18} color={bookPassengers <= 1 ? '#D1D5DB' : NAVY} />
                                </TouchableOpacity>
                                <Text style={bk.passengerText}>
                                    {bookPassengers} {bookPassengers === 1 ? 'гость' : bookPassengers < 5 ? 'гостя' : 'гостей'}
                                </Text>
                                <TouchableOpacity
                                    style={bk.stepBtn}
                                    onPress={() => setBookPassengers(Math.min(Number(boat.capacity) || 20, bookPassengers + 1))}
                                    disabled={bookPassengers >= (Number(boat.capacity) || 20)}
                                >
                                    <Plus size={18} color={bookPassengers >= (Number(boat.capacity) || 20) ? '#D1D5DB' : NAVY} />
                                </TouchableOpacity>
                            </View>
                        </ScrollView>

                        {/* Bottom bar */}
                        <View style={bk.footer}>
                            <View>
                                <Text style={bk.footerPrice}>{bookPrice.toLocaleString('ru-RU')} ₽</Text>
                            </View>
                            <TouchableOpacity style={bk.submitBtn} onPress={submitBooking} activeOpacity={0.9}>
                                <Text style={bk.submitBtnText}>ЗАБРОНИРОВАТЬ</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Успешная отправка запроса на бронирование */}
            <Modal visible={bookingSuccessVisible} transparent animationType="fade" onRequestClose={() => setBookingSuccessVisible(false)}>
                <View style={successModal.overlay}>
                    <View style={successModal.card}>
                        <View style={successModal.iconWrap}>
                            <CheckCircle2 size={48} color={theme.colors.success} strokeWidth={2} />
                        </View>
                        <Text style={successModal.title}>Запрос отправлен</Text>
                        <Text style={successModal.message}>Владелец получит ваш запрос на бронирование.</Text>
                        <TouchableOpacity style={successModal.btn} onPress={() => setBookingSuccessVisible(false)} activeOpacity={0.85}>
                            <Text style={successModal.btnText}>Понятно</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ============ TIME PICKER MODAL ============ */}
            <Modal visible={bookShowTimePicker} animationType="slide" transparent onRequestClose={() => setBookShowTimePicker(false)}>
                <View style={tp.overlay}>
                    <View style={[tp.sheet, { paddingBottom: insets.bottom + 16 }]}>
                        <View style={tp.header}>
                            <TouchableOpacity onPress={() => setBookShowTimePicker(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                                <X size={22} color={NAVY} />
                            </TouchableOpacity>
                            <Text style={tp.headerTitle}>Время начала</Text>
                            <View style={{ width: 22 }} />
                        </View>
                        <View style={tp.hint}>
                            <Text style={tp.hintText}>Показано текущее доступное время.</Text>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={tp.grid}>
                            {TIME_SLOTS.map((slot) => {
                                const isBusy = isSlotInBusyInterval(slot);
                                const canStart = isStartTimeValid(slot, bookHours);
                                const isSelected = pendingTime === slot;
                                const disabled = !canStart;
                                return (
                                    <TouchableOpacity
                                        key={slot}
                                        style={[
                                            tp.slot,
                                            isSelected && tp.slotSelected,
                                            isBusy && tp.slotBusy,
                                            canStart && !isSelected && tp.slotAvailable,
                                        ]}
                                        onPress={() => { if (canStart) setPendingTime(slot); }}
                                        disabled={disabled}
                                        activeOpacity={disabled ? 1 : 0.7}
                                    >
                                        <Text
                                            style={[
                                                tp.slotText,
                                                isSelected && tp.slotTextSelected,
                                                isBusy && tp.slotTextBusy,
                                                canStart && !isSelected && tp.slotTextAvailable,
                                            ]}
                                        >
                                            {slot}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                        <View style={tp.footer}>
                            <TouchableOpacity
                                style={[tp.applyBtn, !pendingTime && tp.applyBtnDisabled]}
                                onPress={() => {
                                    setBookTime(pendingTime);
                                    setBookShowTimePicker(false);
                                }}
                                disabled={!pendingTime}
                                activeOpacity={0.9}
                            >
                                <Text style={tp.applyBtnText}>ПРИМЕНИТЬ</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ============ REVIEWS MODAL ============ */}
            <Modal visible={reviewsVisible} animationType="slide" transparent onRequestClose={() => setReviewsVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Отзывы</Text>
                            <View style={styles.modalHeaderActions}>
                                {!writeReviewVisible && (
                                    <TouchableOpacity onPress={openWriteReview} style={styles.modalWriteReviewLink} activeOpacity={0.7}>
                                        <Text style={styles.modalWriteReviewLinkText}>Написать отзыв</Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity onPress={() => setReviewsVisible(false)}>
                                    <X size={24} color={NAVY} />
                                </TouchableOpacity>
                            </View>
                        </View>
                        <View style={styles.modalRating}>
                            <Star size={24} color={NAVY} fill={NAVY} />
                            <Text style={styles.modalRatingText}>{rating}</Text>
                            <Text style={styles.modalRatingCount}> · {reviewsCount} отзывов</Text>
                        </View>

                        {writeReviewVisible && (
                            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.writeReviewForm}>
                                <Text style={styles.writeReviewLabel}>Оценка</Text>
                                <View style={styles.writeReviewStars}>
                                    {[1, 2, 3, 4, 5].map((n) => (
                                        <TouchableOpacity
                                            key={n}
                                            onPress={() => setReviewRating(n)}
                                            style={styles.writeReviewStarBtn}
                                            activeOpacity={0.7}
                                        >
                                            <Star
                                                size={28}
                                                color={n <= reviewRating ? theme.colors.star : '#D1D5DB'}
                                                fill={n <= reviewRating ? theme.colors.star : 'transparent'}
                                            />
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <Text style={styles.writeReviewLabel}>Текст отзыва</Text>
                                <TextInput
                                    style={styles.writeReviewInput}
                                    placeholder="Расскажите о вашем опыте..."
                                    placeholderTextColor={theme.colors.textMuted}
                                    value={reviewText}
                                    onChangeText={setReviewText}
                                    multiline
                                    numberOfLines={4}
                                    textAlignVertical="top"
                                    maxLength={1000}
                                />
                                <View style={styles.writeReviewActions}>
                                    <TouchableOpacity
                                        style={styles.writeReviewCancelBtn}
                                        onPress={() => { setWriteReviewVisible(false); setReviewText(''); }}
                                        disabled={reviewSubmitting}
                                    >
                                        <Text style={styles.writeReviewCancelText}>Отмена</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.writeReviewSubmitBtn, reviewSubmitting && styles.writeReviewSubmitDisabled]}
                                        onPress={submitReview}
                                        disabled={reviewSubmitting}
                                        activeOpacity={0.8}
                                    >
                                        {reviewSubmitting ? (
                                            <ActivityIndicator size="small" color="#fff" />
                                        ) : (
                                            <Text style={styles.writeReviewSubmitText}>Отправить</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </KeyboardAvoidingView>
                        )}

                        {!writeReviewVisible && (reviewsLoading ? (
                            <ActivityIndicator style={{ paddingVertical: 48 }} color={NAVY} />
                        ) : (
                            <FlatList
                                data={reviews}
                                keyExtractor={(item) => String(item.id || Math.random())}
                                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
                                ListEmptyComponent={
                                    <Text style={styles.noReviews}>Пока нет отзывов</Text>
                                }
                                renderItem={({ item }) => (
                                    <View style={styles.modalReviewCard}>
                                        <View style={styles.reviewCardHeader}>
                                            <View style={styles.reviewAvatar}>
                                                <Text style={styles.reviewAvatarText}>
                                                    {(item.user_name || 'Г').charAt(0)}
                                                </Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.reviewAuthor}>{item.user_name || 'Гость'}</Text>
                                                <View style={styles.reviewStarsRow}>
                                                    {[1, 2, 3, 4, 5].map((n) => (
                                                        <Star
                                                            key={n}
                                                            size={14}
                                                            color={n <= (item.rating ?? 5) ? theme.colors.star : '#D1D5DB'}
                                                            fill={n <= (item.rating ?? 5) ? theme.colors.star : 'transparent'}
                                                        />
                                                    ))}
                                                </View>
                                            </View>
                                        </View>
                                        <Text style={styles.reviewText}>{item.text || ''}</Text>
                                    </View>
                                )}
                            />
                        ))}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

function SpecRow({ label, value }) {
    return (
        <View style={styles.specRow}>
            <Text style={styles.specLabel}>{label}</Text>
            <Text style={styles.specValue}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
    container: { flex: 1, backgroundColor: '#fff' },

    /* Gallery */
    gallery: { position: 'relative' },
    heroImageWrap: { width, height: IMAGE_HEIGHT },
    heroImage: { width, height: IMAGE_HEIGHT },
    topNav: {
        position: 'absolute', top: 0, left: 0, right: 0,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 16,
    },
    navBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.92)',
        justifyContent: 'center', alignItems: 'center',
    },
    navRight: { flexDirection: 'row', gap: 10 },
    photoCounter: {
        position: 'absolute', bottom: 14, left: 14,
        backgroundColor: 'rgba(0,0,0,0.55)', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8,
    },
    photoCounterText: { fontSize: 13, fontFamily: theme.fonts.semiBold, color: '#fff' },
    dots: {
        position: 'absolute', bottom: 16, left: 0, right: 0,
        flexDirection: 'row', justifyContent: 'center', gap: 6,
    },
    dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)' },
    dotActive: { backgroundColor: '#fff', width: 8 },
    videoBadge: {
        position: 'absolute', bottom: 14, right: 14,
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: 'rgba(0,0,0,0.55)', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8,
    },
    videoBadgeText: { fontSize: 12, fontFamily: theme.fonts.semiBold, color: '#fff' },

    /* Content */
    content: { paddingHorizontal: 20, paddingTop: 20 },
    typeLabel: { fontSize: 13, fontFamily: theme.fonts.medium, color: theme.colors.textMuted, marginBottom: 4 },
    cityLabel: { fontSize: 12, fontFamily: theme.fonts.regular, color: theme.colors.textMuted, letterSpacing: 0.5, marginBottom: 4 },
    title: { fontSize: 22, fontFamily: theme.fonts.bold, color: NAVY, lineHeight: 28, marginBottom: 8 },
    ratingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    ratingText: { fontSize: 15, fontFamily: theme.fonts.semiBold, color: NAVY },
    ratingCount: { fontSize: 14, fontFamily: theme.fonts.regular, color: theme.colors.textMuted },

    /* Info grid */
    infoGrid: {
        flexDirection: 'row', flexWrap: 'wrap',
        borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14,
        marginBottom: 24, overflow: 'hidden',
    },
    infoCell: {
        width: '50%', paddingVertical: 18, alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    infoCellBorderLeft: { borderLeftWidth: 1, borderLeftColor: '#E5E7EB' },
    infoCellBorderTop: { borderTopWidth: 1, borderTopColor: '#E5E7EB' },
    infoBadge: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 6 },
    infoBadgeText: { fontSize: 12, fontFamily: theme.fonts.bold, letterSpacing: 0.5 },
    infoCellLabel: { fontSize: 13, fontFamily: theme.fonts.regular, color: theme.colors.textMuted, textAlign: 'center', lineHeight: 18 },

    /* Sections */
    section: { marginBottom: 8 },
    sectionTitle: { fontSize: 20, fontFamily: theme.fonts.bold, color: NAVY, marginBottom: 12 },
    subSectionTitle: { fontSize: 15, fontFamily: theme.fonts.semiBold, color: NAVY, marginBottom: 10 },
    bodyText: { fontSize: 15, fontFamily: theme.fonts.regular, color: theme.colors.gray700, lineHeight: 22 },
    viewAll: { fontSize: 15, fontFamily: theme.fonts.medium, color: NAVY, marginTop: 10 },
    divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 20 },

    /* Features list */
    featureRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    },
    featureText: { fontSize: 15, fontFamily: theme.fonts.regular, color: theme.colors.gray700 },
    amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
    amenityItem: { width: '30%', alignItems: 'center', gap: 6 },
    amenityIconWrap: {
        width: 44, height: 44, borderRadius: 12,
        backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
    },
    amenityItemLabel: { fontSize: 12, fontFamily: theme.fonts.regular, color: theme.colors.gray700, textAlign: 'center' },

    /* Collapsible */
    collapsibleHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 4, marginBottom: 8,
    },

    /* Specs */
    specsContent: { marginBottom: 8 },
    specRow: {
        flexDirection: 'row', justifyContent: 'space-between',
        paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    },
    specLabel: { fontSize: 14, fontFamily: theme.fonts.regular, color: theme.colors.textMuted },
    specValue: { fontSize: 14, fontFamily: theme.fonts.medium, color: NAVY },

    /* Booking options */
    bookingCard: {
        borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14, overflow: 'hidden',
    },
    bookingCardTitle: {
        fontSize: 16, fontFamily: theme.fonts.semiBold, color: NAVY, textAlign: 'center', paddingVertical: 16,
    },
    bookingDivider: { height: 1, backgroundColor: '#E5E7EB' },
    pricingRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 16, paddingHorizontal: 20,
        borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    },
    pricingRowActive: { backgroundColor: 'rgba(27,54,93,0.04)' },
    pricingHours: { fontSize: 15, fontFamily: theme.fonts.regular, color: theme.colors.gray700 },
    pricingPriceWrap: { alignItems: 'flex-end' },
    pricingPriceBudni: { fontSize: 16, fontFamily: theme.fonts.semiBold, color: '#2563EB' },
    pricingPriceBudniBase: { fontFamily: theme.fonts.bold, color: NAVY },
    pricingPriceBudniActive: { fontFamily: theme.fonts.bold, color: NAVY },
    pricingPriceBase: { fontSize: 15, fontFamily: theme.fonts.semiBold, color: NAVY },
    pricingPrice: { fontSize: 15, fontFamily: theme.fonts.semiBold, color: '#2563EB' },
    pricingPriceWeekend: { fontSize: 13, fontFamily: theme.fonts.regular, color: theme.colors.textMuted, marginTop: 4 },
    pricingTextActive: { fontFamily: theme.fonts.bold, color: NAVY },

    /* Reviews */
    reviewsHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    reviewsRatingSmall: { flexDirection: 'row', alignItems: 'center' },
    reviewsRatingText: { fontSize: 15, fontFamily: theme.fonts.semiBold, color: NAVY },
    reviewsRatingCount: { fontSize: 13, fontFamily: theme.fonts.regular, color: theme.colors.textMuted },
    reviewCard: {
        width: 280, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB',
        borderRadius: 14, padding: 16, marginRight: 12,
    },
    reviewCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    reviewAvatar: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: '#E0E7FF', justifyContent: 'center', alignItems: 'center',
    },
    reviewAvatarText: { fontSize: 18, fontFamily: theme.fonts.bold, color: NAVY },
    reviewAuthor: { fontSize: 14, fontFamily: theme.fonts.semiBold, color: NAVY },
    reviewDate: { fontSize: 12, fontFamily: theme.fonts.regular, color: theme.colors.textMuted },
    reviewCounter: { fontSize: 12, fontFamily: theme.fonts.regular, color: theme.colors.textMuted },
    reviewStarsRow: { flexDirection: 'row', gap: 2, marginBottom: 8 },
    reviewText: { fontSize: 14, fontFamily: theme.fonts.regular, color: theme.colors.gray700, lineHeight: 20 },
    noReviews: { fontSize: 15, fontFamily: theme.fonts.regular, color: theme.colors.textMuted, textAlign: 'center', paddingVertical: 24 },
    writeReviewBtn: {
        marginHorizontal: 24,
        marginBottom: 16,
        paddingVertical: 14,
        backgroundColor: NAVY,
        borderRadius: 12,
        alignItems: 'center',
    },
    writeReviewBtnText: { fontSize: 16, fontFamily: theme.fonts.semiBold, color: '#fff' },
    writeReviewForm: { paddingHorizontal: 24, marginBottom: 24 },
    writeReviewLabel: { fontSize: 14, fontFamily: theme.fonts.semiBold, color: NAVY, marginBottom: 8 },
    writeReviewStars: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    writeReviewStarBtn: { padding: 4 },
    writeReviewInput: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        fontFamily: theme.fonts.regular,
        color: theme.colors.gray700,
        minHeight: 100,
        marginBottom: 16,
    },
    writeReviewActions: { flexDirection: 'row', gap: 12 },
    writeReviewCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center' },
    writeReviewCancelText: { fontSize: 16, fontFamily: theme.fonts.semiBold, color: theme.colors.gray700 },
    writeReviewSubmitBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: NAVY, alignItems: 'center' },
    writeReviewSubmitText: { fontSize: 16, fontFamily: theme.fonts.semiBold, color: '#fff' },
    writeReviewSubmitDisabled: { opacity: 0.6 },

    /* Location */
    staticMap: { width: '100%', height: 180, borderRadius: 14, marginBottom: 12 },
    locationPlaceholder: {
        height: 180, backgroundColor: '#F3F4F6', borderRadius: 14,
        justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 12,
    },
    locationAddressBlock: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    locationCity: { fontSize: 16, fontFamily: theme.fonts.semiBold, color: NAVY, flex: 1 },
    locationHint: { fontSize: 13, fontFamily: theme.fonts.regular, color: theme.colors.textMuted },

    /* Crew / owner */
    crewCard: {
        borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14, padding: 20,
    },
    crewTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    crewName: { fontSize: 16, fontFamily: theme.fonts.bold, color: NAVY, marginBottom: 6 },
    crewBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    topOwnerBadge: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7',
        paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, gap: 4,
    },
    topOwnerIcon: { fontSize: 12 },
    topOwnerText: { fontSize: 11, fontFamily: theme.fonts.bold, color: '#92400E', letterSpacing: 0.5 },
    crewRating: { fontSize: 13, fontFamily: theme.fonts.regular, color: theme.colors.textMuted },
    crewAvatar: {
        width: 52, height: 52, borderRadius: 26, backgroundColor: '#F3F4F6',
        justifyContent: 'center', alignItems: 'center',
    },
    messageBtn: {
        borderWidth: 1.5, borderColor: NAVY, borderRadius: 12,
        paddingVertical: 14, alignItems: 'center',
    },
    messageBtnText: { fontSize: 14, fontFamily: theme.fonts.bold, color: NAVY, letterSpacing: 0.5 },

    /* Similar boats */
    similarCard: {
        width: 300, backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden',
        marginRight: 14, borderWidth: 1, borderColor: '#F3F4F6',
    },
    similarImageWrap: { width: '100%', height: 180, position: 'relative' },
    similarImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    similarHeart: {
        position: 'absolute', top: 10, right: 10,
        width: 34, height: 34, borderRadius: 17,
        backgroundColor: 'rgba(0,0,0,0.2)', alignItems: 'center', justifyContent: 'center',
    },
    similarPriceBadge: {
        position: 'absolute', bottom: 10, right: 10,
        backgroundColor: 'rgba(0,0,0,0.7)', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8,
    },
    similarPriceText: { fontSize: 13, fontFamily: theme.fonts.bold, color: '#fff' },
    similarPhotoCount: {
        position: 'absolute', bottom: 10, left: 10,
        backgroundColor: 'rgba(0,0,0,0.5)', paddingVertical: 3, paddingHorizontal: 7, borderRadius: 6,
    },
    similarPhotoCountText: { fontSize: 11, fontFamily: theme.fonts.semiBold, color: '#fff' },
    similarInfo: { padding: 14 },
    topOwnerBadgeSmall: {
        flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
        backgroundColor: '#FEF3C7', paddingVertical: 2, paddingHorizontal: 6, borderRadius: 4, gap: 3, marginBottom: 4,
    },
    topOwnerTextSmall: { fontSize: 10, fontFamily: theme.fonts.bold, color: '#92400E' },
    similarTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    similarCity: { fontSize: 11, fontFamily: theme.fonts.regular, color: theme.colors.textMuted, letterSpacing: 0.5 },
    similarRating: { fontSize: 12, fontFamily: theme.fonts.regular, color: theme.colors.textMuted },
    similarTitle: { fontSize: 15, fontFamily: theme.fonts.bold, color: NAVY, marginBottom: 4 },
    similarMeta: { fontSize: 13, fontFamily: theme.fonts.regular, color: theme.colors.textMuted },

    /* Bottom bar */
    bottomBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E7EB',
        paddingHorizontal: 20, paddingTop: 14,
    },
    bottomPriceLabel: { fontSize: 12, fontFamily: theme.fonts.regular, color: theme.colors.textMuted, marginBottom: 2 },
    bottomPrice: { fontSize: 22, fontFamily: theme.fonts.bold, color: NAVY },
    bottomPriceWeekend: { fontSize: 15, fontFamily: theme.fonts.regular, color: theme.colors.textMuted, marginTop: 4 },
    bottomHours: { fontSize: 13, fontFamily: theme.fonts.regular, color: theme.colors.textMuted, marginTop: 6 },
    bookBtn: {
        backgroundColor: NAVY, paddingVertical: 16, paddingHorizontal: 28, borderRadius: 12,
    },
    bookBtnText: { fontSize: 14, fontFamily: theme.fonts.bold, color: '#fff', letterSpacing: 0.5 },

    /* Reviews modal */
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalSheet: {
        backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 24, paddingTop: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    },
    modalTitle: { fontSize: 20, fontFamily: theme.fonts.bold, color: NAVY },
    modalHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    modalWriteReviewLink: { paddingVertical: 8, paddingHorizontal: 4 },
    modalWriteReviewLinkText: { fontSize: 15, fontFamily: theme.fonts.semiBold, color: NAVY },
    modalRating: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 24, paddingVertical: 14,
    },
    modalRatingText: { fontSize: 22, fontFamily: theme.fonts.bold, color: NAVY, marginLeft: 8 },
    modalRatingCount: { fontSize: 14, fontFamily: theme.fonts.regular, color: theme.colors.textMuted },
    modalReviewCard: {
        backgroundColor: '#F9FAFB', borderRadius: 14, padding: 16, marginBottom: 12,
    },
});

const fsGalleryStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.96)',
        justifyContent: 'center',
    },
    closeBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 10,
        padding: 8,
    },
    slide: {
        width,
        height: height - 120,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullImage: {
        width,
        height: height - 120,
    },
    navBtn: {
        position: 'absolute',
        top: '50%',
        marginTop: -30,
        padding: 12,
        zIndex: 10,
    },
    navLeft: { left: 8 },
    navRight: { right: 8 },
    counter: {
        position: 'absolute',
        bottom: 24,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 10,
    },
    counterText: {
        fontSize: 16,
        fontFamily: theme.fonts.semiBold,
        color: '#fff',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
});

const bk = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '95%' },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
        borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    },
    headerTitle: { fontSize: 18, fontFamily: theme.fonts.bold, color: NAVY },
    scrollContent: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 },
    sectionTitle: { fontSize: 18, fontFamily: theme.fonts.bold, color: NAVY, marginBottom: 20 },

    inputField: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
        paddingVertical: 14, paddingHorizontal: 16, marginBottom: 14,
    },
    inputLabel: { fontSize: 12, fontFamily: theme.fonts.regular, color: theme.colors.textMuted, marginBottom: 2 },
    inputValue: { fontSize: 16, fontFamily: theme.fonts.semiBold, color: NAVY },
    inputPlaceholder: { fontSize: 16, fontFamily: theme.fonts.regular, color: theme.colors.gray400 },

    iosPickerWrap: { marginBottom: 14 },
    iosPickerDone: { fontSize: 16, fontFamily: theme.fonts.semiBold, color: NAVY, textAlign: 'right', paddingTop: 8 },

    chipsRow: { flexDirection: 'row', gap: 10, marginBottom: 20, marginTop: 4 },
    chip: {
        flex: 1, alignItems: 'center', paddingVertical: 14,
        borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12,
    },
    chipActive: { borderColor: NAVY, backgroundColor: 'rgba(27,54,93,0.06)' },
    chipNum: { fontSize: 18, fontFamily: theme.fonts.semiBold, color: theme.colors.gray400 },
    chipNumActive: { color: NAVY, fontFamily: theme.fonts.bold },
    chipLabel: { fontSize: 12, fontFamily: theme.fonts.regular, color: theme.colors.gray400, marginTop: 2 },
    chipLabelActive: { color: NAVY },

    passengerRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16,
    },
    stepBtn: {
        width: 52, height: 52, borderRadius: 12,
        borderWidth: 1.5, borderColor: '#E5E7EB',
        alignItems: 'center', justifyContent: 'center',
    },
    stepBtnDisabled: { borderColor: '#F3F4F6' },
    passengerText: { fontSize: 17, fontFamily: theme.fonts.semiBold, color: NAVY },

    footer: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 24, paddingTop: 14,
        borderTopWidth: 1, borderTopColor: '#F3F4F6',
    },
    footerPrice: { fontSize: 22, fontFamily: theme.fonts.bold, color: NAVY },
    submitBtn: { backgroundColor: NAVY, paddingVertical: 16, paddingHorizontal: 24, borderRadius: 12 },
    submitBtnText: { fontSize: 14, fontFamily: theme.fonts.bold, color: '#fff', letterSpacing: 0.5 },
});

const tp = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
    sheet: {
        backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
        paddingTop: 16, maxHeight: '80%',
    },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingBottom: 12,
    },
    headerTitle: { fontSize: 18, fontFamily: theme.fonts.bold, color: NAVY },
    hint: {
        backgroundColor: '#F0F4FA', marginHorizontal: 20, borderRadius: 10,
        paddingVertical: 10, paddingHorizontal: 16, marginBottom: 12,
    },
    hintText: { fontSize: 13, fontFamily: theme.fonts.regular, color: '#5B6A82', textAlign: 'center' },
    grid: {
        flexDirection: 'row', flexWrap: 'wrap',
        paddingHorizontal: 20, paddingBottom: 12, justifyContent: 'space-between',
    },
    slot: {
        width: '48%', paddingVertical: 14, borderRadius: 10,
        borderWidth: 1.2, borderColor: '#E0E4EA', marginBottom: 10,
        alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff',
    },
    slotSelected: { backgroundColor: '#E8EDF5', borderColor: NAVY },
    slotBusy: { backgroundColor: '#FFF0F0', borderColor: '#F5B5B5' },
    slotAvailable: { backgroundColor: '#ECFDF5', borderColor: '#6EE7B7' },
    slotText: { fontSize: 15, fontFamily: theme.fonts.medium, color: NAVY },
    slotTextSelected: { fontFamily: theme.fonts.bold, color: NAVY },
    slotTextBusy: { color: '#D94040', textDecorationLine: 'line-through' },
    slotTextAvailable: { color: '#047857', fontFamily: theme.fonts.semiBold },
    footer: { paddingHorizontal: 20, paddingTop: 8 },
    applyBtn: {
        backgroundColor: NAVY, borderRadius: 12, paddingVertical: 16,
        alignItems: 'center',
    },
    applyBtnDisabled: { opacity: 0.4 },
    applyBtnText: { fontSize: 15, fontFamily: theme.fonts.bold, color: '#fff', letterSpacing: 0.5 },
});

const cal = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    sheet: {
        width: '100%', maxWidth: 400,
        backgroundColor: '#fff', borderRadius: 20, paddingBottom: 24, paddingHorizontal: 20,
    },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
    },
    headerTitle: { fontSize: 18, fontFamily: theme.fonts.bold, color: NAVY },
    monthRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: 20,
    },
    arrowBtn: { padding: 8 },
    monthTitle: { fontSize: 20, fontFamily: theme.fonts.bold, color: NAVY, textTransform: 'capitalize' },
    weekdayRow: {
        flexDirection: 'row', marginBottom: 8,
    },
    weekdayText: {
        flex: 1, textAlign: 'center', fontSize: 13, fontFamily: theme.fonts.medium, color: theme.colors.gray500,
    },
    weekdayWeekend: { color: theme.colors.primary },
    grid: {
        flexDirection: 'row', flexWrap: 'wrap',
    },
    dayCell: {
        width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', marginVertical: 2,
    },
    dayOtherMonth: { opacity: 0.35 },
    dayAvailable: { backgroundColor: '#ECFDF5' },
    dayUnavailable: { backgroundColor: '#FEF2F2' },
    daySelected: { backgroundColor: NAVY, borderRadius: 999 },
    dayNum: { fontSize: 16, fontFamily: theme.fonts.medium, color: NAVY },
    dayNumOther: { color: theme.colors.gray400 },
    dayNumAvailable: { color: theme.colors.success },
    dayNumUnavailable: { color: theme.colors.error },
    dayNumSelected: { color: '#fff', fontFamily: theme.fonts.bold },
});

const successModal = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(15,35,65,0.35)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.lg,
    },
    card: {
        width: '100%',
        maxWidth: 340,
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.xl,
        paddingVertical: theme.spacing.xl,
        paddingHorizontal: theme.spacing.lg,
        alignItems: 'center',
        ...theme.shadows.card,
    },
    iconWrap: {
        marginBottom: theme.spacing.md,
    },
    title: {
        ...theme.typography.h3,
        color: NAVY,
        marginBottom: theme.spacing.sm,
        textAlign: 'center',
    },
    message: {
        ...theme.typography.bodySm,
        color: theme.colors.textMuted,
        textAlign: 'center',
        marginBottom: theme.spacing.lg,
        paddingHorizontal: theme.spacing.sm,
    },
    btn: {
        backgroundColor: NAVY,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.xl,
        borderRadius: theme.borderRadius.md,
        minWidth: 160,
        alignItems: 'center',
    },
    btnText: {
        fontSize: 16,
        fontFamily: theme.fonts.semiBold,
        color: '#fff',
    },
});

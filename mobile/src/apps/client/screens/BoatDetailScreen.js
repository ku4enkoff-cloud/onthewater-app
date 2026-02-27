import React, { useEffect, useState, useContext } from 'react';
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
    KeyboardAvoidingView,
    Platform,
    Dimensions,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../../theme';
import { api } from '../../../infrastructure/api';
import { AuthContext } from '../../../context/AuthContext';
import {
    ChevronLeft,
    ChevronRight,
    Star,
    X,
    User,
    Ruler,
    Users,
    Anchor,
    MessageCircle,
    MapPin,
    Check,
    Shield,
    FileText,
    Share2,
    Heart,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');
const IMAGE_HEIGHT = 280;

// Удобства по умолчанию (можно расширить из API)
const DEFAULT_AMENITIES = [
    'Туалет',
    'Кондиционер',
    'Аудиосистема',
    'Bluetooth',
    'Спасательные жилеты',
    'Трап для купания',
    'Холодильник',
    'Якорь',
];

export default function BoatDetailScreen({ route, navigation }) {
    const insets = useSafeAreaInsets();
    const { user } = useContext(AuthContext);
    const { boatId } = route.params || {};
    const [boat, setBoat] = useState(null);
    const [loading, setLoading] = useState(true);
    const [reviewsVisible, setReviewsVisible] = useState(false);
    const [reviews, setReviews] = useState([]);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [writeReviewVisible, setWriteReviewVisible] = useState(false);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewText, setReviewText] = useState('');
    const [reviewSubmitting, setReviewSubmitting] = useState(false);
    const [descriptionExpanded, setDescriptionExpanded] = useState(false);
    const [photoIndex, setPhotoIndex] = useState(0);
    const [isFavorite, setIsFavorite] = useState(false);

    useEffect(() => {
        if (boatId) fetchBoat();
    }, [boatId]);

    const fetchBoat = async () => {
        try {
            const res = await api.get(`/boats/${boatId}`);
            setBoat(res.data);
        } catch (e) {
            console.log('Error fetching boat', e);
        } finally {
            setLoading(false);
        }
    };

    const openReviews = async () => {
        setReviewsVisible(true);
        setReviewsLoading(true);
        setWriteReviewVisible(false);
        setReviewRating(5);
        setReviewText('');
        try {
            const res = await api.get(`/boats/${boatId}/reviews`);
            setReviews(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
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
            const [reviewsRes, boatRes] = await Promise.all([
                api.get(`/boats/${boatId}/reviews`),
                api.get(`/boats/${boatId}`),
            ]);
            setReviews(Array.isArray(reviewsRes.data) ? reviewsRes.data : []);
            setBoat(boatRes.data);
        } catch (err) {
            Alert.alert('Ошибка', err.response?.data?.error || 'Не удалось отправить отзыв');
        } finally {
            setReviewSubmitting(false);
        }
    };

    const reviewsCount = boat?.reviews_count ?? 0;
    const rating = boat?.rating ?? 0;
    const photos = boat?.photos?.length ? boat.photos : ['https://placehold.co/800x600/0F52BA/FFFFFF/png'];
    const description = boat?.description || 'Нет описания.';
    const descShort = description.length > 180 ? description.slice(0, 180) + '...' : description;
    const showReadMore = description.length > 180;
    const amenities = boat?.amenities?.length ? boat.amenities : DEFAULT_AMENITIES;

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    if (!boat) {
        return (
            <View style={styles.centered}>
                <Text style={theme.typography.h2}>Катер не найден</Text>
            </View>
        );
    }

    const handleShare = () => {
        Alert.alert(
            'Поделиться',
            'Ссылка на катер будет доступна в следующей версии.',
            [{ text: 'OK' }]
        );
    };

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
                {/* Галерея */}
                <View style={styles.gallery}>
                    <ScrollView
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onMomentumScrollEnd={(e) => setPhotoIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
                    >
                        {photos.map((uri, i) => (
                            <Image key={i} source={{ uri }} style={styles.heroImage} resizeMode="cover" />
                        ))}
                    </ScrollView>
                    {/* Навигация поверх изображения: назад, поделиться, избранное */}
                    <View style={[styles.topNav, { paddingTop: insets.top + 8 }]}>
                        <TouchableOpacity
                            style={styles.topNavButton}
                            onPress={() => navigation.goBack()}
                            activeOpacity={0.8}
                        >
                            <ChevronLeft size={24} color={theme.colors.textMain} />
                        </TouchableOpacity>
                        <View style={styles.topNavRight}>
                            <TouchableOpacity
                                style={styles.topNavButton}
                                onPress={handleShare}
                                activeOpacity={0.8}
                            >
                                <Share2 size={22} color={theme.colors.textMain} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.topNavButton}
                                onPress={() => setIsFavorite(!isFavorite)}
                                activeOpacity={0.8}
                            >
                                <Heart
                                    size={22}
                                    color={isFavorite ? theme.colors.secondary : theme.colors.textMain}
                                    fill={isFavorite ? theme.colors.secondary : 'transparent'}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>
                    {photos.length > 1 && (
                        <View style={styles.dots}>
                            {photos.map((_, i) => (
                                <View key={i} style={[styles.dot, i === photoIndex && styles.dotActive]} />
                            ))}
                        </View>
                    )}
                </View>

                <View style={styles.content}>
                    {/* Заголовок */}
                    <Text style={styles.title}>{boat.title}</Text>

                    {/* Рейтинг + бронирования + ключевые характеристики */}
                    <TouchableOpacity style={styles.statsRow} onPress={openReviews} activeOpacity={0.8}>
                        <View style={styles.ratingBadge}>
                            <Star size={16} color={theme.colors.primary} fill={theme.colors.primary} />
                            <Text style={styles.ratingNum}>{rating}</Text>
                        </View>
                        <Text style={styles.statsDivider}>·</Text>
                        <Text style={styles.bookingsCount}>({boat.bookings_count ?? 0} бронирований)</Text>
                    </TouchableOpacity>

                    <View style={styles.specsRow}>
                        <View style={styles.specChip}>
                            <Ruler size={14} color={theme.colors.textMuted} />
                            <Text style={styles.specChipText}>{boat.length_m || '—'} м</Text>
                        </View>
                        <View style={styles.specChip}>
                            <Users size={14} color={theme.colors.textMuted} />
                            <Text style={styles.specChipText}>до {boat.capacity || '—'} гостей</Text>
                        </View>
                        <View style={styles.specChip}>
                            <Anchor size={14} color={theme.colors.textMuted} />
                            <Text style={styles.specChipText}>
                                {boat.captain_included ? 'С капитаном' : boat.has_captain_option ? 'Капитан опционально' : 'Без капитана'}
                            </Text>
                        </View>
                    </View>

                    {/* Раздел «Лодка» */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>О лодке</Text>
                        <Text style={styles.bodyText}>
                            {descriptionExpanded ? description : descShort}
                        </Text>
                        {showReadMore && (
                            <TouchableOpacity onPress={() => setDescriptionExpanded(!descriptionExpanded)}>
                                <Text style={styles.readMore}>
                                    {descriptionExpanded ? 'Свернуть' : 'Читать далее'}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Владелец */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Владелец</Text>
                        <View style={styles.ownerCard}>
                            <View style={styles.ownerAvatar}>
                                <User size={28} color={theme.colors.textMuted} />
                            </View>
                            <View style={styles.ownerInfo}>
                                <Text style={styles.ownerName}>{boat.owner_name || 'Владелец'}</Text>
                                <View style={styles.ownerMeta}>
                                    <Star size={14} color={theme.colors.primary} fill={theme.colors.primary} />
                                    <Text style={styles.ownerRating}>{rating}</Text>
                                    <Text style={styles.ownerReviews}> · {reviewsCount} отзывов</Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                style={styles.messageOwnerBtn}
                                onPress={() => navigation.navigate('ChatDetail', { chatId: `boat-${boatId}`, boatId })}
                            >
                                <MessageCircle size={18} color="white" />
                                <Text style={styles.messageOwnerText}>Написать</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Удобства */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Удобства</Text>
                        <View style={styles.amenitiesGrid}>
                            {amenities.slice(0, 8).map((name, i) => (
                                <View key={i} style={styles.amenityItem}>
                                    <Check size={16} color={theme.colors.success} />
                                    <Text style={styles.amenityText}>{name}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Характеристики */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Характеристики</Text>
                        <View style={styles.specsGrid}>
                            <View style={styles.specRow}>
                                <Text style={styles.specLabel}>Год</Text>
                                <Text style={styles.specValue}>{boat.year || '—'}</Text>
                            </View>
                            <View style={styles.specRow}>
                                <Text style={styles.specLabel}>Длина</Text>
                                <Text style={styles.specValue}>{boat.length_m ? `${boat.length_m} м` : '—'}</Text>
                            </View>
                            <View style={styles.specRow}>
                                <Text style={styles.specLabel}>Модель</Text>
                                <Text style={styles.specValue}>{boat.type_name || boat.type_id || '—'}</Text>
                            </View>
                            <View style={styles.specRow}>
                                <Text style={styles.specLabel}>Вместимость</Text>
                                <Text style={styles.specValue}>{boat.capacity || '—'} гостей</Text>
                            </View>
                        </View>
                    </View>

                    {/* Рейтинги и отзывы — кликабельный блок */}
                    <TouchableOpacity style={styles.reviewsBlock} onPress={openReviews} activeOpacity={0.8}>
                        <View style={styles.reviewsBlockLeft}>
                            <Text style={styles.sectionTitle}>Рейтинги и отзывы</Text>
                            <View style={styles.reviewsBlockRating}>
                                <Star size={20} color={theme.colors.primary} fill={theme.colors.primary} />
                                <Text style={styles.ratingNumBig}>{rating}</Text>
                                <Text style={styles.reviewsCountText}>({reviewsCount} отзывов)</Text>
                            </View>
                        </View>
                        <ChevronRight size={24} color={theme.colors.textMuted} />
                    </TouchableOpacity>

                    {/* Расположение */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Расположение</Text>
                        <View style={styles.locationBlock}>
                            <MapPin size={20} color={theme.colors.textMuted} />
                            <Text style={styles.locationText}>
                                Точный адрес причала предоставляется после подтверждения бронирования.
                            </Text>
                        </View>
                        {boat.location_city && (
                            <Text style={styles.cityText}>{boat.location_city}</Text>
                        )}
                    </View>

                    {/* Что нужно знать */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Что нужно знать</Text>
                        <View style={styles.thingsCard}>
                            <View style={styles.thingRow}>
                                <Shield size={18} color={theme.colors.textMuted} />
                                <Text style={styles.thingText}>Политика отмены: умеренная. Бесплатная отмена до 5 дней до начала.</Text>
                            </View>
                            <View style={styles.thingRow}>
                                <FileText size={18} color={theme.colors.textMuted} />
                                <Text style={styles.thingText}>Залог может потребоваться при бронировании.</Text>
                            </View>
                        </View>
                    </View>

                    <View style={{ height: 24 }} />
                </View>
            </ScrollView>

            {/* Нижняя панель бронирования (как на Boatsetter) */}
            <View style={[styles.bookingBar, { paddingBottom: 16 + insets.bottom }]}>
                <View style={styles.bookingBarLeft}>
                    <Text style={styles.bookingPrice}>от {boat.price_per_hour} ₽</Text>
                    <Text style={styles.bookingPriceLabel}>за 1 час</Text>
                </View>
                <TouchableOpacity
                    style={styles.bookButton}
                    onPress={() => Alert.alert('Бронирование', 'Выбор даты и оформление брони — в следующей версии.')}
                >
                    <Text style={styles.bookButtonText}>Забронировать</Text>
                </TouchableOpacity>
            </View>

            {/* Модалка отзывов */}
            <Modal
                visible={reviewsVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setReviewsVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { paddingBottom: insets.bottom + 16 }]}>
                        <View style={styles.modalHeader}>
                            <Text style={theme.typography.h2}>Отзывы</Text>
                            <View style={styles.modalHeaderActions}>
                                {!writeReviewVisible && (
                                    <TouchableOpacity onPress={openWriteReview} style={styles.modalWriteReviewLink} activeOpacity={0.7}>
                                        <Text style={styles.modalWriteReviewLinkText}>Написать отзыв</Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity onPress={() => setReviewsVisible(false)} style={styles.modalClose}>
                                    <X size={24} color={theme.colors.textMain} />
                                </TouchableOpacity>
                            </View>
                        </View>
                        <View style={styles.ratingSummary}>
                            <Star size={28} color={theme.colors.primary} fill={theme.colors.primary} />
                            <Text style={styles.ratingBig}>{rating}</Text>
                            <Text style={theme.typography.bodySm}>
                                {' '}· {reviewsCount} {reviewsCount === 1 ? 'отзыв' : reviewsCount < 5 ? 'отзыва' : 'отзывов'}
                            </Text>
                        </View>

                        {writeReviewVisible && (
                            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.writeReviewForm}>
                                <Text style={styles.writeReviewLabel}>Оценка</Text>
                                <View style={styles.writeReviewStars}>
                                    {[1, 2, 3, 4, 5].map(n => (
                                        <TouchableOpacity key={n} onPress={() => setReviewRating(n)} style={styles.writeReviewStarBtn} activeOpacity={0.7}>
                                            <Star size={28} color={n <= reviewRating ? theme.colors.primary : theme.colors.border} fill={n <= reviewRating ? theme.colors.primary : 'transparent'} />
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
                                    <TouchableOpacity style={styles.writeReviewCancelBtn} onPress={() => { setWriteReviewVisible(false); setReviewText(''); }} disabled={reviewSubmitting}>
                                        <Text style={styles.writeReviewCancelText}>Отмена</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.writeReviewSubmitBtn, reviewSubmitting && styles.writeReviewSubmitDisabled]} onPress={submitReview} disabled={reviewSubmitting} activeOpacity={0.8}>
                                        {reviewSubmitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.writeReviewSubmitText}>Отправить</Text>}
                                    </TouchableOpacity>
                                </View>
                            </KeyboardAvoidingView>
                        )}

                        {!writeReviewVisible && (reviewsLoading ? (
                            <View style={styles.reviewsLoading}>
                                <ActivityIndicator color={theme.colors.primary} />
                            </View>
                        ) : (
                            <FlatList
                                data={reviews}
                                keyExtractor={item => String(item.id || item._id || Math.random())}
                                contentContainerStyle={styles.reviewsList}
                                ListEmptyComponent={
                                    <Text style={[theme.typography.body, { color: theme.colors.textMuted, textAlign: 'center', paddingVertical: 24 }]}>
                                        Пока нет отзывов
                                    </Text>
                                }
                                renderItem={({ item }) => (
                                    <View style={styles.reviewCard}>
                                        <View style={styles.reviewHeader}>
                                            <View style={styles.reviewAvatar}>
                                                <Text style={styles.reviewAvatarText}>
                                                    {(item.user_name || item.author || 'Г').charAt(0)}
                                                </Text>
                                            </View>
                                            <View style={styles.reviewMeta}>
                                                <Text style={styles.reviewAuthor}>{item.user_name || item.author || 'Гость'}</Text>
                                                <View style={styles.reviewStars}>
                                                    {[1, 2, 3, 4, 5].map(n => (
                                                        <Star
                                                            key={n}
                                                            size={14}
                                                            color={n <= (item.rating ?? 5) ? theme.colors.primary : theme.colors.border}
                                                            fill={n <= (item.rating ?? 5) ? theme.colors.primary : 'transparent'}
                                                        />
                                                    ))}
                                                </View>
                                            </View>
                                            <Text style={styles.reviewDate}>
                                                {item.created_at
                                                    ? new Date(item.created_at).toLocaleDateString('ru-RU', {
                                                          day: 'numeric',
                                                          month: 'short',
                                                          year: 'numeric',
                                                      })
                                                    : ''}
                                            </Text>
                                        </View>
                                        <Text style={styles.reviewText}>{item.text || item.comment || ''}</Text>
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

const styles = StyleSheet.create({
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    container: { flex: 1, backgroundColor: theme.colors.background },
    gallery: { marginBottom: theme.spacing.md, position: 'relative' },
    heroImage: { width, height: IMAGE_HEIGHT },
    topNav: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
    },
    topNavButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.card,
    },
    topNavRight: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
    },
    dots: {
        position: 'absolute',
        bottom: 12,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.5)',
    },
    dotActive: { backgroundColor: 'white' },
    content: { paddingHorizontal: theme.spacing.lg },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: theme.colors.textMain,
        marginBottom: theme.spacing.sm,
        lineHeight: 28,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    ratingNum: { fontSize: 16, fontWeight: '700', color: theme.colors.textMain },
    statsDivider: { marginHorizontal: 6, color: theme.colors.textMuted, fontSize: 14 },
    bookingsCount: { ...theme.typography.bodySm, color: theme.colors.textMuted },
    specsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.lg,
    },
    specChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 10,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.pill,
    },
    specChipText: { ...theme.typography.bodySm, color: theme.colors.textMain },
    section: { marginBottom: theme.spacing.xl },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.textMain,
        marginBottom: theme.spacing.md,
    },
    bodyText: { ...theme.typography.body, color: theme.colors.textMain, lineHeight: 24 },
    readMore: {
        marginTop: 8,
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.textMain,
    },
    ownerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        ...theme.shadows.card,
    },
    ownerAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: theme.colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    ownerInfo: { flex: 1, marginLeft: theme.spacing.md },
    ownerName: { ...theme.typography.h3, marginBottom: 2 },
    ownerMeta: { flexDirection: 'row', alignItems: 'center' },
    ownerRating: { ...theme.typography.bodySm, fontWeight: '600', marginLeft: 4 },
    ownerReviews: { ...theme.typography.bodySm, color: theme.colors.textMuted },
    messageOwnerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: theme.colors.primary,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: theme.borderRadius.md,
    },
    messageOwnerText: { color: 'white', fontWeight: '600', fontSize: 14 },
    amenitiesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.sm,
    },
    amenityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '48%',
        gap: 8,
    },
    amenityText: { ...theme.typography.bodySm, color: theme.colors.textMain },
    specsGrid: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
    },
    specRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    specLabel: { ...theme.typography.bodySm, color: theme.colors.textMuted },
    specValue: { ...theme.typography.body, fontWeight: '500' },
    reviewsBlock: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        ...theme.shadows.card,
    },
    reviewsBlockLeft: {},
    reviewsBlockRating: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    ratingNumBig: { fontSize: 20, fontWeight: '700', marginLeft: 6 },
    reviewsCountText: { ...theme.typography.bodySm, color: theme.colors.textMuted, marginLeft: 4 },
    locationBlock: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: theme.spacing.sm,
    },
    locationText: { ...theme.typography.bodySm, color: theme.colors.textMuted, flex: 1 },
    cityText: { marginTop: 8, ...theme.typography.bodySm, color: theme.colors.textMain },
    thingsCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
    },
    thingRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.sm,
    },
    thingText: { ...theme.typography.bodySm, color: theme.colors.textMain, flex: 1 },

    bookingBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: theme.colors.background,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    bookingBarLeft: {},
    bookingPrice: { ...theme.typography.h2, color: theme.colors.textMain },
    bookingPriceLabel: { ...theme.typography.caption, color: theme.colors.textMuted, marginTop: 2 },
    bookButton: {
        backgroundColor: theme.colors.secondary,
        paddingVertical: 14,
        paddingHorizontal: 28,
        borderRadius: theme.borderRadius.md,
    },
    bookButtonText: { color: 'white', fontWeight: '700', fontSize: 16 },

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: theme.colors.background,
        borderTopLeftRadius: theme.borderRadius.lg,
        borderTopRightRadius: theme.borderRadius.lg,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    modalClose: { padding: 8 },
    modalHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
    modalWriteReviewLink: { paddingVertical: 8, paddingHorizontal: 4 },
    modalWriteReviewLinkText: { ...theme.typography.body, fontWeight: '600', color: theme.colors.primary },
    ratingSummary: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
    },
    ratingBig: { ...theme.typography.h2, marginLeft: 8 },
    reviewsLoading: { paddingVertical: 48, alignItems: 'center' },
    reviewsList: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.xl },
    writeReviewBtn: {
        marginHorizontal: theme.spacing.lg,
        marginBottom: theme.spacing.md,
        paddingVertical: 14,
        backgroundColor: theme.colors.primary,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
    },
    writeReviewBtnText: { ...theme.typography.body, fontWeight: '600', color: '#fff' },
    writeReviewForm: { paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.lg },
    writeReviewLabel: { ...theme.typography.bodySm, fontWeight: '600', color: theme.colors.textMain, marginBottom: 8 },
    writeReviewStars: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
    writeReviewStarBtn: { padding: 4 },
    writeReviewInput: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: theme.colors.textMain,
        minHeight: 100,
        marginBottom: theme.spacing.md,
    },
    writeReviewActions: { flexDirection: 'row', gap: theme.spacing.sm },
    writeReviewCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center' },
    writeReviewCancelText: { ...theme.typography.body, fontWeight: '600', color: theme.colors.textMuted },
    writeReviewSubmitBtn: { flex: 1, paddingVertical: 14, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.primary, alignItems: 'center' },
    writeReviewSubmitText: { ...theme.typography.body, fontWeight: '600', color: '#fff' },
    writeReviewSubmitDisabled: { opacity: 0.6 },
    reviewCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    reviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    reviewAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    reviewAvatarText: { ...theme.typography.bodySm, fontWeight: '600', color: theme.colors.primary },
    reviewMeta: { flex: 1, marginLeft: theme.spacing.sm },
    reviewAuthor: { ...theme.typography.bodySm, fontWeight: '600' },
    reviewStars: { flexDirection: 'row', marginTop: 2 },
    reviewDate: { ...theme.typography.caption, color: theme.colors.textMuted },
    reviewText: { ...theme.typography.bodySm, color: theme.colors.textMain },
});

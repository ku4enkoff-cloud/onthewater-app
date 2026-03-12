import React, { useContext, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, Image, ScrollView, Alert, Modal, FlatList, TextInput, ActivityIndicator, Switch } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthContext } from '../../shared/context/AuthContext';
import { NotificationsContext } from '../../shared/context/NotificationsContext';
import { FavoritesContext } from '../../shared/context/FavoritesContext';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../shared/infrastructure/api';
import { API_BASE, getPhotoUrl } from '../../shared/infrastructure/config';
import { theme } from '../../shared/theme';
import { User, Settings, Heart, HelpCircle, LogOut, ChevronRight, Calendar, Star, Shield, FileText, Bell, X, Pencil, Trash2, Lock } from 'lucide-react-native';

export default function ProfileScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { user, logout, refreshUser } = useContext(AuthContext);
    const { pushEnabled, setPushEnabled } = useContext(NotificationsContext);
    const { favoriteBoats } = useContext(FavoritesContext);
    const [loading, setLoading] = useState(false);
    const [completedTrips, setCompletedTrips] = useState(0);
    const [reviewsCount, setReviewsCount] = useState(0);
    const [reviewsModalVisible, setReviewsModalVisible] = useState(false);
    const [myReviews, setMyReviews] = useState([]);
    const [loadingReviews, setLoadingReviews] = useState(false);
    const [editingReviewId, setEditingReviewId] = useState(null);
    const [editRating, setEditRating] = useState(5);
    const [editText, setEditText] = useState('');
    const [savingReview, setSavingReview] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);
    const [emailBooking, setEmailBooking] = useState(true);
    const [emailMessages, setEmailMessages] = useState(true);
    const [emailNews, setEmailNews] = useState(true);

    const handlePickAvatar = useCallback(async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Доступ', 'Разрешите доступ к галерее для выбора фото.');
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });
            if (result.canceled || !result.assets?.[0]?.uri) return;
            setUploadingAvatar(true);
            try {
                const uri = result.assets[0].uri;
                const formData = new FormData();
                formData.append('avatar', {
                    uri,
                    type: 'image/jpeg',
                    name: 'avatar.jpg',
                });
                const token = await AsyncStorage.getItem('@token');
                const res = await fetch(`${API_BASE}/auth/avatar`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token || ''}` },
                    body: formData,
                });
                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    throw new Error(data.error || `Ошибка ${res.status}`);
                }
                await refreshUser();
            } catch (e) {
                Alert.alert('Ошибка', e?.message || 'Не удалось загрузить фото');
            } finally {
                setUploadingAvatar(false);
            }
        } catch (err) {
            Alert.alert('Ошибка', err?.message || 'Не удалось открыть галерею');
        }
    }, [refreshUser]);

    const handleLogout = async () => {
        Alert.alert('Выход', 'Вы действительно хотите выйти из аккаунта?', [
            { text: 'Отмена', style: 'cancel' },
            { text: 'Выйти', style: 'destructive', onPress: async () => { setLoading(true); try { await logout(); } finally { setLoading(false); } } },
        ]);
    };

    useEffect(() => {
        if (!user) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await api.get('/bookings');
                const list = Array.isArray(res.data) ? res.data : [];
                const completed = list.filter((b) => b.status === 'completed').length;
                if (!cancelled) setCompletedTrips(completed);
            } catch (_) {
                if (!cancelled) setCompletedTrips(0);
            }
        })();
        return () => { cancelled = true; };
    }, [user]);

    const fetchReviewsCount = useCallback(async () => {
        if (!user) return;
        try {
            const res = await api.get('/auth/reviews-count');
            setReviewsCount(res.data?.count ?? 0);
        } catch (_) {
            setReviewsCount(0);
        }
    }, [user]);

    useEffect(() => {
        fetchReviewsCount();
    }, [fetchReviewsCount]);

    useFocusEffect(
        useCallback(() => {
            if (user) fetchReviewsCount();
        }, [user, fetchReviewsCount])
    );

    const openReviewsModal = useCallback(async () => {
        setReviewsModalVisible(true);
        setEditingReviewId(null);
        setLoadingReviews(true);
        try {
            const res = await api.get('/auth/reviews');
            setMyReviews(Array.isArray(res.data) ? res.data : []);
        } catch (_) {
            setMyReviews([]);
        } finally {
            setLoadingReviews(false);
        }
    }, []);

    const handleDeleteReview = useCallback((review) => {
        Alert.alert('Удалить отзыв?', `Отзыв на «${review.boat_title || 'Катер'}» будет удалён.`, [
            { text: 'Отмена', style: 'cancel' },
            {
                text: 'Удалить',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await api.delete(`/auth/reviews/${review.id}`);
                        setMyReviews((prev) => prev.filter((r) => r.id !== review.id));
                        fetchReviewsCount();
                    } catch (e) {
                        Alert.alert('Ошибка', e.response?.data?.error || 'Не удалось удалить отзыв');
                    }
                },
            },
        ]);
    }, [fetchReviewsCount]);

    const startEditReview = useCallback((review) => {
        setEditingReviewId(review.id);
        setEditRating(review.rating ?? 5);
        setEditText(review.text || '');
    }, []);

    const saveEditReview = useCallback(async () => {
        if (!editingReviewId) return;
        const textTrim = editText.trim();
        if (textTrim.length < 20) {
            Alert.alert('Ошибка', 'Текст отзыва должен быть не короче 20 символов');
            return;
        }
        setSavingReview(true);
        try {
            await api.patch(`/auth/reviews/${editingReviewId}`, { rating: editRating, text: textTrim });
            setMyReviews((prev) => prev.map((r) => (r.id === editingReviewId ? { ...r, rating: editRating, text: textTrim } : r)));
            setEditingReviewId(null);
            fetchReviewsCount();
        } catch (e) {
            Alert.alert('Ошибка', e.response?.data?.error || 'Не удалось сохранить отзыв');
        } finally {
            setSavingReview(false);
        }
    }, [editingReviewId, editRating, editText, fetchReviewsCount]);

    const menuItems = [
        { id: 'bookings', icon: Calendar, title: 'Мои брони', onPress: () => navigation.navigate('Bookings') },
        { id: 'notifications', icon: Bell, title: 'Уведомления', onPress: () => setNotificationsModalVisible(true) },
        { id: 'settings', icon: Settings, title: 'Настройки', onPress: () => {} },
        { id: 'help', icon: HelpCircle, title: 'Помощь', onPress: () => {} },
        { id: 'privacy', icon: Shield, title: 'Политика конфиденциальности', onPress: () => {} },
        { id: 'terms', icon: FileText, title: 'Условия использования', onPress: () => {} },
    ];

    const stats = [
        { label: 'Поездки', value: String(completedTrips), icon: Calendar, onPress: () => navigation.navigate('Bookings') },
        { label: 'Отзывы', value: String(reviewsCount), icon: Star, onPress: openReviewsModal },
        { label: 'Избранное', value: String(favoriteBoats?.length ?? 0), icon: Heart, onPress: () => navigation.navigate('Favorites') },
    ];

    if (!user) {
        return (
            <ScrollView style={styles.container} contentContainerStyle={[styles.guestContainer, { paddingTop: insets.top + 24 }]} showsVerticalScrollIndicator={false}>
                <View style={styles.guestHeader}>
                    <View style={styles.avatarPlaceholder}><User size={60} color={theme.colors.gray400} /></View>
                    <Text style={styles.guestTitle}>Гость</Text>
                    <Text style={styles.guestSubtitle}>Войдите, чтобы бронировать катера и управлять профилем</Text>
                </View>
                <TouchableOpacity style={styles.loginButton} onPress={() => navigation.navigate('Login', { fromProfile: true })}>
                    <Text style={styles.loginButtonText}>Войти</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.registerButton} onPress={() => navigation.navigate('Register', { fromProfile: true })}>
                    <Text style={styles.registerButtonText}>Регистрация</Text>
                </TouchableOpacity>
                <View style={styles.versionContainer}><Text style={styles.versionText}>ONTHEWATER v1.0.0</Text></View>
            </ScrollView>
        );
    }

    return (
        <>
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 32, paddingTop: insets.top + 16 }} keyboardShouldPersistTaps="handled">
            <View style={styles.profileCard}>
                <View style={styles.profileRow}>
                    <Pressable onPress={handlePickAvatar} disabled={uploadingAvatar} style={({ pressed }) => [styles.avatarTouch, pressed && styles.avatarTouchPressed]} android_ripple={null}>
                        {user?.avatar ? (
                            <Image source={{ uri: getPhotoUrl(user.avatar) || user.avatar }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                {uploadingAvatar ? <ActivityIndicator size="small" color={theme.colors.gray500} /> : <User size={40} color={theme.colors.gray500} />}
                            </View>
                        )}
                    </Pressable>
                    <View style={styles.profileInfo}>
                        <Text style={styles.profileName}>{user?.name || 'Пользователь'}</Text>
                        <Text style={styles.profileEmail}>{user?.email || ''}</Text>
                        <View style={styles.verifiedBadge}>
                            <Text style={styles.verifiedText}>Verified</Text>
                        </View>
                    </View>
                </View>
                <View style={styles.statsRow}>
                    {stats.map((s, i) => {
                        const Icon = s.icon;
                        const content = (
                            <>
                                <View style={styles.statIconWrap}>
                                    <Icon size={20} color={theme.colors.primary} />
                                </View>
                                <Text style={styles.statValue}>{s.value}</Text>
                                <Text style={styles.statLabel}>{s.label}</Text>
                            </>
                        );
                        return s.onPress ? (
                            <TouchableOpacity key={s.label} style={styles.statBlock} onPress={s.onPress} activeOpacity={0.7}>
                                {content}
                            </TouchableOpacity>
                        ) : (
                            <View key={s.label} style={styles.statBlock}>{content}</View>
                        );
                    })}
                </View>
            </View>
            <View style={styles.menuCard}>
                {menuItems.map((item, index) => {
                    const Icon = item.icon;
                    return (
                        <TouchableOpacity key={item.id} style={[styles.menuItem, index < menuItems.length - 1 && styles.menuItemBorder]} onPress={item.onPress}>
                            <View style={styles.menuIconWrap}><Icon size={20} color={theme.colors.gray700} /></View>
                            <Text style={styles.menuItemTitle}>{item.title}</Text>
                            <ChevronRight size={20} color={theme.colors.gray400} />
                        </TouchableOpacity>
                    );
                })}
            </View>
            <TouchableOpacity style={[styles.logoutButton, loading && styles.logoutButtonDisabled]} onPress={handleLogout} disabled={loading}>
                <LogOut size={20} color={theme.colors.error} />
                <Text style={styles.logoutText}>Выйти</Text>
            </TouchableOpacity>
            <View style={styles.versionContainer}><Text style={styles.versionText}>ONTHEWATER v1.0.0</Text></View>
        </ScrollView>

        <Modal visible={reviewsModalVisible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={[styles.reviewsModal, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
                    <View style={styles.reviewsModalHeader}>
                        <Text style={styles.reviewsModalTitle}>Мои отзывы</Text>
                        <TouchableOpacity onPress={() => { setReviewsModalVisible(false); setEditingReviewId(null); }} hitSlop={12}>
                            <X size={24} color={theme.colors.gray700} />
                        </TouchableOpacity>
                    </View>
                    {editingReviewId ? (
                        <View style={styles.editReviewForm}>
                            <Text style={styles.editReviewLabel}>Оценка</Text>
                            <View style={styles.starRow}>
                                {[1, 2, 3, 4, 5].map((n) => (
                                    <TouchableOpacity key={n} onPress={() => setEditRating(n)} style={styles.starBtn}>
                                        <Star size={28} color={n <= editRating ? theme.colors.primary : theme.colors.border} fill={n <= editRating ? theme.colors.primary : 'transparent'} />
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <Text style={styles.editReviewLabel}>Текст отзыва (не менее 20 символов)</Text>
                            <TextInput
                                style={styles.editReviewInput}
                                value={editText}
                                onChangeText={setEditText}
                                placeholder="Ваш отзыв..."
                                multiline
                                numberOfLines={4}
                            />
                            <View style={styles.editReviewActions}>
                                <TouchableOpacity style={styles.editReviewCancelBtn} onPress={() => setEditingReviewId(null)}>
                                    <Text style={styles.editReviewCancelText}>Отмена</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.editReviewSaveBtn} onPress={saveEditReview} disabled={savingReview}>
                                    {savingReview ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.editReviewSaveText}>Сохранить</Text>}
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : null}
                    {loadingReviews ? (
                        <View style={styles.reviewsModalLoading}><ActivityIndicator size="large" color={theme.colors.primary} /></View>
                    ) : myReviews.length === 0 ? (
                        <Text style={styles.reviewsModalEmpty}>Вы ещё не оставляли отзывов</Text>
                    ) : (
                        <FlatList
                            data={myReviews}
                            keyExtractor={(item) => String(item.id)}
                            contentContainerStyle={styles.reviewsListContent}
                            renderItem={({ item }) => (
                                <View style={styles.reviewCard}>
                                    <Text style={styles.reviewCardBoat}>{item.boat_title || 'Катер'}</Text>
                                    <View style={styles.reviewCardStars}>
                                        {[1, 2, 3, 4, 5].map((n) => (
                                            <Star key={n} size={16} color={n <= (item.rating || 0) ? theme.colors.primary : theme.colors.border} fill={n <= (item.rating || 0) ? theme.colors.primary : 'transparent'} />
                                        ))}
                                    </View>
                                    <Text style={styles.reviewCardText} numberOfLines={4}>{item.text || ''}</Text>
                                    <Text style={styles.reviewCardDate}>{item.created_at ? new Date(item.created_at).toLocaleDateString('ru-RU') : ''}</Text>
                                    <View style={styles.reviewCardActions}>
                                        <TouchableOpacity style={styles.reviewCardEditBtn} onPress={() => startEditReview(item)}>
                                            <Pencil size={18} color={theme.colors.primary} />
                                            <Text style={styles.reviewCardEditText}>Редактировать</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.reviewCardDeleteBtn} onPress={() => handleDeleteReview(item)}>
                                            <Trash2 size={18} color={theme.colors.error} />
                                            <Text style={styles.reviewCardDeleteText}>Удалить</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                        />
                    )}
                </View>
            </View>
        </Modal>

        <Modal visible={notificationsModalVisible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={[styles.notificationsModal, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}>
                    <View style={styles.notificationsModalHeader}>
                        <Text style={styles.notificationsModalTitle}>Настройки уведомлений</Text>
                        <TouchableOpacity onPress={() => setNotificationsModalVisible(false)} hitSlop={12}>
                            <X size={24} color={theme.colors.gray700} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.notificationsScroll} showsVerticalScrollIndicator={false}>
                        <Text style={styles.notificationsSectionTitle}>Email</Text>
                        <Text style={styles.notificationsSectionSubtitle}>Настройки для: {user?.email || '—'}</Text>
                        <Text style={styles.notificationsHint}>
                            Отключить email по бронированиям нельзя, но вы можете отключить SMS и Push.
                        </Text>
                        <View style={styles.notificationRow}>
                            <View style={styles.notificationRowLeft}>
                                <Text style={styles.notificationLabel}>Бронирования</Text>
                                <Lock size={14} color={theme.colors.gray400} style={{ marginLeft: 6 }} />
                            </View>
                            <Switch value={emailBooking} onValueChange={setEmailBooking} trackColor={{ false: theme.colors.gray300, true: theme.colors.primary }} thumbColor="#fff" disabled />
                        </View>
                        <View style={styles.notificationRow}>
                            <Text style={styles.notificationLabel}>Сообщения</Text>
                            <Switch value={emailMessages} onValueChange={setEmailMessages} trackColor={{ false: theme.colors.gray300, true: theme.colors.primary }} thumbColor="#fff" />
                        </View>
                        <View style={styles.notificationRow}>
                            <Text style={styles.notificationLabel}>Новости и акции</Text>
                            <Switch value={emailNews} onValueChange={setEmailNews} trackColor={{ false: theme.colors.gray300, true: theme.colors.primary }} thumbColor="#fff" />
                        </View>

                        <Text style={[styles.notificationsSectionTitle, { marginTop: 28 }]}>Push</Text>
                        <Text style={styles.notificationsHint}>
                            Чтобы получать push-уведомления, включите их в настройках телефона и ниже. Отключив, вы перестанете получать push.
                        </Text>
                        <View style={styles.notificationRow}>
                            <Text style={styles.notificationLabel}>Push-уведомления</Text>
                            <Switch value={pushEnabled !== false} onValueChange={setPushEnabled} trackColor={{ false: theme.colors.gray300, true: theme.colors.primary }} thumbColor="#fff" />
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.gray50 },
    profileCard: {
        marginHorizontal: theme.spacing.md,
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: theme.spacing.lg,
        ...theme.shadows.card,
    },
    profileRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
    avatarTouch: { width: 80, height: 80, marginRight: 0, zIndex: 1, elevation: 2 },
    avatarTouchPressed: { opacity: 0.8 },
    avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.colors.gray100, justifyContent: 'center', alignItems: 'center' },
    avatar: { width: 80, height: 80, borderRadius: 40 },
    profileInfo: { flex: 1 },
    profileName: { fontSize: 20, fontFamily: theme.fonts.bold, color: theme.colors.gray900 },
    profileEmail: { fontSize: 14, color: theme.colors.gray500, marginTop: 4 },
    verifiedBadge: {
        alignSelf: 'flex-start',
        marginTop: 8,
        backgroundColor: 'rgba(27, 54, 93, 0.1)',
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 8,
    },
    verifiedText: { fontSize: 12, fontFamily: theme.fonts.semiBold, color: theme.colors.primary },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: theme.spacing.lg,
        paddingTop: theme.spacing.lg,
        borderTopWidth: 1,
        borderTopColor: theme.colors.gray100,
    },
    statBlock: { alignItems: 'center' },
    statIconWrap: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: theme.colors.gray100,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    statValue: { fontSize: 20, fontFamily: theme.fonts.bold, color: theme.colors.gray900 },
    statLabel: { fontSize: 12, color: theme.colors.gray500, marginTop: 2 },
    menuCard: {
        marginHorizontal: theme.spacing.md,
        marginTop: theme.spacing.md,
        backgroundColor: '#fff',
        borderRadius: 24,
        overflow: 'hidden',
        ...theme.shadows.card,
    },
    menuItem: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md },
    menuItemBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.gray100 },
    menuIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: theme.colors.gray100,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: theme.spacing.sm,
    },
    menuItemTitle: { flex: 1, fontSize: 16, fontFamily: theme.fonts.medium, color: theme.colors.gray900 },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginHorizontal: theme.spacing.md,
        marginTop: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        backgroundColor: '#fff',
        borderRadius: 20,
        ...theme.shadows.card,
    },
    logoutButtonDisabled: { opacity: 0.5 },
    logoutText: { color: theme.colors.error, fontFamily: theme.fonts.semiBold, fontSize: 16 },
    versionContainer: { alignItems: 'center', marginTop: theme.spacing.lg },
    versionText: { fontSize: 12, color: theme.colors.gray400 },
    guestContainer: { flexGrow: 1, paddingHorizontal: theme.spacing.lg },
    guestHeader: { alignItems: 'center', marginBottom: theme.spacing.xl },
    guestTitle: { fontSize: 28, fontFamily: theme.fonts.bold, color: theme.colors.gray900, marginBottom: 8 },
    guestSubtitle: { ...theme.typography.body, color: theme.colors.gray500, textAlign: 'center' },
    loginButton: { backgroundColor: theme.colors.primary, paddingVertical: 14, borderRadius: theme.borderRadius.xl, alignItems: 'center', marginBottom: theme.spacing.sm },
    loginButtonText: { color: '#fff', fontSize: 16, fontFamily: theme.fonts.bold },
    registerButton: { backgroundColor: 'transparent', paddingVertical: 14, borderRadius: theme.borderRadius.xl, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.primary, marginBottom: theme.spacing.xl },
    registerButtonText: { color: theme.colors.primary, fontSize: 16, fontFamily: theme.fonts.semiBold },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    reviewsModal: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', paddingHorizontal: theme.spacing.lg },
    reviewsModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.gray100 },
    reviewsModalTitle: { fontSize: 20, fontFamily: theme.fonts.bold, color: theme.colors.gray900 },
    reviewsModalLoading: { paddingVertical: 48, alignItems: 'center' },
    reviewsModalEmpty: { paddingVertical: 32, fontSize: 16, color: theme.colors.gray500, textAlign: 'center' },
    reviewsListContent: { paddingVertical: theme.spacing.md, paddingBottom: theme.spacing.xl },
    reviewCard: { backgroundColor: theme.colors.gray50, borderRadius: 16, padding: theme.spacing.md, marginBottom: theme.spacing.sm },
    reviewCardBoat: { fontSize: 16, fontFamily: theme.fonts.semiBold, color: theme.colors.gray900, marginBottom: 4 },
    reviewCardStars: { flexDirection: 'row', gap: 2, marginBottom: 8 },
    reviewCardText: { fontSize: 14, color: theme.colors.gray700, marginBottom: 4 },
    reviewCardDate: { fontSize: 12, color: theme.colors.gray400, marginBottom: 12 },
    reviewCardActions: { flexDirection: 'row', gap: 16 },
    reviewCardEditBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    reviewCardEditText: { fontSize: 14, color: theme.colors.primary, fontFamily: theme.fonts.medium },
    reviewCardDeleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    reviewCardDeleteText: { fontSize: 14, color: theme.colors.error, fontFamily: theme.fonts.medium },
    editReviewForm: { paddingVertical: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.gray100 },
    editReviewLabel: { fontSize: 14, fontFamily: theme.fonts.medium, color: theme.colors.gray700, marginBottom: 8, marginTop: 12 },
    starRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    starBtn: { padding: 4 },
    editReviewInput: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, padding: 12, fontSize: 16, minHeight: 100, textAlignVertical: 'top' },
    editReviewActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
    editReviewCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: theme.colors.gray100, alignItems: 'center' },
    editReviewCancelText: { fontSize: 16, fontFamily: theme.fonts.medium, color: theme.colors.gray700 },
    editReviewSaveBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
    editReviewSaveText: { fontSize: 16, fontFamily: theme.fonts.semiBold, color: '#fff' },
    notificationsModal: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', paddingHorizontal: theme.spacing.lg },
    notificationsModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.gray100 },
    notificationsModalTitle: { fontSize: 20, fontFamily: theme.fonts.bold, color: theme.colors.gray900 },
    notificationsScroll: { paddingVertical: theme.spacing.md },
    notificationsSectionTitle: { fontSize: 18, fontFamily: theme.fonts.bold, color: theme.colors.gray900 },
    notificationsSectionSubtitle: { fontSize: 14, color: theme.colors.gray500, marginTop: 4 },
    notificationsHint: { fontSize: 14, color: theme.colors.gray600, marginTop: 8, marginBottom: 16 },
    notificationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.gray100 },
    notificationRowLeft: { flexDirection: 'row', alignItems: 'center' },
    notificationLabel: { fontSize: 16, fontFamily: theme.fonts.medium, color: theme.colors.gray900 },
});

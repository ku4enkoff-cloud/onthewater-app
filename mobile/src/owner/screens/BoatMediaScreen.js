import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    Image, Alert, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { ChevronLeft, Camera, Film, X, ImageIcon } from 'lucide-react-native';
import { theme } from '../../shared/theme';

let LinearGradient = null;
try { LinearGradient = require('expo-linear-gradient').LinearGradient; } catch (_) {}

const GRADIENT = ['#0A4D4D', '#0D5C5C', '#1A7A5A'];
const TEAL = '#0D5C5C';
const MAX_PHOTOS = 10;
const MAX_VIDEOS = 3;

export default function BoatMediaScreen({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const boatType = route.params?.boatType;
    const boatInfo = route.params?.boatInfo;
    const boatLocation = route.params?.boatLocation;
    const boatSchedule = route.params?.boatSchedule;

    const [photos, setPhotos] = useState([]);
    const [videos, setVideos] = useState([]);

    const pickPhotos = async () => {
        if (photos.length >= MAX_PHOTOS) {
            Alert.alert('Лимит', `Максимум ${MAX_PHOTOS} фотографий`);
            return;
        }
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Доступ к фото',
                    'Разрешите доступ к галерее в настройках устройства, чтобы добавить фотографии.',
                    [{ text: 'OK' }]
                );
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                quality: 0.8,
                allowsMultipleSelection: true,
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
                const remaining = MAX_PHOTOS - photos.length;
                const newUris = result.assets.slice(0, remaining).map((a) => a.uri);
                setPhotos((prev) => [...prev, ...newUris]);
            }
        } catch (e) {
            const msg = e?.message || 'Не удалось выбрать фотографии';
            Alert.alert('Ошибка', msg);
        }
    };

    const pickVideos = async () => {
        if (videos.length >= MAX_VIDEOS) {
            Alert.alert('Лимит', `Максимум ${MAX_VIDEOS} видео`);
            return;
        }
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Доступ к медиатеке',
                    'Разрешите доступ к галерее в настройках устройства, чтобы добавить видео.',
                    [{ text: 'OK' }]
                );
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['videos'],
                quality: 0.7,
                allowsMultipleSelection: true,
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
                const remaining = MAX_VIDEOS - videos.length;
                const newUris = result.assets.slice(0, remaining).map((a) => a.uri);
                setVideos((prev) => [...prev, ...newUris]);
            }
        } catch (e) {
            const msg = e?.message || 'Не удалось выбрать видео';
            Alert.alert('Ошибка', msg);
        }
    };

    const removePhoto = (index) => {
        setPhotos((prev) => prev.filter((_, i) => i !== index));
    };

    const removeVideo = (index) => {
        setVideos((prev) => prev.filter((_, i) => i !== index));
    };

    const canContinue = photos.length > 0;

    const handleNext = () => {
        if (!canContinue) {
            Alert.alert('Внимание', 'Добавьте хотя бы одну фотографию');
            return;
        }
        navigation.replace('AddBoat', {
            boatType,
            boatInfo,
            boatLocation,
            boatSchedule,
            boatMedia: { photos, videos },
        });
    };

    return (
        <View style={s.root}>
            {/* Header */}
            <View style={s.headerWrap}>
                {LinearGradient ? (
                    <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
                ) : (
                    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: TEAL }]} />
                )}
                <View style={[s.headerInner, { paddingTop: insets.top + 8 }]}>
                    <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                        <ChevronLeft size={24} color="#fff" />
                        <Text style={s.backText}>Назад</Text>
                    </TouchableOpacity>
                    <Text style={s.title}>Фото и видео</Text>
                    <Text style={s.subtitle}>
                        Добавьте качественные фотографии и видео вашего катера. Это поможет привлечь больше клиентов.
                    </Text>
                </View>
            </View>

            <ScrollView
                style={s.body}
                contentContainerStyle={[s.bodyContent, { paddingBottom: 110 }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Photos section */}
                <View style={s.section}>
                    <View style={s.sectionHeader}>
                        <Camera size={20} color={TEAL} />
                        <Text style={s.sectionTitle}>Фотографии *</Text>
                        <Text style={s.counter}>{photos.length}/{MAX_PHOTOS}</Text>
                    </View>
                    <Text style={s.sectionHint}>
                        Минимум 1 фото. Рекомендуем загрузить фото экстерьера, интерьера и оборудования.
                    </Text>

                    <View style={s.mediaGrid}>
                        {photos.map((uri, index) => (
                            <View key={`photo-${index}`} style={s.mediaCard}>
                                <Image source={{ uri }} style={s.mediaImage} />
                                {index === 0 && (
                                    <View style={s.mainBadge}>
                                        <Text style={s.mainBadgeText}>Главное</Text>
                                    </View>
                                )}
                                <TouchableOpacity
                                    style={s.removeBtn}
                                    onPress={() => removePhoto(index)}
                                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                >
                                    <X size={14} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        ))}
                        {photos.length < MAX_PHOTOS && (
                            <TouchableOpacity style={s.addCard} onPress={pickPhotos} activeOpacity={0.7}>
                                <ImageIcon size={28} color="#9CA3AF" />
                                <Text style={s.addCardText}>Добавить{'\n'}фото</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Videos section */}
                <View style={s.section}>
                    <View style={s.sectionHeader}>
                        <Film size={20} color={TEAL} />
                        <Text style={s.sectionTitle}>Видео</Text>
                        <Text style={s.counter}>{videos.length}/{MAX_VIDEOS}</Text>
                    </View>
                    <Text style={s.sectionHint}>
                        Видео позволяет лучше представить катер. Максимум {MAX_VIDEOS} видео.
                    </Text>

                    <View style={s.mediaGrid}>
                        {videos.map((uri, index) => (
                            <View key={`video-${index}`} style={s.mediaCard}>
                                <View style={s.videoThumb}>
                                    <Film size={32} color="#fff" />
                                    <Text style={s.videoLabel}>Видео {index + 1}</Text>
                                </View>
                                <TouchableOpacity
                                    style={s.removeBtn}
                                    onPress={() => removeVideo(index)}
                                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                >
                                    <X size={14} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        ))}
                        {videos.length < MAX_VIDEOS && (
                            <TouchableOpacity style={s.addCard} onPress={pickVideos} activeOpacity={0.7}>
                                <Film size={28} color="#9CA3AF" />
                                <Text style={s.addCardText}>Добавить{'\n'}видео</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Footer */}
            <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                <TouchableOpacity
                    style={[s.nextBtn, !canContinue && s.nextBtnDisabled]}
                    onPress={handleNext}
                    disabled={!canContinue}
                    activeOpacity={0.85}
                >
                    <Text style={s.nextBtnText}>Продолжить</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#fff' },

    headerWrap: { overflow: 'hidden' },
    headerInner: { paddingHorizontal: 20, paddingBottom: 28 },
    backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    backText: { color: '#fff', fontSize: 16, fontFamily: theme.fonts.medium, marginLeft: 4 },
    title: { fontSize: 28, fontFamily: theme.fonts.bold, color: '#fff', lineHeight: 36, marginBottom: 10 },
    subtitle: { fontSize: 14, fontFamily: theme.fonts.regular, color: 'rgba(255,255,255,0.82)', lineHeight: 20 },

    body: { flex: 1 },
    bodyContent: { paddingHorizontal: 20, paddingTop: 24 },

    section: { marginBottom: 28 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    sectionTitle: { fontSize: 17, fontFamily: theme.fonts.semiBold, color: '#1B365D', flex: 1 },
    counter: { fontSize: 14, fontFamily: theme.fonts.semiBold, color: TEAL },
    sectionHint: { fontSize: 13, fontFamily: theme.fonts.regular, color: '#9CA3AF', marginBottom: 14, lineHeight: 18 },

    mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    mediaCard: {
        width: '47.5%', aspectRatio: 4 / 3, borderRadius: 12, overflow: 'hidden',
        backgroundColor: '#F3F4F6',
    },
    mediaImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    mainBadge: {
        position: 'absolute', bottom: 8, left: 8,
        backgroundColor: TEAL, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
    },
    mainBadgeText: { fontSize: 11, fontFamily: theme.fonts.semiBold, color: '#fff' },
    removeBtn: {
        position: 'absolute', top: 8, right: 8,
        backgroundColor: 'rgba(0,0,0,0.55)', width: 26, height: 26,
        borderRadius: 13, alignItems: 'center', justifyContent: 'center',
    },
    videoThumb: {
        width: '100%', height: '100%',
        backgroundColor: '#1B365D', alignItems: 'center', justifyContent: 'center',
    },
    videoLabel: { fontSize: 12, fontFamily: theme.fonts.medium, color: 'rgba(255,255,255,0.7)', marginTop: 6 },

    addCard: {
        width: '47.5%', aspectRatio: 4 / 3, borderRadius: 12,
        borderWidth: 1.5, borderColor: '#E5E7EB', borderStyle: 'dashed',
        alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAFA',
    },
    addCardText: { fontSize: 13, fontFamily: theme.fonts.medium, color: '#9CA3AF', textAlign: 'center', marginTop: 6 },

    footer: {
        paddingHorizontal: 20, paddingTop: 12,
        borderTopWidth: 1, borderTopColor: '#F3F4F6', backgroundColor: '#fff',
    },
    nextBtn: { backgroundColor: TEAL, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
    nextBtnDisabled: { opacity: 0.45 },
    nextBtnText: { fontSize: 16, fontFamily: theme.fonts.semiBold, color: '#fff' },
});

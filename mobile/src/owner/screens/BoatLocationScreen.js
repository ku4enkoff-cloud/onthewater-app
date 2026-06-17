import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ScrollView, Platform, KeyboardAvoidingView, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, MapPin } from 'lucide-react-native';
import { theme } from '../../shared/theme';
import { isYamapNativeAvailable } from '../../shared/yamapNative';
import { ensureYamapInitialized } from '../../shared/yamapInit';
import { parseYandexGeocodeResult } from '../../shared/geo/parseYandexGeocode';
import OwnerBoatLocationMap from '../../shared/components/OwnerBoatLocationMap';

let LinearGradient = null;
try { LinearGradient = require('expo-linear-gradient').LinearGradient; } catch (_) {}

const GRADIENT = ['#0A4D4D', '#0D5C5C', '#1A7A5A'];
const TEAL = '#0D5C5C';
const GEOCODE_DEBOUNCE_MS = 400;

const isMapAvailable = isYamapNativeAvailable;
let YaMap = null;
let Marker = null;
let Search = null;
if (isMapAvailable) {
    try {
        const yamap = require('react-native-yamap-plus');
        YaMap = yamap.Yamap;
        Marker = yamap.Marker;
        Search = yamap.Search;
    } catch (_) {}
}

export default function BoatLocationScreen({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const boatType = route.params?.boatType;
    const boatInfo = route.params?.boatInfo;
    const saved = route.params?.boatLocation;

    const [lat, setLat] = useState(saved?.lat ?? null);
    const [lng, setLng] = useState(saved?.lng ?? null);
    const [country, setCountry] = useState(saved?.country || '');
    const [region, setRegion] = useState(saved?.region || '');
    const [city, setCity] = useState(saved?.city || '');
    const [address, setAddress] = useState(saved?.address || '');
    const [yachtClub, setYachtClub] = useState(saved?.yachtClub || '');
    const [mapError, setMapError] = useState(route.params?.validationErrors?.map || '');
    const [mapReady, setMapReady] = useState(false);
    const [geocodeLoading, setGeocodeLoading] = useState(false);

    const geocodeSeqRef = useRef(0);
    const geocodeTimerRef = useRef(null);
    const savedCoordsRef = useRef({
        lat: saved?.lat ?? null,
        lng: saved?.lng ?? null,
    });

    useEffect(() => {
        if (!isMapAvailable || !YaMap) return;
        let cancelled = false;
        ensureYamapInitialized().then((ok) => {
            if (!cancelled && ok) setMapReady(true);
        });
        return () => {
            cancelled = true;
            if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
        };
    }, []);

    const reverseGeocode = useCallback((pointLat, pointLng) => {
        if (!Search?.geocodePoint) return;
        if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
        geocodeTimerRef.current = setTimeout(async () => {
            geocodeTimerRef.current = null;
            const seq = ++geocodeSeqRef.current;
            setGeocodeLoading(true);
            try {
                const result = await Search.geocodePoint({ lat: pointLat, lon: pointLng });
                if (seq !== geocodeSeqRef.current) return;
                const parsed = parseYandexGeocodeResult(result);
                setCountry(parsed.country);
                setRegion(parsed.region);
                setCity(parsed.city);
                setAddress(parsed.address);
            } catch (_) {
                if (seq !== geocodeSeqRef.current) return;
            } finally {
                if (seq === geocodeSeqRef.current) setGeocodeLoading(false);
            }
        }, GEOCODE_DEBOUNCE_MS);
    }, []);

    const handleMapPress = useCallback((e) => {
        const point = e?.nativeEvent;
        const pointLat = point?.lat;
        const pointLng = point?.lon ?? point?.lng;
        if (pointLat == null || pointLng == null) return;
        setLat(pointLat);
        setLng(pointLng);
        setMapError('');
        reverseGeocode(pointLat, pointLng);
    }, [reverseGeocode]);

    const handleNext = () => {
        if (lat == null || lng == null) {
            setMapError('Нажмите на карту, чтобы указать место стоянки катера');
            return;
        }
        navigation.navigate('BoatSchedule', {
            boatType,
            boatInfo,
            boatLocation: {
                lat,
                lng,
                country: country.trim(),
                region: region.trim(),
                city: city.trim(),
                address: address.trim(),
                yachtClub: yachtClub.trim(),
            },
        });
    };

    return (
        <View style={s.root}>
            <View style={s.headerWrap}>
                {LinearGradient ? (
                    <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
                ) : (
                    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: TEAL }]} />
                )}

                <View style={[s.headerInner, { paddingTop: insets.top + 8 }]}>
                    <TouchableOpacity
                        style={s.backBtn}
                        onPress={() => navigation.goBack()}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                        <ChevronLeft size={24} color="#fff" />
                        <Text style={s.backText}>Назад</Text>
                    </TouchableOpacity>

                    <Text style={s.title}>Где находится{'\n'}ваш катер?</Text>
                    <Text style={s.subtitle}>
                        Нажмите на карту, чтобы указать местоположение. Точный адрес будет показан гостям только после подтверждения бронирования.
                    </Text>
                </View>
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {mapError ? <Text style={[s.fieldErrorText, s.mapErrorOutside]}>{mapError}</Text> : null}
                <View style={[s.mapContainer, mapError && s.mapContainerError]} collapsable={false}>
                    {!isMapAvailable || !YaMap ? (
                        <View style={s.mapPlaceholder}>
                            <Text style={s.mapPlaceholderText}>
                                Карта доступна в полной сборке приложения (не Expo Go). Укажите адрес в полях ниже или соберите dev/production build.
                            </Text>
                        </View>
                    ) : !mapReady ? (
                        <View style={s.mapLoader}>
                            <ActivityIndicator size="large" color={TEAL} />
                            <Text style={s.mapLoaderText}>Загрузка карты...</Text>
                        </View>
                    ) : (
                        <OwnerBoatLocationMap
                            YaMap={YaMap}
                            Marker={Marker}
                            initialLat={savedCoordsRef.current.lat}
                            initialLng={savedCoordsRef.current.lng}
                            markerLat={lat}
                            markerLng={lng}
                            onMapPress={handleMapPress}
                        />
                    )}
                    {geocodeLoading ? (
                        <View style={s.geocodeBadge} pointerEvents="none">
                            <ActivityIndicator size="small" color="#fff" />
                            <Text style={s.geocodeBadgeText}>Адрес…</Text>
                        </View>
                    ) : null}
                    {lat != null && lng != null && (
                        <View style={s.coordsBadge} pointerEvents="none">
                            <MapPin size={14} color="#fff" />
                            <Text style={s.coordsText}>
                                {lat.toFixed(5)}, {lng.toFixed(5)}
                            </Text>
                        </View>
                    )}
                </View>

                <ScrollView
                    style={s.body}
                    contentContainerStyle={[s.bodyContent, { paddingBottom: 100 }]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    nestedScrollEnabled
                >
                    <View style={s.fieldWrap}>
                        <Text style={s.fieldLabel}>Страна</Text>
                        <TextInput
                            style={s.input}
                            placeholder="Определится автоматически"
                            placeholderTextColor="#9CA3AF"
                            value={country}
                            onChangeText={setCountry}
                        />
                    </View>

                    <View style={s.fieldWrap}>
                        <Text style={s.fieldLabel}>Область</Text>
                        <TextInput
                            style={s.input}
                            placeholder="Определится автоматически"
                            placeholderTextColor="#9CA3AF"
                            value={region}
                            onChangeText={setRegion}
                        />
                    </View>

                    <View style={s.fieldWrap}>
                        <Text style={s.fieldLabel}>Город</Text>
                        <TextInput
                            style={s.input}
                            placeholder="Определится автоматически"
                            placeholderTextColor="#9CA3AF"
                            value={city}
                            onChangeText={setCity}
                        />
                    </View>

                    <View style={s.fieldWrap}>
                        <Text style={s.fieldLabel}>Улица, дом</Text>
                        <TextInput
                            style={s.input}
                            placeholder="Определится автоматически"
                            placeholderTextColor="#9CA3AF"
                            value={address}
                            onChangeText={setAddress}
                        />
                    </View>

                    <View style={s.fieldWrap}>
                        <Text style={s.fieldLabel}>Название яхт-клуба</Text>
                        <TextInput
                            style={s.input}
                            placeholder="Необязательно"
                            placeholderTextColor="#9CA3AF"
                            value={yachtClub}
                            onChangeText={setYachtClub}
                        />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                <TouchableOpacity
                    style={s.nextBtn}
                    onPress={handleNext}
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
    title: {
        fontSize: 28, fontFamily: theme.fonts.bold, color: '#fff',
        lineHeight: 36, marginBottom: 10,
    },
    subtitle: {
        fontSize: 14, fontFamily: theme.fonts.regular, color: 'rgba(255,255,255,0.82)',
        lineHeight: 20,
    },

    body: { flex: 1 },
    bodyContent: { paddingHorizontal: 20, paddingTop: 16 },

    fieldErrorText: { fontSize: 12, fontFamily: theme.fonts.medium, color: '#DC2626' },
    mapErrorOutside: { marginHorizontal: 20, marginTop: 12, marginBottom: 4 },
    mapContainerError: { borderWidth: 2, borderColor: '#DC2626' },
    mapContainer: {
        height: 260,
        marginHorizontal: 20,
        marginTop: 12,
        borderRadius: 14,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#F3F4F6',
    },
    mapLoader: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
    },
    mapLoaderText: {
        marginTop: 8, fontSize: 13, fontFamily: theme.fonts.regular, color: '#9CA3AF',
    },
    mapPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        padding: 16,
        backgroundColor: '#F3F4F6',
    },
    mapPlaceholderText: {
        fontSize: 13,
        fontFamily: theme.fonts.regular,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 18,
    },
    geocodeBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(13,92,92,0.85)',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    geocodeBadgeText: {
        fontSize: 12,
        fontFamily: theme.fonts.medium,
        color: '#fff',
    },
    coordsBadge: {
        position: 'absolute', bottom: 10, left: 10,
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: 'rgba(13,92,92,0.85)', borderRadius: 8,
        paddingHorizontal: 10, paddingVertical: 5,
    },
    coordsText: {
        fontSize: 12, fontFamily: theme.fonts.medium, color: '#fff',
    },

    fieldWrap: { marginBottom: 16 },
    fieldLabel: {
        fontSize: 14, fontFamily: theme.fonts.medium, color: '#374151',
        marginBottom: 6,
    },
    input: {
        borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
        paddingHorizontal: 16, paddingVertical: 14,
        fontSize: 16, fontFamily: theme.fonts.regular, color: '#1B365D',
        backgroundColor: '#fff',
    },

    footer: {
        paddingHorizontal: 20, paddingTop: 12,
        borderTopWidth: 1, borderTopColor: '#F3F4F6', backgroundColor: '#fff',
    },
    nextBtn: {
        backgroundColor: TEAL, borderRadius: 12,
        paddingVertical: 16, alignItems: 'center',
    },
    nextBtnText: { fontSize: 16, fontFamily: theme.fonts.semiBold, color: '#fff' },
});

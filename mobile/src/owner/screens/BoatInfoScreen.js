import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ScrollView, Platform, KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    ChevronLeft, ChevronDown, Check,
    Waves,
} from 'lucide-react-native';
import { theme } from '../../shared/theme';
import { api } from '../../shared/infrastructure/api';

let LinearGradient = null;
try { LinearGradient = require('expo-linear-gradient').LinearGradient; } catch (_) {}

const GRADIENT = ['#0A4D4D', '#0D5C5C', '#1A7A5A'];
const TEAL = '#0D5C5C';

const WATER_SPORTS_OPTIONS = ['Вейксерф', 'Вейкборд', 'Водные лыжи'];
const isTugboat = (name) => (name || '').toLowerCase().includes('буксировщик');
const AMENITIES_FALLBACK = [
    'Туалет', 'Кондиционер', 'Аудиосистема', 'Bluetooth', 'Спасательные жилеты',
    'Трап для купания', 'Холодильник', 'Якорь', 'Климат-контроль', 'Розетки 220В',
];
const isWaterSportOption = (name) => WATER_SPORTS_OPTIONS.includes(String(name || '').trim());

export default function BoatInfoScreen({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const boatType = route.params?.boatType;
    const saved = route.params?.boatInfo;

    const [manufacturer, setManufacturer] = useState(saved?.manufacturer || '');
    const [model, setModel] = useState(saved?.model || '');
    const [year, setYear] = useState(saved?.year || '');
    const [yearOpen, setYearOpen] = useState(false);
    const [capacity, setCapacity] = useState(saved?.capacity ? String(saved.capacity) : '');
    const [selectedAmenities, setSelectedAmenities] = useState(saved?.amenities || []);
    const [waterSports, setWaterSports] = useState(saved?.waterSports || []);
    const [fieldErrors, setFieldErrors] = useState(route.params?.validationErrors || {});
    const [amenitiesOptions, setAmenitiesOptions] = useState(AMENITIES_FALLBACK);

    useEffect(() => {
        api.get('/amenities')
            .then((r) => {
                const items = Array.isArray(r.data) ? r.data : [];
                const names = items
                    .map((a) => (a?.name ? String(a.name).trim() : ''))
                    .filter(Boolean)
                    .filter((name) => !isWaterSportOption(name));
                if (names.length > 0) setAmenitiesOptions(names);
            })
            .catch(() => {});
    }, []);

    const toggleAmenity = (name) => {
        setSelectedAmenities((prev) =>
            prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name],
        );
    };

    const toggleWaterSport = (name) => {
        setWaterSports((prev) =>
            prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name],
        );
    };

    const clearErr = (key) => setFieldErrors((prev) => {
        if (!prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
    });

    const handleNext = () => {
        const errs = {};
        if (!manufacturer.trim()) errs.manufacturer = 'Укажите производителя';
        if (!model.trim()) errs.model = 'Укажите модель';
        if (!year.trim()) errs.year = 'Выберите год выпуска';
        if (!capacity.trim()) errs.capacity = 'Укажите вместимость';
        else if (!Number.isFinite(Number(capacity)) || Number(capacity) < 1) {
            errs.capacity = 'Вместимость должна быть не меньше 1';
        }
        if (Object.keys(errs).length > 0) {
            setFieldErrors(errs);
            return;
        }
        navigation.navigate('BoatLocation', {
            boatType,
            boatInfo: {
                manufacturer: manufacturer.trim(),
                model: model.trim(),
                year: year.trim(),
                capacity: capacity.trim(),
                amenities: selectedAmenities,
                waterSports: isTugboat(boatType?.name) ? waterSports : [],
            },
        });
    };

    return (
        <View style={s.root}>
            {/* Gradient header */}
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

                    <Text style={s.title}>Расскажите{'\n'}о вашем судне</Text>
                    <Text style={s.subtitle}>
                        Эта информация поможет клиентам найти именно то, что они ищут.
                    </Text>
                </View>
            </View>

            {/* Body */}
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={0}
            >
                <ScrollView
                    style={s.body}
                    contentContainerStyle={[s.bodyContent, { paddingBottom: 100 }]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Manufacturer */}
                    <View style={s.fieldWrap}>
                        <Text style={s.fieldLabel}>Производитель *</Text>
                        <TextInput
                            style={[s.input, fieldErrors.manufacturer && s.inputError]}
                            placeholder="Например, Yamaha"
                            placeholderTextColor="#9CA3AF"
                            value={manufacturer}
                            onChangeText={(v) => { setManufacturer(v); clearErr('manufacturer'); }}
                        />
                        {fieldErrors.manufacturer ? <Text style={s.fieldErrorText}>{fieldErrors.manufacturer}</Text> : null}
                    </View>

                    {/* Model */}
                    <View style={s.fieldWrap}>
                        <Text style={s.fieldLabel}>Модель *</Text>
                        <TextInput
                            style={[s.input, fieldErrors.model && s.inputError]}
                            placeholder="Например, 242X E-Series"
                            placeholderTextColor="#9CA3AF"
                            value={model}
                            onChangeText={(v) => { setModel(v); clearErr('model'); }}
                        />
                        {fieldErrors.model ? <Text style={s.fieldErrorText}>{fieldErrors.model}</Text> : null}
                    </View>

                    {/* Year */}
                    <View style={[s.fieldWrap, { zIndex: 20 }]}>
                        <Text style={s.fieldLabel}>Год выпуска *</Text>
                        <TouchableOpacity
                            style={[s.selector, fieldErrors.year && s.inputError]}
                            onPress={() => setYearOpen(!yearOpen)}
                            activeOpacity={0.7}
                        >
                            <Text style={year ? s.selectorValue : s.selectorPlaceholder}>
                                {year || 'Выберите год'}
                            </Text>
                            <ChevronDown
                                size={20}
                                color={TEAL}
                                style={{ transform: [{ rotate: yearOpen ? '180deg' : '0deg' }] }}
                            />
                        </TouchableOpacity>

                        {yearOpen && (
                            <View style={s.dropdown}>
                                <ScrollView
                                    nestedScrollEnabled
                                    style={s.dropdownScroll}
                                    showsVerticalScrollIndicator
                                >
                                    {Array.from(
                                        { length: new Date().getFullYear() - 1970 + 1 },
                                        (_, i) => String(new Date().getFullYear() - i),
                                    ).map((y) => {
                                        const active = year === y;
                                        return (
                                            <TouchableOpacity
                                                key={y}
                                                style={[s.dropdownItem, active && s.dropdownItemActive]}
                                                onPress={() => { setYear(y); setYearOpen(false); }}
                                                activeOpacity={0.6}
                                            >
                                                <Text style={[s.dropdownText, active && s.dropdownTextActive]}>
                                                    {y}
                                                </Text>
                                                {active && <Check size={16} color={TEAL} />}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            </View>
                        )}
                        {fieldErrors.year ? <Text style={s.fieldErrorText}>{fieldErrors.year}</Text> : null}
                    </View>

                    {/* Capacity */}
                    <View style={s.fieldWrap}>
                        <Text style={s.fieldLabel}>Вместимость (чел.) *</Text>
                        <TextInput
                            style={[s.input, fieldErrors.capacity && s.inputError]}
                            placeholder="8"
                            placeholderTextColor="#9CA3AF"
                            value={capacity}
                            onChangeText={(v) => { setCapacity(v); clearErr('capacity'); }}
                            keyboardType="number-pad"
                            maxLength={3}
                        />
                        {fieldErrors.capacity ? <Text style={s.fieldErrorText}>{fieldErrors.capacity}</Text> : null}
                    </View>

                    {boatType && isTugboat(boatType.name) && (
                        <>
                            <Text style={s.sectionTitle}>Водные виды спорта</Text>
                            <Text style={s.sectionHint}>Выберите доступные виды</Text>
                            <View style={s.amenitiesGrid}>
                                {WATER_SPORTS_OPTIONS.map((name) => {
                                    const active = waterSports.includes(name);
                                    return (
                                        <TouchableOpacity
                                            key={name}
                                            style={[s.amenityChip, active && s.amenityChipActive]}
                                            onPress={() => toggleWaterSport(name)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[s.amenityLabel, active && s.amenityLabelActive]}>
                                                {name}
                                            </Text>
                                            {active && (
                                                <Check size={14} color="#fff" strokeWidth={2.5} style={{ marginLeft: 2 }} />
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </>
                    )}

                    {/* Amenities */}
                    <Text style={s.sectionTitle}>Удобства</Text>
                    <Text style={s.sectionHint}>Выберите всё, что есть на борту</Text>

                    <View style={s.amenitiesGrid}>
                        {amenitiesOptions.map((name) => {
                            const active = selectedAmenities.includes(name);
                            return (
                                <TouchableOpacity
                                    key={name}
                                    style={[s.amenityChip, active && s.amenityChipActive]}
                                    onPress={() => toggleAmenity(name)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[s.amenityLabel, active && s.amenityLabelActive]}>
                                        {name}
                                    </Text>
                                    {active && (
                                        <Check size={14} color="#fff" strokeWidth={2.5} style={{ marginLeft: 2 }} />
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Footer */}
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

    /* Header */
    headerWrap: { overflow: 'hidden' },
    headerInner: { paddingHorizontal: 20, paddingBottom: 32 },
    backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
    backText: { color: '#fff', fontSize: 16, fontFamily: theme.fonts.medium, marginLeft: 4 },
    title: {
        fontSize: 28, fontFamily: theme.fonts.bold, color: '#fff',
        lineHeight: 36, marginBottom: 12,
    },
    subtitle: {
        fontSize: 14, fontFamily: theme.fonts.regular, color: 'rgba(255,255,255,0.82)',
        lineHeight: 20,
    },

    /* Body */
    body: { flex: 1 },
    bodyContent: { paddingHorizontal: 20, paddingTop: 28 },

    fieldWrap: { marginBottom: 18 },
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
    inputError: { borderColor: '#DC2626', borderWidth: 2, backgroundColor: '#FFFBFB' },
    fieldErrorText: { fontSize: 12, fontFamily: theme.fonts.medium, color: '#DC2626', marginTop: 6 },
    /* Dropdown */
    selector: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
        paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff',
    },
    selectorPlaceholder: {
        fontSize: 16, fontFamily: theme.fonts.regular, color: '#9CA3AF',
    },
    selectorValue: {
        fontSize: 16, fontFamily: theme.fonts.medium, color: '#1B365D',
    },
    dropdown: {
        borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
        marginTop: 4, backgroundColor: '#fff',
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
            android: { elevation: 4 },
        }),
    },
    dropdownScroll: { maxHeight: 220 },
    dropdownItem: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    },
    dropdownItemActive: { backgroundColor: '#F3F4F6' },
    dropdownText: {
        fontSize: 16, fontFamily: theme.fonts.regular, color: '#374151',
    },
    dropdownTextActive: { fontFamily: theme.fonts.semiBold, color: TEAL },

    /* Section */
    sectionTitle: {
        fontSize: 18, fontFamily: theme.fonts.semiBold, color: '#1B365D',
        marginTop: 8, marginBottom: 4,
    },
    sectionHint: {
        fontSize: 13, fontFamily: theme.fonts.regular, color: '#9CA3AF',
        marginBottom: 14,
    },

    /* Amenities */
    amenitiesGrid: {
        flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    },
    amenityChip: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 14, paddingVertical: 10,
        borderRadius: 24, borderWidth: 1.5, borderColor: '#E5E7EB',
        backgroundColor: '#fff', gap: 6,
    },
    amenityChipActive: {
        backgroundColor: TEAL, borderColor: TEAL,
    },
    amenityLabel: {
        fontSize: 13, fontFamily: theme.fonts.medium, color: '#374151',
    },
    amenityLabelActive: { color: '#fff' },

    /* Footer */
    footer: {
        paddingHorizontal: 20, paddingTop: 12,
        borderTopWidth: 1, borderTopColor: '#F3F4F6', backgroundColor: '#fff',
    },
    nextBtn: {
        backgroundColor: TEAL, borderRadius: 12,
        paddingVertical: 16, alignItems: 'center',
    },
    nextBtnDisabled: { opacity: 0.45 },
    nextBtnText: { fontSize: 16, fontFamily: theme.fonts.semiBold, color: '#fff' },
});

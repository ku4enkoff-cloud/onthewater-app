import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ScrollView, Platform, KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronDown, Check, Clock, Plus, Trash2 } from 'lucide-react-native';
import { theme } from '../../shared/theme';

let LinearGradient = null;
try { LinearGradient = require('expo-linear-gradient').LinearGradient; } catch (_) {}

const GRADIENT = ['#0A4D4D', '#0D5C5C', '#1A7A5A'];
const TEAL = '#0D5C5C';
const GOLD = '#E2A83E';

const WEEKDAYS = [
    { key: 'mon', label: 'Пн', full: 'Понедельник' },
    { key: 'tue', label: 'Вт', full: 'Вторник' },
    { key: 'wed', label: 'Ср', full: 'Среда' },
    { key: 'thu', label: 'Чт', full: 'Четверг' },
    { key: 'fri', label: 'Пт', full: 'Пятница' },
    { key: 'sat', label: 'Сб', full: 'Суббота' },
    { key: 'sun', label: 'Вс', full: 'Воскресенье' },
];

const TIME_OPTIONS = [];
for (let h = 0; h < 24; h++) {
    TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:00`);
}

const DURATION_OPTIONS = [
    { value: 30, label: '30 мин' },
    { value: 60, label: '1 час' },
    { value: 120, label: '2 часа' },
    { value: 180, label: '3 часа' },
    { value: 240, label: '4 часа' },
    { value: 300, label: '5 часов' },
];

const TIER_DURATION_OPTIONS = [];
for (let m = 30; m <= 24 * 60; m += 30) {
    const hrs = Math.floor(m / 60);
    const mins = m % 60;
    let label = '';
    if (hrs > 0) label += `${hrs} ч`;
    if (mins > 0) label += ` ${mins} мин`;
    TIER_DURATION_OPTIONS.push({ value: m, label: label.trim() });
}

const DEFAULT_START = '08:00';
const DEFAULT_END = '20:00';

let tierIdCounter = 1;

export default function BoatScheduleScreen({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const boatType = route.params?.boatType;
    const boatInfo = route.params?.boatInfo;
    const boatLocation = route.params?.boatLocation;

    const [workDays, setWorkDays] = useState({
        mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: false,
    });

    const [weekdayStart, setWeekdayStart] = useState(DEFAULT_START);
    const [weekdayEnd, setWeekdayEnd] = useState(DEFAULT_END);
    const [weekendStart, setWeekendStart] = useState('09:00');
    const [weekendEnd, setWeekendEnd] = useState('18:00');

    const [minDuration, setMinDuration] = useState(60);
    const [durationOpen, setDurationOpen] = useState(false);

    const [pricePerHour, setPricePerHour] = useState('');
    const [weekendPrice, setWeekendPrice] = useState('');

    const [priceTiers, setPriceTiers] = useState([]);
    const [tierDurationOpenId, setTierDurationOpenId] = useState(null);

    const [weekdayStartOpen, setWeekdayStartOpen] = useState(false);
    const [weekdayEndOpen, setWeekdayEndOpen] = useState(false);
    const [weekendStartOpen, setWeekendStartOpen] = useState(false);
    const [weekendEndOpen, setWeekendEndOpen] = useState(false);

    const toggleDay = (key) => {
        setWorkDays((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const closeAllDropdowns = () => {
        setWeekdayStartOpen(false); setWeekdayEndOpen(false);
        setWeekendStartOpen(false); setWeekendEndOpen(false);
        setDurationOpen(false); setTierDurationOpenId(null);
    };

    const addTier = () => {
        closeAllDropdowns();
        setPriceTiers((prev) => [...prev, { id: tierIdCounter++, duration: 120, price: '', price_weekend: '' }]);
    };

    const removeTier = (id) => {
        setPriceTiers((prev) => prev.filter((t) => t.id !== id));
    };

    const updateTierDuration = (id, value) => {
        setPriceTiers((prev) => prev.map((t) => (t.id === id ? { ...t, duration: value } : t)));
        setTierDurationOpenId(null);
    };

    const updateTierPrice = (id, value) => {
        setPriceTiers((prev) => prev.map((t) => (t.id === id ? { ...t, price: value } : t)));
    };

    const updateTierPriceWeekend = (id, value) => {
        setPriceTiers((prev) => prev.map((t) => (t.id === id ? { ...t, price_weekend: value } : t)));
    };

    const hasWeekend = workDays.sat || workDays.sun;
    const hasWeekday = workDays.mon || workDays.tue || workDays.wed || workDays.thu || workDays.fri;
    const anyDaySelected = Object.values(workDays).some(Boolean);
    const canContinue = anyDaySelected && pricePerHour.trim();

    const handleNext = () => {
        if (!canContinue) return;
        navigation.navigate('BoatMedia', {
            boatType,
            boatInfo,
            boatLocation,
            boatSchedule: {
                workDays,
                weekdayHours: { start: weekdayStart, end: weekdayEnd },
                weekendHours: { start: weekendStart, end: weekendEnd },
                minDuration,
                pricePerMinDuration: pricePerHour.trim(),
                weekendPrice: weekendPrice.trim() || undefined,
                priceTiers: priceTiers
                    .filter((t) => t.price.trim())
                    .map((t) => ({
                        duration: t.duration,
                        price: t.price.trim(),
                        ...(t.price_weekend != null && String(t.price_weekend).trim() && { price_weekend: String(t.price_weekend).trim() }),
                    })),
            },
        });
    };

    const durationLabel = DURATION_OPTIONS.find((d) => d.value === minDuration)?.label || '';

    const renderTimeDropdown = (value, setValue, isOpen, setIsOpen) => (
        <View style={{ zIndex: isOpen ? 30 : 1 }}>
            <TouchableOpacity
                style={s.timeSelector}
                onPress={() => {
                    closeAllDropdowns();
                    setIsOpen(!isOpen);
                }}
                activeOpacity={0.7}
            >
                <Clock size={16} color={TEAL} />
                <Text style={s.timeSelectorText}>{value}</Text>
                <ChevronDown size={16} color={TEAL} style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }} />
            </TouchableOpacity>
            {isOpen && (
                <View style={s.timeDropdown}>
                    <ScrollView nestedScrollEnabled style={s.timeDropdownScroll} keyboardShouldPersistTaps="handled">
                        {TIME_OPTIONS.map((t) => {
                            const active = t === value;
                            return (
                                <TouchableOpacity
                                    key={t}
                                    style={[s.timeDropdownItem, active && s.timeDropdownItemActive]}
                                    onPress={() => { setValue(t); setIsOpen(false); }}
                                    activeOpacity={0.6}
                                >
                                    <Text style={[s.timeDropdownText, active && s.timeDropdownTextActive]}>{t}</Text>
                                    {active && <Check size={14} color={TEAL} />}
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            )}
        </View>
    );

    return (
        <View style={s.root}>
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
                    <Text style={s.title}>Расписание{'\n'}и стоимость</Text>
                    <Text style={s.subtitle}>
                        Выберите рабочие дни, укажите часы работы и стоимость аренды.
                    </Text>
                </View>
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView
                    style={s.body}
                    contentContainerStyle={[s.bodyContent, { paddingBottom: 110 }]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Working days */}
                    <Text style={s.sectionTitle}>Рабочие дни</Text>
                    <Text style={s.sectionHint}>Выберите дни, когда катер доступен для аренды</Text>
                    <View style={s.daysRow}>
                        {WEEKDAYS.map((day) => {
                            const active = workDays[day.key];
                            const isWeekend = day.key === 'sat' || day.key === 'sun';
                            return (
                                <TouchableOpacity
                                    key={day.key}
                                    style={[s.dayChip, active && s.dayChipActive, isWeekend && active && s.dayChipWeekend]}
                                    onPress={() => toggleDay(day.key)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[s.dayChipText, active && s.dayChipTextActive]}>
                                        {day.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Weekday hours */}
                    {hasWeekday && (
                        <View style={[s.hoursBlock, { zIndex: 20 }]}>
                            <Text style={s.hoursLabel}>Будни (Пн–Пт)</Text>
                            <View style={s.hoursRow}>
                                <View style={{ flex: 1, zIndex: weekdayStartOpen ? 30 : 1 }}>
                                    <Text style={s.hoursSmallLabel}>С</Text>
                                    {renderTimeDropdown(weekdayStart, setWeekdayStart, weekdayStartOpen, setWeekdayStartOpen)}
                                </View>
                                <Text style={s.hoursDash}>—</Text>
                                <View style={{ flex: 1, zIndex: weekdayEndOpen ? 30 : 1 }}>
                                    <Text style={s.hoursSmallLabel}>До</Text>
                                    {renderTimeDropdown(weekdayEnd, setWeekdayEnd, weekdayEndOpen, setWeekdayEndOpen)}
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Weekend hours */}
                    {hasWeekend && (
                        <View style={[s.hoursBlock, { zIndex: 10 }]}>
                            <Text style={s.hoursLabel}>Выходные (Сб–Вс)</Text>
                            <View style={s.hoursRow}>
                                <View style={{ flex: 1, zIndex: weekendStartOpen ? 30 : 1 }}>
                                    <Text style={s.hoursSmallLabel}>С</Text>
                                    {renderTimeDropdown(weekendStart, setWeekendStart, weekendStartOpen, setWeekendStartOpen)}
                                </View>
                                <Text style={s.hoursDash}>—</Text>
                                <View style={{ flex: 1, zIndex: weekendEndOpen ? 30 : 1 }}>
                                    <Text style={s.hoursSmallLabel}>До</Text>
                                    {renderTimeDropdown(weekendEnd, setWeekendEnd, weekendEndOpen, setWeekendEndOpen)}
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Min duration */}
                    <View style={[s.fieldWrap, { zIndex: 5 }]}>
                        <Text style={s.sectionTitle}>Минимальное время аренды</Text>
                        <TouchableOpacity
                            style={s.durationSelector}
                            onPress={() => {
                                closeAllDropdowns();
                                setDurationOpen(!durationOpen);
                            }}
                            activeOpacity={0.7}
                        >
                            <Text style={s.durationText}>{durationLabel}</Text>
                            <ChevronDown size={18} color={TEAL} style={{ transform: [{ rotate: durationOpen ? '180deg' : '0deg' }] }} />
                        </TouchableOpacity>
                        {durationOpen && (
                            <View style={s.durationDropdown}>
                                <ScrollView nestedScrollEnabled style={s.durationDropdownScroll} keyboardShouldPersistTaps="handled">
                                    {DURATION_OPTIONS.map((opt) => {
                                        const active = opt.value === minDuration;
                                        return (
                                            <TouchableOpacity
                                                key={opt.value}
                                                style={[s.durationItem, active && s.durationItemActive]}
                                                onPress={() => { setMinDuration(opt.value); setDurationOpen(false); }}
                                                activeOpacity={0.6}
                                            >
                                                <Text style={[s.durationItemText, active && s.durationItemTextActive]}>{opt.label}</Text>
                                                {active && <Check size={14} color={TEAL} />}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            </View>
                        )}
                    </View>

                    {/* Price */}
                    <View style={s.fieldWrap}>
                        <Text style={s.sectionTitle}>Стоимость аренды</Text>
                        <Text style={s.sectionHint}>Цена за {durationLabel}</Text>
                        <View style={s.priceRow}>
                            <TextInput
                                style={s.priceInput}
                                placeholder="5 000"
                                placeholderTextColor="#9CA3AF"
                                value={pricePerHour}
                                onChangeText={setPricePerHour}
                                keyboardType="number-pad"
                            />
                            <Text style={s.priceSuffix}>₽ / {durationLabel}</Text>
                        </View>
                    </View>

                    {/* Weekend price */}
                    {hasWeekend && (
                        <View style={s.fieldWrap}>
                            <Text style={s.sectionTitle}>Цена в выходные (Сб–Вс)</Text>
                            <Text style={s.sectionHint}>Укажите другую цену за {durationLabel} в субботу и воскресенье. Если не заполнено, используется основная цена.</Text>
                            <View style={s.priceRow}>
                                <TextInput
                                    style={s.priceInput}
                                    placeholder="6 000"
                                    placeholderTextColor="#9CA3AF"
                                    value={weekendPrice}
                                    onChangeText={setWeekendPrice}
                                    keyboardType="number-pad"
                                />
                                <Text style={s.priceSuffix}>₽ / {durationLabel}</Text>
                            </View>
                        </View>
                    )}

                    {/* Custom price tiers */}
                    <View style={s.fieldWrap}>
                        <Text style={s.sectionTitle}>Стоимость за другое время</Text>
                        <Text style={s.sectionHint}>Добавьте индивидуальные цены для разной длительности</Text>

                        {priceTiers.map((tier) => {
                            const tierLabel = TIER_DURATION_OPTIONS.find((d) => d.value === tier.duration)?.label || '';
                            const isOpen = tierDurationOpenId === tier.id;
                            return (
                                <View key={tier.id} style={s.tierCard}>
                                    <View style={s.tierTopRow}>
                                        <TouchableOpacity
                                            style={s.tierDurationBtn}
                                            onPress={() => {
                                                closeAllDropdowns();
                                                setTierDurationOpenId(isOpen ? null : tier.id);
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={s.tierDurationText}>{tierLabel}</Text>
                                            <ChevronDown size={16} color={TEAL} style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }} />
                                        </TouchableOpacity>
                                        <View style={s.tierPriceWrap}>
                                            <TextInput
                                                style={s.tierPriceInput}
                                                placeholder="0"
                                                placeholderTextColor="#9CA3AF"
                                                value={tier.price}
                                                onChangeText={(v) => updateTierPrice(tier.id, v)}
                                                keyboardType="number-pad"
                                            />
                                            <Text style={s.tierPriceCurrency}>₽</Text>
                                        </View>
                                        <TouchableOpacity
                                            style={s.tierDeleteBtn}
                                            onPress={() => removeTier(tier.id)}
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        >
                                            <Trash2 size={18} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>
                                    {hasWeekend && (
                                        <View style={s.tierWeekendRow}>
                                            <Text style={s.tierWeekendLabel}>Выходные (Сб–Вс)</Text>
                                            <View style={s.tierPriceWrap}>
                                                <TextInput
                                                    style={s.tierPriceInput}
                                                    placeholder="0"
                                                    placeholderTextColor="#9CA3AF"
                                                    value={tier.price_weekend ?? ''}
                                                    onChangeText={(v) => updateTierPriceWeekend(tier.id, v)}
                                                    keyboardType="number-pad"
                                                />
                                                <Text style={s.tierPriceCurrency}>₽</Text>
                                            </View>
                                        </View>
                                    )}
                                    {isOpen && (
                                        <View style={s.tierDropdown}>
                                            <ScrollView nestedScrollEnabled style={s.tierDropdownScroll} keyboardShouldPersistTaps="handled">
                                                {TIER_DURATION_OPTIONS.map((opt) => {
                                                    const active = opt.value === tier.duration;
                                                    return (
                                                        <TouchableOpacity
                                                            key={opt.value}
                                                            style={[s.tierDropdownItem, active && s.tierDropdownItemActive]}
                                                            onPress={() => updateTierDuration(tier.id, opt.value)}
                                                            activeOpacity={0.6}
                                                        >
                                                            <Text style={[s.tierDropdownText, active && s.tierDropdownTextActive]}>{opt.label}</Text>
                                                            {active && <Check size={14} color={TEAL} />}
                                                        </TouchableOpacity>
                                                    );
                                                })}
                                            </ScrollView>
                                        </View>
                                    )}
                                </View>
                            );
                        })}

                        <TouchableOpacity style={s.addTierBtn} onPress={addTier} activeOpacity={0.7}>
                            <Plus size={18} color={TEAL} />
                            <Text style={s.addTierText}>Добавить стоимость</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

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

    sectionTitle: { fontSize: 17, fontFamily: theme.fonts.semiBold, color: '#1B365D', marginBottom: 4 },
    sectionHint: { fontSize: 13, fontFamily: theme.fonts.regular, color: '#9CA3AF', marginBottom: 12 },

    /* Days row */
    daysRow: { flexDirection: 'row', gap: 8, marginBottom: 22, flexWrap: 'wrap' },
    dayChip: {
        width: 42, height: 42, borderRadius: 21,
        borderWidth: 1.5, borderColor: '#E5E7EB',
        alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff',
    },
    dayChipActive: { backgroundColor: TEAL, borderColor: TEAL },
    dayChipWeekend: { backgroundColor: GOLD, borderColor: GOLD },
    dayChipText: { fontSize: 13, fontFamily: theme.fonts.semiBold, color: '#374151' },
    dayChipTextActive: { color: '#fff' },

    /* Hours block */
    hoursBlock: { marginBottom: 22 },
    hoursLabel: { fontSize: 15, fontFamily: theme.fonts.semiBold, color: '#1B365D', marginBottom: 8 },
    hoursRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
    hoursSmallLabel: { fontSize: 12, fontFamily: theme.fonts.regular, color: '#9CA3AF', marginBottom: 4 },
    hoursDash: { fontSize: 18, color: '#9CA3AF', marginBottom: 12, fontFamily: theme.fonts.regular },

    /* Time selector */
    timeSelector: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
        paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#fff',
    },
    timeSelectorText: { flex: 1, fontSize: 15, fontFamily: theme.fonts.medium, color: '#1B365D' },
    timeDropdown: {
        position: 'absolute', top: 50, left: 0, right: 0,
        borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
        backgroundColor: '#fff',
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
            android: { elevation: 6 },
        }),
    },
    timeDropdownScroll: { maxHeight: 180 },
    timeDropdownItem: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 14, paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    },
    timeDropdownItemActive: { backgroundColor: '#F0F9F8' },
    timeDropdownText: { fontSize: 15, fontFamily: theme.fonts.regular, color: '#374151' },
    timeDropdownTextActive: { fontFamily: theme.fonts.semiBold, color: TEAL },

    /* Duration */
    fieldWrap: { marginBottom: 22 },
    durationSelector: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
        paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', marginTop: 8,
    },
    durationText: { fontSize: 16, fontFamily: theme.fonts.medium, color: '#1B365D' },
    durationDropdown: {
        borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
        marginTop: 4, backgroundColor: '#fff',
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
            android: { elevation: 4 },
        }),
    },
    durationDropdownScroll: { maxHeight: 220 },
    durationItem: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    },
    durationItemActive: { backgroundColor: '#F0F9F8' },
    durationItemText: { fontSize: 15, fontFamily: theme.fonts.regular, color: '#374151' },
    durationItemTextActive: { fontFamily: theme.fonts.semiBold, color: TEAL },

    /* Price */
    priceRow: {
        flexDirection: 'row', alignItems: 'center',
        borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
        backgroundColor: '#fff', paddingHorizontal: 16, marginTop: 4,
    },
    priceInput: {
        flex: 1, fontSize: 22, fontFamily: theme.fonts.semiBold, color: '#1B365D',
        paddingVertical: 14,
    },
    priceSuffix: { fontSize: 16, fontFamily: theme.fonts.medium, color: '#9CA3AF', marginLeft: 8 },

    /* Custom tiers */
    tierCard: {
        backgroundColor: '#F9FAFB', borderRadius: 12,
        padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB',
    },
    tierTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    tierDurationBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB',
        paddingHorizontal: 12, paddingVertical: 10,
    },
    tierDurationText: { fontSize: 14, fontFamily: theme.fonts.medium, color: '#1B365D' },
    tierPriceWrap: {
        flex: 1, flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB',
        paddingHorizontal: 12,
    },
    tierPriceInput: {
        flex: 1, fontSize: 16, fontFamily: theme.fonts.semiBold, color: '#1B365D',
        paddingVertical: 10,
    },
    tierPriceCurrency: { fontSize: 14, fontFamily: theme.fonts.medium, color: '#9CA3AF', marginLeft: 4 },
    tierDeleteBtn: { padding: 6 },
    tierWeekendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        gap: 10,
    },
    tierWeekendLabel: { fontSize: 13, fontFamily: theme.fonts.medium, color: '#6B7280', minWidth: 100 },
    tierDropdown: {
        marginTop: 8, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
        backgroundColor: '#fff',
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
            android: { elevation: 3 },
        }),
    },
    tierDropdownScroll: { maxHeight: 200 },
    tierDropdownItem: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 14, paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    },
    tierDropdownItemActive: { backgroundColor: '#F0F9F8' },
    tierDropdownText: { fontSize: 14, fontFamily: theme.fonts.regular, color: '#374151' },
    tierDropdownTextActive: { fontFamily: theme.fonts.semiBold, color: TEAL },
    addTierBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        borderWidth: 1.5, borderColor: TEAL, borderRadius: 12, borderStyle: 'dashed',
        paddingVertical: 14, marginTop: 4,
    },
    addTierText: { fontSize: 15, fontFamily: theme.fonts.semiBold, color: TEAL },

    /* Footer */
    footer: {
        paddingHorizontal: 20, paddingTop: 12,
        borderTopWidth: 1, borderTopColor: '#F3F4F6', backgroundColor: '#fff',
    },
    nextBtn: { backgroundColor: TEAL, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
    nextBtnDisabled: { opacity: 0.45 },
    nextBtnText: { fontSize: 16, fontFamily: theme.fonts.semiBold, color: '#fff' },
});

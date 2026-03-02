import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ScrollView, Alert, Image, ActivityIndicator, Platform, KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import {
    ChevronLeft, ChevronDown, FileText, AlignLeft, ShieldCheck, Camera, X, Trash2,
    Ship, MapPin, Clock, DollarSign, Users, Wrench, ImageIcon, Check, Plus,
} from 'lucide-react-native';
import { theme } from '../../shared/theme';
import { api } from '../../shared/infrastructure/api';
import { getPhotoUrl } from '../../shared/infrastructure/config';

let LinearGradient = null;
try { LinearGradient = require('expo-linear-gradient').LinearGradient; } catch (_) {}

const GRADIENT = ['#0A4D4D', '#0D5C5C', '#1A7A5A'];
const TEAL = '#0D5C5C';

const BOAT_TYPES = [
    { id: '1', name: 'Катер' }, { id: '2', name: 'Яхта' }, { id: '3', name: 'Гидроцикл' },
    { id: '4', name: 'Парусная яхта' }, { id: '5', name: 'Катамаран' }, { id: '6', name: 'Буксировщик' },
];

const AMENITIES_OPTIONS = [
    'Туалет', 'Кондиционер', 'Аудиосистема', 'Bluetooth', 'Спасательные жилеты',
    'Трап для купания', 'Холодильник', 'Якорь', 'Климат-контроль', 'Розетки 220В',
];

const WEEKDAYS = [
    { key: 'mon', label: 'Пн' }, { key: 'tue', label: 'Вт' }, { key: 'wed', label: 'Ср' },
    { key: 'thu', label: 'Чт' }, { key: 'fri', label: 'Пт' }, { key: 'sat', label: 'Сб' }, { key: 'sun', label: 'Вс' },
];
const TIME_OPTIONS = [];
for (let h = 0; h < 24; h++) TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:00`);
const DURATION_OPTIONS = [
    { value: 30, label: '30 мин' }, { value: 60, label: '1 час' }, { value: 120, label: '2 часа' },
    { value: 180, label: '3 часа' }, { value: 240, label: '4 часа' }, { value: 300, label: '5 часов' },
];
const TIER_DURATION_OPTIONS = [];
for (let m = 30; m <= 24 * 60; m += 30) {
    const hrs = Math.floor(m / 60);
    const mins = m % 60;
    TIER_DURATION_OPTIONS.push({ value: m, label: hrs > 0 ? (mins > 0 ? `${hrs} ч ${mins} мин` : `${hrs} ч`) : `${mins} мин` });
}
const DEFAULT_START = '08:00';
const DEFAULT_END = '20:00';
let tierIdCounter = 1;

const photoUrl = (src) => getPhotoUrl(src);

export default function EditBoatScreen({ route, navigation }) {
    const insets = useSafeAreaInsets();
    const { boatId } = route.params || {};

    const [fetching, setFetching] = useState(true);
    const [loading, setLoading] = useState(false);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [rules, setRules] = useState('');
    const [typeId, setTypeId] = useState('1');
    const [manufacturer, setManufacturer] = useState('');
    const [model, setModel] = useState('');
    const [year, setYear] = useState('');
    const [capacity, setCapacity] = useState('');
    const [lengthM, setLengthM] = useState('');
    const [locationCity, setLocationCity] = useState('');
    const [locationAddress, setLocationAddress] = useState('');
    const [locationCountry, setLocationCountry] = useState('');
    const [locationYachtClub, setLocationYachtClub] = useState('');
    const [pricePerHour, setPricePerHour] = useState('');
    const [weekendPrice, setWeekendPrice] = useState('');
    const [amenities, setAmenities] = useState([]);
    const [photos, setPhotos] = useState([]);

    const [workDays, setWorkDays] = useState({ mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: false });
    const [weekdayStart, setWeekdayStart] = useState(DEFAULT_START);
    const [weekdayEnd, setWeekdayEnd] = useState(DEFAULT_END);
    const [weekendStart, setWeekendStart] = useState('09:00');
    const [weekendEnd, setWeekendEnd] = useState('18:00');
    const [minDuration, setMinDuration] = useState(60);
    const [priceTiers, setPriceTiers] = useState([]);
    const [durationOpen, setDurationOpen] = useState(false);
    const [weekdayStartOpen, setWeekdayStartOpen] = useState(false);
    const [weekdayEndOpen, setWeekdayEndOpen] = useState(false);
    const [weekendStartOpen, setWeekendStartOpen] = useState(false);
    const [weekendEndOpen, setWeekendEndOpen] = useState(false);
    const [tierDurationOpenId, setTierDurationOpenId] = useState(null);

    useEffect(() => {
        if (boatId) loadBoat();
        else setFetching(false);
    }, [boatId]);

    const loadBoat = async () => {
        try {
            const res = await api.get(`/boats/${boatId}`);
            const b = res.data;
            setTitle(b.title || '');
            setDescription(b.description || '');
            setRules(b.rules || '');
            setTypeId(String(b.type_id || '1'));
            setManufacturer(b.manufacturer || '');
            setModel(b.model || '');
            setYear(b.year ? String(b.year) : '');
            setCapacity(b.capacity ? String(b.capacity) : '');
            setLengthM(b.length_m ? String(b.length_m) : '');
            setLocationCity(b.location_city || '');
            setLocationAddress(b.location_address || '');
            setLocationCountry(b.location_country || '');
            setLocationYachtClub(b.location_yacht_club || '');
            setPricePerHour(b.price_per_hour ? String(b.price_per_hour) : '');
            setWeekendPrice(b.price_weekend ? String(b.price_weekend) : '');

            const wd = b.schedule_work_days;
            if (wd && typeof wd === 'object') setWorkDays({ mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: false, ...wd });
            const wh = b.schedule_weekday_hours;
            if (wh && typeof wh === 'object') {
                if (wh.start) setWeekdayStart(wh.start);
                if (wh.end) setWeekdayEnd(wh.end);
            }
            const weh = b.schedule_weekend_hours;
            if (weh && typeof weh === 'object') {
                if (weh.start) setWeekendStart(weh.start);
                if (weh.end) setWeekendEnd(weh.end);
            }
            if (b.schedule_min_duration) setMinDuration(Number(b.schedule_min_duration) || 60);
            let tiers = b.price_tiers;
            if (typeof tiers === 'string') try { tiers = JSON.parse(tiers); } catch (_) { tiers = []; }
            if (Array.isArray(tiers) && tiers.length > 0) {
                setPriceTiers(tiers.map((t) => ({
                    id: tierIdCounter++,
                    duration: t.duration || 120,
                    price: String(t.price || ''),
                    price_weekend: String(t.price_weekend ?? ''),
                })));
            }

            let am = b.amenities;
            if (typeof am === 'string') try { am = JSON.parse(am); } catch (_) { am = []; }
            setAmenities(Array.isArray(am) ? am : []);

            let ph = b.photos;
            if (typeof ph === 'string') try { ph = JSON.parse(ph); } catch (_) { ph = []; }
            setPhotos(Array.isArray(ph) ? ph : []);
        } catch (_) {
            Alert.alert('Ошибка', 'Не удалось загрузить катер');
            navigation.goBack();
        } finally {
            setFetching(false);
        }
    };

    const pickImages = async () => {
        if (photos.length >= 10) { Alert.alert('Лимит', 'Максимум 10 фотографий'); return; }
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Доступ к фото', 'Разрешите доступ к галерее в настройках устройства.');
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                quality: 0.8,
                allowsMultipleSelection: true,
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
                const remaining = 10 - photos.length;
                setPhotos((prev) => [...prev, ...result.assets.slice(0, remaining).map((a) => a.uri)]);
            }
        } catch (e) {
            Alert.alert('Ошибка', e?.message || 'Не удалось выбрать изображения');
        }
    };

    const removeImage = (index) => setPhotos((prev) => prev.filter((_, i) => i !== index));

    const toggleDay = (key) => setWorkDays((prev) => ({ ...prev, [key]: !prev[key] }));
    const closeAllDropdowns = () => {
        setWeekdayStartOpen(false); setWeekdayEndOpen(false);
        setWeekendStartOpen(false); setWeekendEndOpen(false);
        setDurationOpen(false); setTierDurationOpenId(null);
    };
    const addTier = () => {
        closeAllDropdowns();
        setPriceTiers((prev) => [...prev, { id: tierIdCounter++, duration: 120, price: '', price_weekend: '' }]);
    };
    const removeTier = (id) => setPriceTiers((prev) => prev.filter((t) => t.id !== id));
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
    const renderTimeDropdown = (value, setValue, isOpen, setIsOpen) => (
        <View style={{ zIndex: isOpen ? 30 : 1 }}>
            <TouchableOpacity
                style={s.timeSelector}
                onPress={() => { closeAllDropdowns(); setIsOpen(!isOpen); }}
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

    const toggleAmenity = (name) => {
        setAmenities((prev) =>
            prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name],
        );
    };

    const handleSubmit = async () => {
        if (!title.trim() || !description.trim()) {
            Alert.alert('Ошибка', 'Заполните название и описание');
            return;
        }
        if (photos.length === 0) {
            Alert.alert('Внимание', 'Добавьте хотя бы одно фото');
            return;
        }

        setLoading(true);
        try {
            const payload = new FormData();
            payload.append('title', title.trim());
            payload.append('description', description.trim());
            payload.append('type_id', typeId);
            payload.append('manufacturer', manufacturer);
            payload.append('model', model);
            payload.append('year', year);
            payload.append('length_m', lengthM);
            payload.append('capacity', capacity);
            payload.append('location_city', locationCity);
            payload.append('location_address', locationAddress);
            payload.append('location_country', locationCountry);
            payload.append('location_yacht_club', locationYachtClub);
            payload.append('price_per_hour', pricePerHour);
            payload.append('price_per_day', '');
            payload.append('price_weekend', weekendPrice.trim());
            payload.append('schedule_work_days', JSON.stringify(workDays));
            payload.append('schedule_weekday_hours', JSON.stringify({ start: weekdayStart, end: weekdayEnd }));
            payload.append('schedule_weekend_hours', JSON.stringify({ start: weekendStart, end: weekendEnd }));
            payload.append('schedule_min_duration', String(minDuration));
            payload.append('price_tiers', JSON.stringify(
                priceTiers.filter((t) => t.price.trim()).map((t) => ({
                    duration: t.duration,
                    price: t.price.trim(),
                    ...(t.price_weekend != null && String(t.price_weekend).trim() && { price_weekend: String(t.price_weekend).trim() }),
                })),
            ));
            payload.append('captain_included', '0');
            payload.append('has_captain_option', '0');
            payload.append('rules', rules.trim());
            payload.append('cancellation_policy', '');
            payload.append('amenities', JSON.stringify(amenities));

            const isLocalUri = (p) => typeof p === 'string' && (p.startsWith('file://') || p.startsWith('content://'));
            const existingUrls = photos.filter((p) => !isLocalUri(p));
            const newFiles = photos.filter(isLocalUri);
            payload.append('photo_urls', JSON.stringify(existingUrls));
            newFiles.forEach((uri, i) => {
                payload.append('photos', { uri, type: 'image/jpeg', name: `photo_${i}.jpg` });
            });

            await api.patch(`/boats/${boatId}`, payload, { timeout: 30000 });
            Alert.alert('Готово', 'Изменения сохранены');
            navigation.goBack();
        } catch (error) {
            if (__DEV__ && error.response) {
                console.warn('Save boat error', error.response?.status, error.response?.data);
            }
            const d = error.response?.data;
            let msg = d?.message || d?.error;
            if (!msg) {
                if (error.code === 'ECONNABORTED') msg = 'Превышено время ожидания. Проверьте интернет.';
                else if (!error.response && (error.code === 'ERR_NETWORK' || error.message === 'Network Error')) {
                    msg = 'Нет связи с сервером. Проверьте интернет и доступность сервера (в .env — EXPO_PUBLIC_API_URL).';
                } else msg = error.message || 'Не удалось сохранить';
            }
            Alert.alert('Ошибка', String(msg));
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Удаление катера',
            'Вы уверены, что хотите удалить этот катер? Это действие нельзя отменить.',
            [
                { text: 'Отмена', style: 'cancel' },
                {
                    text: 'Удалить', style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.delete(`/boats/${boatId}`);
                            Alert.alert('Готово', 'Катер удалён');
                            navigation.goBack();
                        } catch (e) {
                            Alert.alert('Ошибка', e.response?.data?.error || 'Не удалось удалить катер');
                        }
                    },
                },
            ],
        );
    };

    if (fetching) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
                <ActivityIndicator size="large" color={TEAL} />
            </View>
        );
    }

    const SectionIcon = ({ icon: Icon, label }) => (
        <View style={s.sectionHeader}>
            <Icon size={18} color={TEAL} />
            <Text style={s.sectionTitle}>{label}</Text>
        </View>
    );

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
                    <Text style={s.title}>Редактирование{'\n'}катера</Text>
                    <Text style={s.subtitle}>Измените любые параметры вашего объявления</Text>
                </View>
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView
                    style={s.body}
                    contentContainerStyle={[s.bodyContent, { paddingBottom: 130 }]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Title */}
                    <SectionIcon icon={FileText} label="Название объявления *" />
                    <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder="Название" placeholderTextColor="#9CA3AF" maxLength={100} />

                    {/* Description */}
                    <SectionIcon icon={AlignLeft} label="Описание *" />
                    <TextInput style={[s.input, s.textArea]} value={description} onChangeText={setDescription} placeholder="Описание катера" placeholderTextColor="#9CA3AF" multiline textAlignVertical="top" maxLength={2000} />

                    {/* Type */}
                    <SectionIcon icon={Ship} label="Тип судна" />
                    <View style={s.chipRow}>
                        {BOAT_TYPES.map((t) => {
                            const active = typeId === t.id;
                            return (
                                <TouchableOpacity key={t.id} style={[s.chip, active && s.chipActive]} onPress={() => setTypeId(t.id)} activeOpacity={0.7}>
                                    <Text style={[s.chipText, active && s.chipTextActive]}>{t.name}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Manufacturer / Model / Year */}
                    <SectionIcon icon={Wrench} label="Характеристики" />
                    <View style={s.row}>
                        <View style={{ flex: 1 }}>
                            <Text style={s.smallLabel}>Производитель</Text>
                            <TextInput style={s.input} value={manufacturer} onChangeText={setManufacturer} placeholder="Yamaha" placeholderTextColor="#9CA3AF" />
                        </View>
                        <View style={{ width: 10 }} />
                        <View style={{ flex: 1 }}>
                            <Text style={s.smallLabel}>Модель</Text>
                            <TextInput style={s.input} value={model} onChangeText={setModel} placeholder="242X" placeholderTextColor="#9CA3AF" />
                        </View>
                    </View>
                    <View style={s.row}>
                        <View style={{ flex: 1 }}>
                            <Text style={s.smallLabel}>Год выпуска</Text>
                            <TextInput style={s.input} value={year} onChangeText={setYear} placeholder="2022" placeholderTextColor="#9CA3AF" keyboardType="number-pad" />
                        </View>
                        <View style={{ width: 10 }} />
                        <View style={{ flex: 1 }}>
                            <Text style={s.smallLabel}>Вместимость</Text>
                            <TextInput style={s.input} value={capacity} onChangeText={setCapacity} placeholder="8" placeholderTextColor="#9CA3AF" keyboardType="number-pad" />
                        </View>
                        <View style={{ width: 10 }} />
                        <View style={{ flex: 1 }}>
                            <Text style={s.smallLabel}>Длина (м)</Text>
                            <TextInput style={s.input} value={lengthM} onChangeText={setLengthM} placeholder="7.5" placeholderTextColor="#9CA3AF" keyboardType="decimal-pad" />
                        </View>
                    </View>

                    {/* Location */}
                    <SectionIcon icon={MapPin} label="Расположение" />
                    <View style={s.row}>
                        <View style={{ flex: 1 }}>
                            <Text style={s.smallLabel}>Страна</Text>
                            <TextInput style={s.input} value={locationCountry} onChangeText={setLocationCountry} placeholder="Россия" placeholderTextColor="#9CA3AF" />
                        </View>
                        <View style={{ width: 10 }} />
                        <View style={{ flex: 1 }}>
                            <Text style={s.smallLabel}>Город</Text>
                            <TextInput style={s.input} value={locationCity} onChangeText={setLocationCity} placeholder="Москва" placeholderTextColor="#9CA3AF" />
                        </View>
                    </View>
                    <Text style={s.smallLabel}>Адрес</Text>
                    <TextInput style={s.input} value={locationAddress} onChangeText={setLocationAddress} placeholder="Адрес причала" placeholderTextColor="#9CA3AF" />
                    <Text style={s.smallLabel}>Яхт-клуб</Text>
                    <TextInput style={s.input} value={locationYachtClub} onChangeText={setLocationYachtClub} placeholder="Название яхт-клуба (необязательно)" placeholderTextColor="#9CA3AF" />

                    {/* Schedule & Price (same as add boat) */}
                    <SectionIcon icon={Clock} label="Рабочие дни" />
                    <Text style={s.sectionHint}>Дни, когда катер доступен для аренды</Text>
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
                                    <Text style={[s.dayChipText, active && s.dayChipTextActive]}>{day.label}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {(workDays.mon || workDays.tue || workDays.wed || workDays.thu || workDays.fri) && (
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
                    {(workDays.sat || workDays.sun) && (
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

                    <View style={[s.fieldWrap, { zIndex: 5 }]}>
                        <Text style={s.sectionTitle}>Минимальное время аренды</Text>
                        <TouchableOpacity
                            style={s.durationSelector}
                            onPress={() => { closeAllDropdowns(); setDurationOpen(!durationOpen); }}
                            activeOpacity={0.7}
                        >
                            <Text style={s.durationText}>{DURATION_OPTIONS.find((d) => d.value === minDuration)?.label || '1 час'}</Text>
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

                    <SectionIcon icon={DollarSign} label="Стоимость аренды" />
                    <Text style={s.sectionHint}>Цена за {DURATION_OPTIONS.find((d) => d.value === minDuration)?.label || '1 час'}</Text>
                    <View style={s.editPriceRow}>
                        <TextInput
                            style={s.editPriceInput}
                            value={pricePerHour}
                            onChangeText={setPricePerHour}
                            placeholder="5 000"
                            placeholderTextColor="#9CA3AF"
                            keyboardType="number-pad"
                        />
                        <Text style={s.editPriceSuffix}>₽ / {DURATION_OPTIONS.find((d) => d.value === minDuration)?.label || '1 час'}</Text>
                    </View>

                    {(workDays.sat || workDays.sun) && (
                        <>
                            <Text style={[s.sectionTitle, { marginTop: 16 }]}>Цена в выходные (Сб–Вс)</Text>
                            <Text style={s.sectionHint}>Другая цена за {DURATION_OPTIONS.find((d) => d.value === minDuration)?.label || '1 час'} в субботу и воскресенье</Text>
                            <View style={s.editPriceRow}>
                                <TextInput
                                    style={s.editPriceInput}
                                    value={weekendPrice}
                                    onChangeText={setWeekendPrice}
                                    placeholder="6 000"
                                    placeholderTextColor="#9CA3AF"
                                    keyboardType="number-pad"
                                />
                                <Text style={s.editPriceSuffix}>₽ / {DURATION_OPTIONS.find((d) => d.value === minDuration)?.label || '1 час'}</Text>
                            </View>
                        </>
                    )}

                    <Text style={[s.sectionTitle, { marginTop: 16 }]}>Стоимость за другое время</Text>
                    <Text style={s.sectionHint}>Добавьте цены для разной длительности</Text>
                    {priceTiers.map((tier) => {
                        const tierLabel = TIER_DURATION_OPTIONS.find((d) => d.value === tier.duration)?.label || '';
                        const isOpen = tierDurationOpenId === tier.id;
                        return (
                            <View key={tier.id} style={s.tierCard}>
                                <View style={s.tierTopRow}>
                                    <TouchableOpacity
                                        style={s.tierDurationBtn}
                                        onPress={() => { closeAllDropdowns(); setTierDurationOpenId(isOpen ? null : tier.id); }}
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
                                    <TouchableOpacity style={s.tierDeleteBtn} onPress={() => removeTier(tier.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                        <Trash2 size={18} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                                {(workDays.sat || workDays.sun) && (
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
                                            {TIER_DURATION_OPTIONS.map((opt) => (
                                                <TouchableOpacity
                                                    key={opt.value}
                                                    style={[s.tierDropdownItem, opt.value === tier.duration && s.tierDropdownItemActive]}
                                                    onPress={() => updateTierDuration(tier.id, opt.value)}
                                                    activeOpacity={0.6}
                                                >
                                                    <Text style={[s.tierDropdownText, opt.value === tier.duration && s.tierDropdownTextActive]}>{opt.label}</Text>
                                                    {opt.value === tier.duration && <Check size={14} color={TEAL} />}
                                                </TouchableOpacity>
                                            ))}
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

                    {/* Amenities */}
                    <SectionIcon icon={Users} label="Удобства" />
                    <View style={s.chipRow}>
                        {AMENITIES_OPTIONS.map((name) => {
                            const active = amenities.includes(name);
                            return (
                                <TouchableOpacity key={name} style={[s.chip, active && s.chipActive]} onPress={() => toggleAmenity(name)} activeOpacity={0.7}>
                                    <Text style={[s.chipText, active && s.chipTextActive]}>{name}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Rules */}
                    <SectionIcon icon={ShieldCheck} label="Правила поведения" />
                    <TextInput style={[s.input, s.textArea]} value={rules} onChangeText={setRules} placeholder="Правила и ограничения" placeholderTextColor="#9CA3AF" multiline textAlignVertical="top" maxLength={1000} />

                    {/* Photos */}
                    <View style={s.sectionHeader}>
                        <ImageIcon size={18} color={TEAL} />
                        <Text style={s.sectionTitle}>Фотографии</Text>
                        <Text style={s.counter}>{photos.length}/10</Text>
                    </View>
                    <View style={s.mediaGrid}>
                        {photos.map((uri, index) => (
                            <View key={`p-${index}`} style={s.mediaCard}>
                                <Image source={{ uri: photoUrl(uri) }} style={s.mediaImage} />
                                {index === 0 && (
                                    <View style={s.mainBadge}><Text style={s.mainBadgeText}>Главное</Text></View>
                                )}
                                <TouchableOpacity style={s.removeBtn} onPress={() => removeImage(index)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                                    <X size={14} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        ))}
                        {photos.length < 10 && (
                            <TouchableOpacity style={s.addCard} onPress={pickImages} activeOpacity={0.7}>
                                <Camera size={28} color="#9CA3AF" />
                                <Text style={s.addCardText}>Добавить</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Delete */}
                    <TouchableOpacity style={s.deleteBtn} onPress={handleDelete} activeOpacity={0.6}>
                        <Trash2 size={18} color="#EF4444" />
                        <Text style={s.deleteBtnText}>Удалить катер</Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Footer */}
            <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                <TouchableOpacity
                    style={[s.submitBtn, loading && s.submitBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={loading}
                    activeOpacity={0.85}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <Text style={s.submitBtnText}>Сохранить изменения</Text>
                    )}
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

    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 20 },
    sectionTitle: { fontSize: 16, fontFamily: theme.fonts.semiBold, color: '#1B365D', flex: 1 },
    sectionHint: { fontSize: 13, fontFamily: theme.fonts.regular, color: '#9CA3AF', marginBottom: 12 },
    counter: { fontSize: 14, fontFamily: theme.fonts.semiBold, color: TEAL },

    daysRow: { flexDirection: 'row', gap: 8, marginBottom: 22, flexWrap: 'wrap' },
    dayChip: {
        width: 42, height: 42, borderRadius: 21, borderWidth: 1.5, borderColor: '#E5E7EB',
        alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff',
    },
    dayChipActive: { backgroundColor: TEAL, borderColor: TEAL },
    dayChipWeekend: { backgroundColor: '#E2A83E', borderColor: '#E2A83E' },
    dayChipText: { fontSize: 13, fontFamily: theme.fonts.semiBold, color: '#374151' },
    dayChipTextActive: { color: '#fff' },

    hoursBlock: { marginBottom: 22 },
    hoursLabel: { fontSize: 15, fontFamily: theme.fonts.semiBold, color: '#1B365D', marginBottom: 8 },
    hoursRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
    hoursSmallLabel: { fontSize: 12, fontFamily: theme.fonts.regular, color: '#9CA3AF', marginBottom: 4 },
    hoursDash: { fontSize: 18, color: '#9CA3AF', marginBottom: 12, fontFamily: theme.fonts.regular },
    timeSelector: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
        paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#fff',
    },
    timeSelectorText: { flex: 1, fontSize: 15, fontFamily: theme.fonts.medium, color: '#1B365D' },
    timeDropdown: {
        position: 'absolute', top: 50, left: 0, right: 0,
        borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, backgroundColor: '#fff',
        ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 }, android: { elevation: 6 } }),
    },
    timeDropdownScroll: { maxHeight: 180 },
    timeDropdownItem: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    },
    timeDropdownItemActive: { backgroundColor: '#F0F9F8' },
    timeDropdownText: { fontSize: 15, fontFamily: theme.fonts.regular, color: '#374151' },
    timeDropdownTextActive: { fontFamily: theme.fonts.semiBold, color: TEAL },

    fieldWrap: { marginBottom: 22 },
    durationSelector: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
        paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', marginTop: 8,
    },
    durationText: { fontSize: 16, fontFamily: theme.fonts.medium, color: '#1B365D' },
    durationDropdown: {
        borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, marginTop: 4, backgroundColor: '#fff',
        ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 }, android: { elevation: 4 } }),
    },
    durationDropdownScroll: { maxHeight: 220 },
    durationItem: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    },
    durationItemActive: { backgroundColor: '#F0F9F8' },
    durationItemText: { fontSize: 15, fontFamily: theme.fonts.regular, color: '#374151' },
    durationItemTextActive: { fontFamily: theme.fonts.semiBold, color: TEAL },

    editPriceRow: {
        flexDirection: 'row', alignItems: 'center',
        borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
        backgroundColor: '#fff', paddingHorizontal: 16, marginTop: 4,
    },
    editPriceInput: { flex: 1, fontSize: 22, fontFamily: theme.fonts.semiBold, color: '#1B365D', paddingVertical: 14 },
    editPriceSuffix: { fontSize: 16, fontFamily: theme.fonts.medium, color: '#9CA3AF', marginLeft: 8 },

    tierCard: {
        backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, marginBottom: 10,
        borderWidth: 1, borderColor: '#E5E7EB',
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
        backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 12,
    },
    tierPriceInput: { flex: 1, fontSize: 16, fontFamily: theme.fonts.semiBold, color: '#1B365D', paddingVertical: 10 },
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
        marginTop: 8, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, backgroundColor: '#fff',
        ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 }, android: { elevation: 3 } }),
    },
    tierDropdownScroll: { maxHeight: 200 },
    tierDropdownItem: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
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

    smallLabel: { fontSize: 12, fontFamily: theme.fonts.regular, color: '#9CA3AF', marginBottom: 4, marginTop: 8 },

    input: {
        borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
        paddingHorizontal: 16, paddingVertical: 12,
        fontSize: 15, fontFamily: theme.fonts.regular, color: '#1B365D', backgroundColor: '#fff',
        marginBottom: 4,
    },
    textArea: { minHeight: 100, paddingTop: 12 },

    row: { flexDirection: 'row', marginBottom: 4 },

    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    chip: {
        paddingHorizontal: 14, paddingVertical: 9,
        borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff',
    },
    chipActive: { borderColor: TEAL, backgroundColor: '#F0F9F8' },
    chipText: { fontSize: 13, fontFamily: theme.fonts.medium, color: '#374151' },
    chipTextActive: { color: TEAL, fontFamily: theme.fonts.semiBold },

    priceRow: {
        flexDirection: 'row', alignItems: 'center',
        borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
        backgroundColor: '#fff', paddingHorizontal: 16, marginBottom: 4,
    },
    priceInput: { flex: 1, fontSize: 20, fontFamily: theme.fonts.semiBold, color: '#1B365D', paddingVertical: 12 },
    priceSuffix: { fontSize: 15, fontFamily: theme.fonts.medium, color: '#9CA3AF', marginLeft: 8 },

    mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
    mediaCard: {
        width: '47.5%', aspectRatio: 4 / 3, borderRadius: 12, overflow: 'hidden', backgroundColor: '#F3F4F6',
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
    addCard: {
        width: '47.5%', aspectRatio: 4 / 3, borderRadius: 12,
        borderWidth: 1.5, borderColor: '#E5E7EB', borderStyle: 'dashed',
        alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAFA',
    },
    addCardText: { fontSize: 13, fontFamily: theme.fonts.medium, color: '#9CA3AF', marginTop: 6 },

    deleteBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        paddingVertical: 16, marginTop: 28,
        borderWidth: 1, borderColor: '#EF4444', borderRadius: 12,
    },
    deleteBtnText: { fontSize: 15, fontFamily: theme.fonts.semiBold, color: '#EF4444' },

    footer: {
        paddingHorizontal: 20, paddingTop: 12,
        borderTopWidth: 1, borderTopColor: '#F3F4F6', backgroundColor: '#fff',
    },
    submitBtn: { backgroundColor: TEAL, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
    submitBtnDisabled: { opacity: 0.45 },
    submitBtnText: { fontSize: 16, fontFamily: theme.fonts.semiBold, color: '#fff' },
});

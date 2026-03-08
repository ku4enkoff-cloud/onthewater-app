import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ScrollView, Alert, Image, ActivityIndicator, Platform, KeyboardAvoidingView, Modal,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import {
    ChevronLeft, ChevronRight, ChevronDown, FileText, AlignLeft, ShieldCheck, Camera, X, Trash2,
    Ship, MapPin, Clock, Users, Wrench, ImageIcon, Check, Plus, XCircle, Anchor, Waves,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../../shared/theme';
import { api } from '../../shared/infrastructure/api';
import { API_BASE, getPhotoUrl } from '../../shared/infrastructure/config';

let LinearGradient = null;
try { LinearGradient = require('expo-linear-gradient').LinearGradient; } catch (_) {}

const GRADIENT = ['#0A4D4D', '#0D5C5C', '#1A7A5A'];
const TEAL = '#0D5C5C';
const GOLD = '#E2A83E';

const AMENITIES_OPTIONS = [
    'Туалет', 'Кондиционер', 'Аудиосистема', 'Bluetooth', 'Спасательные жилеты',
    'Трап для купания', 'Холодильник', 'Якорь', 'Климат-контроль', 'Розетки 220В',
];
const WATER_SPORTS_OPTIONS = ['Вейксерф', 'Вейкборд', 'Водные лыжи'];
const isTugboat = (name) => (name || '').toLowerCase().includes('буксировщик');

const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const toDateKey = (d) => d.toISOString().split('T')[0];
const getCalendarGrid = (monthDate) => {
    const y = monthDate.getFullYear(), m = monthDate.getMonth();
    const first = new Date(y, m, 1);
    let start = new Date(first);
    const toMonday = first.getDay() === 0 ? 6 : first.getDay() - 1;
    start.setDate(start.getDate() - toMonday);
    const grid = [];
    for (let row = 0; row < 6; row++) for (let col = 0; col < 7; col++) {
        const cell = new Date(start);
        cell.setDate(start.getDate() + row * 7 + col);
        grid.push({ date: cell, isCurrentMonth: cell.getMonth() === m });
    }
    return grid;
};
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

const getMapHtml = (initLat, initLng) => {
    const clat = (initLat != null && !isNaN(initLat)) ? initLat : 55.751244;
    const clng = (initLng != null && !isNaN(initLng)) ? initLng : 37.618423;
    const hasInit = initLat != null && initLng != null && !isNaN(initLat) && !isNaN(initLng);
    const initMarker = hasInit
        ? `marker = new ymaps.Placemark([${clat},${clng}],{},{preset:'islands#redDotIcon'}); map.geoObjects.add(marker);`
        : '';
    return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<style>*{margin:0;padding:0} html,body,#map{width:100%;height:100%}</style>
<script src="https://api-maps.yandex.ru/2.1/?lang=ru_RU&apikey=none" type="text/javascript"></script>
</head>
<body>
<div id="map"></div>
<script>
ymaps.ready(function(){
  var map = new ymaps.Map('map',{center:[${clat},${clng}],zoom:10,controls:['zoomControl']});
  var marker = null;
  ${initMarker}
  function reverseGeocode(lat, lng) {
    var url = 'https://nominatim.openstreetmap.org/reverse?format=json&lat=' + lat + '&lon=' + lng + '&accept-language=ru';
    fetch(url).then(function(r){return r.json();}).then(function(data){
      var a = data.address || {};
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type:'geocode',
        country:a.country||'', region:a.state||'', city:a.city||a.town||a.village||'',
        address:(a.road||'')+(a.house_number?' '+a.house_number:'')
      }));
    }).catch(function(){window.ReactNativeWebView.postMessage(JSON.stringify({type:'geocode',country:'',region:'',city:'',address:''}));});
  }
  map.events.add('click',function(e){
    var coords = e.get('coords');
    if(marker) map.geoObjects.remove(marker);
    marker = new ymaps.Placemark(coords,{},{preset:'islands#redDotIcon'});
    map.geoObjects.add(marker);
    window.ReactNativeWebView.postMessage(JSON.stringify({type:'coords', lat:coords[0], lng:coords[1]}));
    reverseGeocode(coords[0], coords[1]);
  });
});
</script>
</body>
</html>`;
};

export default function EditBoatScreen({ route, navigation }) {
    const insets = useSafeAreaInsets();
    const { boatId } = route.params || {};

    const [fetching, setFetching] = useState(true);
    const [loading, setLoading] = useState(false);
    const [boatTypes, setBoatTypes] = useState([]);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [rules, setRules] = useState('');
    const [cancellationPolicy, setCancellationPolicy] = useState('');
    const [captainOption, setCaptainOption] = useState('none');
    const [typeId, setTypeId] = useState('1');
    const [typeName, setTypeName] = useState('');
    const [manufacturer, setManufacturer] = useState('');
    const [model, setModel] = useState('');
    const [year, setYear] = useState('');
    const [capacity, setCapacity] = useState('');
    const [lengthM, setLengthM] = useState('');
    const [locationCity, setLocationCity] = useState('');
    const [locationRegion, setLocationRegion] = useState('');
    const [locationAddress, setLocationAddress] = useState('');
    const [locationCountry, setLocationCountry] = useState('');
    const [locationYachtClub, setLocationYachtClub] = useState('');
    const [lat, setLat] = useState(null);
    const [lng, setLng] = useState(null);
    const [mapCenterLat, setMapCenterLat] = useState(null);
    const [mapCenterLng, setMapCenterLng] = useState(null);
    const [mapReady, setMapReady] = useState(false);
    const webRef = useRef(null);
    const [pricePerHour, setPricePerHour] = useState('');
    const [weekendPrice, setWeekendPrice] = useState('');
    const [amenities, setAmenities] = useState([]);
    const [photos, setPhotos] = useState([]);

    const [workDates, setWorkDates] = useState(new Set());
    const [calendarMonth, setCalendarMonth] = useState(() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), 1);
    });
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
        api.get('/boat-types')
            .then((r) => setBoatTypes(Array.isArray(r.data) ? r.data : []))
            .catch(() => setBoatTypes([]));
    }, []);

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
            setCancellationPolicy(b.cancellation_policy || '');
            const cap = b.captain_included === true || b.captain_included === 1 || b.captain_included === '1';
            setCaptainOption(cap ? 'included' : 'none');
            setTypeId(String(b.type_id || '1'));
            setTypeName(b.type_name || '');
            setManufacturer(b.manufacturer || '');
            setModel(b.model || '');
            setYear(b.year ? String(b.year) : '');
            setCapacity(b.capacity ? String(b.capacity) : '');
            setLengthM(b.length_m ? String(b.length_m) : '');
            setLocationCity(b.location_city || '');
            setLocationRegion(b.location_region || '');
            setLocationAddress(b.location_address || '');
            setLocationCountry(b.location_country || '');
            setLocationYachtClub(b.location_yacht_club || '');
            if (b.lat != null && b.lng != null) {
                const blat = parseFloat(b.lat);
                const blng = parseFloat(b.lng);
                setLat(blat);
                setLng(blng);
                setMapCenterLat(blat);
                setMapCenterLng(blng);
            } else {
                setLat(null);
                setLng(null);
                setMapCenterLat(null);
                setMapCenterLng(null);
            }
            setPricePerHour(b.price_per_hour ? String(b.price_per_hour) : '');
            setWeekendPrice(b.price_weekend ? String(b.price_weekend) : '');

            const wd = b.schedule_work_days;
            if (wd && typeof wd === 'object') {
                if (wd.dates && Array.isArray(wd.dates)) {
                    setWorkDates(new Set(wd.dates));
                } else {
                    const workDaysMap = { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: false, ...wd };
                    const generated = [];
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    for (let i = 0; i < 180; i++) {
                        const d = new Date(today);
                        d.setDate(d.getDate() + i);
                        const key = WEEKDAY_KEYS[d.getDay()];
                        if (workDaysMap[key] === true) generated.push(toDateKey(d));
                    }
                    setWorkDates(new Set(generated));
                }
            }
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

    const toggleDate = (date) => {
        const key = toDateKey(date);
        setWorkDates((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const selectAllInMonth = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const grid = getCalendarGrid(calendarMonth);
        const keys = grid
            .filter(({ date, isCurrentMonth }) => isCurrentMonth && date >= today)
            .map(({ date }) => toDateKey(date));
        setWorkDates((prev) => {
            const next = new Set(prev);
            keys.forEach((k) => next.add(k));
            return next;
        });
    };

    const clearAllDates = () => setWorkDates(new Set());

    const onMapMessage = (event) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'coords') {
                setLat(data.lat);
                setLng(data.lng);
            } else if (data.type === 'geocode') {
                if (data.country) setLocationCountry(data.country);
                if (data.region) setLocationRegion(data.region);
                if (data.city) setLocationCity(data.city);
                if (data.address) setLocationAddress(data.address);
            }
        } catch (_) {}
    };

    const hasWeekendSelected = workDates.size > 0 && Array.from(workDates).some((d) => {
        const day = new Date(d).getDay();
        return day === 0 || day === 6;
    });

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
                <Modal visible transparent animationType="fade">
                    <TouchableOpacity
                        style={s.timeDropdownBackdrop}
                        activeOpacity={1}
                        onPress={() => setIsOpen(false)}
                    >
                        <View style={[s.timeDropdown, s.timeDropdownModal]} onStartShouldSetResponder={() => true}>
                            <ScrollView style={s.timeDropdownScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
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
                    </TouchableOpacity>
                </Modal>
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
            payload.append('type_name', boatTypes.find((t) => String(t.id) === typeId)?.name || 'Катер');
            payload.append('manufacturer', manufacturer);
            payload.append('model', model);
            payload.append('year', year);
            payload.append('length_m', lengthM);
            payload.append('capacity', capacity);
            payload.append('location_city', locationCity);
            payload.append('location_region', locationRegion);
            payload.append('location_address', locationAddress);
            payload.append('location_country', locationCountry);
            payload.append('location_yacht_club', locationYachtClub);
            payload.append('lat', String(lat != null ? lat : 55.75));
            payload.append('lng', String(lng != null ? lng : 37.62));
            payload.append('price_per_hour', pricePerHour);
            payload.append('price_per_day', '');
            payload.append('price_weekend', weekendPrice.trim());
            const scheduleWorkDays = workDates.size > 0 ? { dates: Array.from(workDates) } : { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: false };
            payload.append('schedule_work_days', JSON.stringify(scheduleWorkDays));
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
            payload.append('captain_included', captainOption === 'included' ? '1' : '0');
            payload.append('has_captain_option', captainOption === 'optional' ? '1' : '0');
            payload.append('rules', rules.trim());
            payload.append('cancellation_policy', cancellationPolicy.trim());
            payload.append('amenities', JSON.stringify(amenities));

            const isLocalUri = (p) => typeof p === 'string' && (p.startsWith('file://') || p.startsWith('content://'));
            const existingUrls = photos.filter((p) => !isLocalUri(p));
            const newFiles = photos.filter(isLocalUri);
            payload.append('photo_urls', JSON.stringify(existingUrls));
            newFiles.forEach((uri, i) => {
                payload.append('photos', { uri, type: 'image/jpeg', name: `photo_${i}.jpg` });
            });

            const token = await AsyncStorage.getItem('@token');
            const ctrl = new AbortController();
            const timeout = setTimeout(() => ctrl.abort(), 90000);
            const res = await fetch(`${API_BASE}/boats/${boatId}`, {
                method: 'PATCH',
                headers: { ...(token && { Authorization: `Bearer ${token}` }) },
                body: payload,
                signal: ctrl.signal,
            });
            clearTimeout(timeout);
            if (!res.ok) {
                const errBody = await res.text();
                let errData;
                try { errData = JSON.parse(errBody); } catch (_) {}
                throw Object.assign(new Error(errData?.error || errData?.message || `HTTP ${res.status}`), {
                    response: { status: res.status, data: errData || errBody },
                });
            }
            Alert.alert('Готово', 'Изменения сохранены');
            navigation.goBack();
        } catch (error) {
            if (__DEV__ && error.response) {
                console.warn('Save boat error', error.response?.status, error.response?.data);
            }
            const d = error.response?.data;
            let msg = d?.message || d?.error;
            if (!msg) {
                if (error.code === 'ECONNABORTED' || error.name === 'AbortError') msg = 'Превышено время ожидания. Проверьте интернет.';
                else if (!error.response && (error.code === 'ERR_NETWORK' || error.message === 'Network Error' || error.message?.includes('Failed to fetch'))) {
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
                        {boatTypes.map((t) => {
                            const active = typeId === String(t.id);
                            return (
                                <TouchableOpacity key={t.id} style={[s.chip, active && s.chipActive]} onPress={() => { setTypeId(String(t.id)); setTypeName(t.name || ''); }} activeOpacity={0.7}>
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
                    <Text style={s.sectionHint}>Нажмите на карту, чтобы указать местоположение.</Text>
                    <View style={s.mapContainer}>
                        {!mapReady && (
                            <View style={s.mapLoader}>
                                <ActivityIndicator size="large" color={TEAL} />
                                <Text style={s.mapLoaderText}>Загрузка карты...</Text>
                            </View>
                        )}
                        <WebView
                            ref={webRef}
                            source={{ html: getMapHtml(mapCenterLat, mapCenterLng) }}
                            style={[s.map, !mapReady && { opacity: 0 }]}
                            onMessage={onMapMessage}
                            onLoadEnd={() => setMapReady(true)}
                            javaScriptEnabled
                            domStorageEnabled
                            scrollEnabled={false}
                            nestedScrollEnabled={false}
                        />
                        {lat != null && lng != null && (
                            <View style={s.coordsBadge}>
                                <MapPin size={14} color="#fff" />
                                <Text style={s.coordsText}>{lat.toFixed(5)}, {lng.toFixed(5)}</Text>
                            </View>
                        )}
                    </View>
                    <View style={s.row}>
                        <View style={{ flex: 1 }}>
                            <Text style={s.smallLabel}>Страна</Text>
                            <TextInput style={s.input} value={locationCountry} onChangeText={setLocationCountry} placeholder="Россия" placeholderTextColor="#9CA3AF" />
                        </View>
                        <View style={{ width: 10 }} />
                        <View style={{ flex: 1 }}>
                            <Text style={s.smallLabel}>Область</Text>
                            <TextInput style={s.input} value={locationRegion} onChangeText={setLocationRegion} placeholder="Московская" placeholderTextColor="#9CA3AF" />
                        </View>
                    </View>
                    <View style={s.row}>
                        <View style={{ flex: 1 }}>
                            <Text style={s.smallLabel}>Город</Text>
                            <TextInput style={s.input} value={locationCity} onChangeText={setLocationCity} placeholder="Москва" placeholderTextColor="#9CA3AF" />
                        </View>
                        <View style={{ width: 10 }} />
                        <View style={{ flex: 1 }}>
                            <Text style={s.smallLabel}>Улица, дом</Text>
                            <TextInput style={s.input} value={locationAddress} onChangeText={setLocationAddress} placeholder="Адрес причала" placeholderTextColor="#9CA3AF" />
                        </View>
                    </View>
                    <Text style={s.smallLabel}>Яхт-клуб</Text>
                    <TextInput style={s.input} value={locationYachtClub} onChangeText={setLocationYachtClub} placeholder="Название яхт-клуба (необязательно)" placeholderTextColor="#9CA3AF" />

                    {/* Schedule & Price */}
                    <Text style={[s.sectionTitle, { marginTop: 20, fontSize: 17 }]}>Рабочие дни</Text>
                    <Text style={s.sectionHint}>Выберите даты, когда катер доступен для аренды.</Text>
                    <View style={s.calendarWrap}>
                        <View style={s.monthRow}>
                            <TouchableOpacity onPress={() => setCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))} style={s.arrowBtn}>
                                <ChevronLeft size={24} color={TEAL} />
                            </TouchableOpacity>
                            <Text style={s.monthTitle}>{calendarMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}</Text>
                            <TouchableOpacity onPress={() => setCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))} style={s.arrowBtn}>
                                <ChevronRight size={24} color={TEAL} />
                            </TouchableOpacity>
                        </View>
                        <View style={s.weekdayRow}>
                            {WEEKDAY_LABELS.map((label, i) => (
                                <Text key={label} style={[s.weekdayText, (i === 5 || i === 6) && s.weekdayWeekend]}>{label}</Text>
                            ))}
                        </View>
                        <View style={s.grid}>
                            {getCalendarGrid(calendarMonth).map(({ date, isCurrentMonth }, idx) => {
                                const key = toDateKey(date);
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                const isPast = date < today;
                                const selected = workDates.has(key);
                                const selectable = isCurrentMonth && !isPast;
                                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                return (
                                    <TouchableOpacity
                                        key={idx}
                                        style={[
                                            s.dayCell,
                                            !isCurrentMonth && s.dayOtherMonth,
                                            selectable && s.dayAvailable,
                                            !selectable && isCurrentMonth && s.dayUnavailable,
                                            selected && isWeekend && s.daySelectedWeekend,
                                            selected && !isWeekend && s.daySelected,
                                        ]}
                                        onPress={() => selectable && toggleDate(date)}
                                        disabled={!selectable}
                                        activeOpacity={selectable ? 0.7 : 1}
                                    >
                                        <Text style={[
                                            s.dayNum,
                                            !isCurrentMonth && s.dayNumOther,
                                            selectable && s.dayNumAvailable,
                                            !selectable && isCurrentMonth && s.dayNumUnavailable,
                                            selected && isWeekend && s.dayNumSelectedWeekend,
                                            selected && !isWeekend && s.dayNumSelected,
                                        ]}>{date.getDate()}</Text>
                                        </TouchableOpacity>
                                );
                            })}
                        </View>
                        <View style={s.calendarActions}>
                            <TouchableOpacity style={s.calendarActionBtn} onPress={selectAllInMonth} activeOpacity={0.7}>
                                <Text style={s.calendarActionText}>Выбрать все</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={s.calendarActionBtn} onPress={clearAllDates} activeOpacity={0.7}>
                                <Text style={s.calendarActionText}>Очистить все</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    {workDates.size > 0 && <Text style={s.selectedCount}>Выбрано дней: {workDates.size}</Text>}

                    {workDates.size > 0 && (
                        <View style={[s.hoursBlock, { zIndex: 20 }]}>
                            <Text style={s.hoursLabel}>Часы работы (будни)</Text>
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

                    {hasWeekendSelected && (
                        <View style={[s.hoursBlock, { zIndex: 20 }]}>
                            <Text style={s.hoursLabel}>Часы работы (выходные дни)</Text>
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

                    <Text style={[s.sectionTitle, { marginTop: 20 }]}>Стоимость аренды</Text>
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

                    {workDates.size > 0 && (
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
                                {workDates.size > 0 && (
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

                    {/* Water sports (for tugboat) */}
                    {isTugboat(boatTypes.find((t) => String(t.id) === typeId)?.name || typeName) && (
                        <>
                            <SectionIcon icon={Waves} label="Водные виды спорта" />
                            <View style={s.chipRow}>
                                {WATER_SPORTS_OPTIONS.map((name) => {
                                    const active = amenities.includes(name);
                                    return (
                                        <TouchableOpacity key={name} style={[s.chip, active && s.chipActive]} onPress={() => toggleAmenity(name)} activeOpacity={0.7}>
                                            <Text style={[s.chipText, active && s.chipTextActive]}>{name}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </>
                    )}

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

                    {/* Cancellation policy */}
                    <View style={s.fieldWrap}>
                        <View style={s.fieldHeader}>
                            <XCircle size={18} color={TEAL} />
                            <Text style={s.fieldLabel}>Условия отмены бронирования</Text>
                        </View>
                        <Text style={s.fieldHint}>Опишите условия возврата средств при отмене бронирования</Text>
                        <TextInput
                            style={[s.input, s.textArea]}
                            placeholder="Например: бесплатная отмена за 24 часа, при отмене менее чем за 12 часов — возврат 50%..."
                            placeholderTextColor="#9CA3AF"
                            value={cancellationPolicy}
                            onChangeText={setCancellationPolicy}
                            multiline
                            textAlignVertical="top"
                            maxLength={1000}
                        />
                        <Text style={s.charCount}>{cancellationPolicy.length}/1000</Text>
                    </View>

                    {/* Captain */}
                    <View style={s.fieldWrap}>
                        <View style={s.fieldHeader}>
                            <Anchor size={18} color={TEAL} />
                            <Text style={s.fieldLabel}>Капитан</Text>
                        </View>
                        <Text style={s.fieldHint}>Укажите, как сдаётся катер в аренду</Text>
                        <View style={s.captainOptions}>
                            {[
                                { key: 'included', label: 'С капитаном', desc: 'Капитан включён в стоимость аренды' },
                                { key: 'none', label: 'Без капитана', desc: 'Арендатор управляет самостоятельно' },
                            ].map((opt) => {
                                const active = captainOption === opt.key;
                                return (
                                    <TouchableOpacity
                                        key={opt.key}
                                        style={[s.captainCard, active && s.captainCardActive]}
                                        onPress={() => setCaptainOption(opt.key)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[s.radioOuter, active && s.radioOuterActive]}>
                                            {active && <View style={s.radioInner} />}
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[s.captainLabel, active && s.captainLabelActive]}>{opt.label}</Text>
                                            <Text style={s.captainDesc}>{opt.desc}</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

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

    mapContainer: {
        height: 260, borderRadius: 14, overflow: 'hidden',
        borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 20,
        backgroundColor: '#F3F4F6',
    },
    map: { flex: 1 },
    mapLoader: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center', alignItems: 'center',
        backgroundColor: '#F3F4F6', zIndex: 2,
    },
    mapLoaderText: { marginTop: 8, fontSize: 13, fontFamily: theme.fonts.regular, color: '#9CA3AF' },
    coordsBadge: {
        position: 'absolute', bottom: 10, left: 10,
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: 'rgba(13,92,92,0.85)', borderRadius: 8,
        paddingHorizontal: 10, paddingVertical: 5,
    },
    coordsText: { fontSize: 12, fontFamily: theme.fonts.medium, color: '#fff' },

    calendarWrap: { marginBottom: 22, padding: 16, backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
    monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
    arrowBtn: { padding: 8 },
    monthTitle: { fontSize: 18, fontFamily: theme.fonts.bold, color: '#1B365D', textTransform: 'capitalize' },
    weekdayRow: { flexDirection: 'row', marginBottom: 8 },
    calendarActions: { flexDirection: 'row', gap: 12, marginTop: 0 },
    calendarActionBtn: {
        flex: 1, paddingVertical: 10,
        borderRadius: 10, borderWidth: 1, borderColor: TEAL, backgroundColor: '#fff',
        alignItems: 'center',
    },
    calendarActionText: { fontSize: 14, fontFamily: theme.fonts.semiBold, color: TEAL },
    weekdayText: { flex: 1, textAlign: 'center', fontSize: 12, fontFamily: theme.fonts.medium, color: '#6B7280' },
    weekdayWeekend: { color: '#9CA3AF' },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    dayCell: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', marginVertical: 2 },
    dayOtherMonth: { opacity: 0.35 },
    dayAvailable: { backgroundColor: 'rgba(13,92,92,0.08)' },
    dayUnavailable: { opacity: 0.5 },
    daySelected: { backgroundColor: TEAL, borderRadius: 999 },
    daySelectedWeekend: { backgroundColor: GOLD, borderRadius: 999 },
    dayNum: { fontSize: 15, fontFamily: theme.fonts.medium, color: '#1B365D' },
    dayNumOther: { color: '#9CA3AF' },
    dayNumAvailable: { color: '#1B365D' },
    dayNumUnavailable: { color: '#9CA3AF' },
    dayNumSelected: { color: '#fff', fontFamily: theme.fonts.bold },
    dayNumSelectedWeekend: { color: '#fff', fontFamily: theme.fonts.bold },
    selectedCount: { fontSize: 13, fontFamily: theme.fonts.medium, color: '#6B7280', marginTop: 8 },
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
        borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, backgroundColor: '#fff',
        ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 }, android: { elevation: 6 } }),
    },
    timeDropdownBackdrop: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', paddingHorizontal: 24,
    },
    timeDropdownModal: { maxHeight: 280 },
    timeDropdownScroll: { maxHeight: 260 },
    timeDropdownItem: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    },
    timeDropdownItemActive: { backgroundColor: '#F0F9F8' },
    timeDropdownText: { fontSize: 15, fontFamily: theme.fonts.regular, color: '#374151' },
    timeDropdownTextActive: { fontFamily: theme.fonts.semiBold, color: TEAL },

    fieldWrap: { marginBottom: 22 },
    fieldHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    fieldLabel: { fontSize: 16, fontFamily: theme.fonts.semiBold, color: '#1B365D' },
    fieldHint: { fontSize: 13, fontFamily: theme.fonts.regular, color: '#9CA3AF', marginBottom: 8, lineHeight: 18 },
    charCount: { fontSize: 12, fontFamily: theme.fonts.regular, color: '#9CA3AF', textAlign: 'right', marginTop: 4 },
    captainOptions: { gap: 10 },
    captainCard: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12,
        paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff',
    },
    captainCardActive: { borderColor: TEAL, backgroundColor: '#F0FAFA' },
    radioOuter: {
        width: 22, height: 22, borderRadius: 11,
        borderWidth: 2, borderColor: '#D1D5DB',
        alignItems: 'center', justifyContent: 'center',
    },
    radioOuterActive: { borderColor: TEAL },
    radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: TEAL },
    captainLabel: { fontSize: 15, fontFamily: theme.fonts.semiBold, color: '#1B365D' },
    captainLabelActive: { color: TEAL },
    captainDesc: { fontSize: 12, fontFamily: theme.fonts.regular, color: '#9CA3AF', marginTop: 2 },
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

import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert, Platform, TextInput, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import * as LucideIcons from 'lucide-react-native';
import { theme } from '../../shared/theme';
import { api } from '../../shared/infrastructure/api';

const Clock = LucideIcons.Clock || LucideIcons.clock;
const Timer = LucideIcons.Timer || LucideIcons.timer;

// Варианты длительности берутся из карточки катера (schedule_min_duration + price_tiers)
const TIME_SLOTS = [];
for (let h = 9; h <= 20; h++) {
    TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`);
    TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`);
}
const slotToMinutes = (slot) => {
    const [h, m] = slot.split(':').map(Number);
    return h * 60 + m;
};
const isSlotInBusyInterval = (slot, busyIntervals = []) =>
    busyIntervals.some((b) => {
        const t = slotToMinutes(slot);
        const start = slotToMinutes(b.start);
        const end = slotToMinutes(b.end);
        return t >= start && t < end;
    });
const isStartTimeValid = (slot, durationMin, busyIntervals = []) => {
    if (isSlotInBusyInterval(slot, busyIntervals)) return false;
    const startMin = slotToMinutes(slot);
    const endMin = startMin + durationMin;
    return busyIntervals.every((b) => {
        const bStart = slotToMinutes(b.start);
        const bEnd = slotToMinutes(b.end);
        return endMin <= bStart || startMin >= bEnd;
    });
};

const DEFAULT_PRICING_TIERS = [
    { hours: 2, multiplier: 2 },
    { hours: 3, multiplier: 3 },
    { hours: 4, multiplier: 4 },
    { hours: 6, multiplier: 5.5 },
    { hours: 8, multiplier: 7 },
];
const isWeekend = (d) => d && (d.getDay() === 0 || d.getDay() === 6);

const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const getWeekdayKey = (d) => WEEKDAY_KEYS[d.getDay()];
const toDateKey = (d) => d.toISOString().split('T')[0];
const sameDay = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const BOOKING_TIME_ZONE = 'Europe/Moscow';

function formatPhoneRu(input) {
    const digitsOnly = (input || '').replace(/\D/g, '');
    if (!digitsOnly) return '';
    let d = digitsOnly;
    if (d[0] === '8') d = '7' + d.slice(1);
    else if (d[0] !== '7') d = '7' + d;
    d = d.slice(0, 11);
    const parts = [];
    parts.push('+7');
    if (d.length > 1) {
        const a = d.slice(1, 4);
        parts.push(` (${a}`);
        if (d.length >= 4) parts[parts.length - 1] += ')';
    }
    if (d.length > 4) parts.push(` ${d.slice(4, 7)}`);
    if (d.length > 7) parts.push(`-${d.slice(7, 9)}`);
    if (d.length > 9) parts.push(`-${d.slice(9, 11)}`);
    return parts.join('');
}

function formatDuration(mins) {
    if (mins < 60) return `${mins} мин`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h} ч ${m} мин` : `${h} ч`;
}

const zonedWallTimeToIso = (timeZone, year, monthIndex, day, hour, minute) => {
    const targetUtcMillis = Date.UTC(year, monthIndex, day, hour, minute, 0);
    const dtf = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });
    const partsToUtcMillis = (parts) => {
        const get = (type) => {
            const p = parts.find((x) => x.type === type);
            return p ? parseInt(p.value, 10) : NaN;
        };
        const y = get('year');
        const m = get('month');
        const d = get('day');
        const h = get('hour');
        const mi = get('minute');
        const s = get('second');
        return Date.UTC(y, m - 1, d, h, mi, s);
    };
    let utcMillis = targetUtcMillis;
    for (let i = 0; i < 2; i++) {
        const date = new Date(utcMillis);
        const parts = dtf.formatToParts(date);
        const tzAsUtcMillis = partsToUtcMillis(parts);
        const offset = tzAsUtcMillis - utcMillis;
        utcMillis = targetUtcMillis - offset;
    }
    return new Date(utcMillis).toISOString();
};

const getDatePartsInBookingTz = (d) => {
    const date = new Date(d);
    try {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: BOOKING_TIME_ZONE,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).formatToParts(date);
        const get = (type) => parts.find((p) => p.type === type)?.value || '';
        return { year: get('year'), month: get('month'), day: get('day') };
    } catch {
        return {
            year: String(date.getFullYear()),
            month: String(date.getMonth() + 1).padStart(2, '0'),
            day: String(date.getDate()).padStart(2, '0'),
        };
    }
};
const isSameDayInBookingTz = (a, b) => {
    if (!a || !b) return false;
    const pa = getDatePartsInBookingTz(a);
    const pb = getDatePartsInBookingTz(b);
    return pa.year === pb.year && pa.month === pb.month && pa.day === pb.day;
};
const getNowMinutesInBookingTz = () => {
    const now = new Date();
    try {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: BOOKING_TIME_ZONE,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        }).formatToParts(now);
        const get = (type) => Number(parts.find((p) => p.type === type)?.value || 0);
        return get('hour') * 60 + get('minute');
    } catch {
        return now.getHours() * 60 + now.getMinutes();
    }
};

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
            grid.push({ date: cell, isCurrentMonth: cell.getMonth() === m });
        }
    }
    return grid;
};

/** Длительности из карточки катера: schedule_min_duration + price_tiers */
const getDurationOptionsFromBoat = (boat) => {
    if (!boat) return [60];
    const minDuration = Number(boat.schedule_min_duration) || 60;
    const serverTiersRaw = boat.price_tiers;
    let serverTiers = [];
    if (Array.isArray(serverTiersRaw)) serverTiers = serverTiersRaw;
    else if (typeof serverTiersRaw === 'string') {
        try { serverTiers = JSON.parse(serverTiersRaw || '[]'); } catch { serverTiers = []; }
    }
    const hasServerTiers = Array.isArray(serverTiers) && serverTiers.length > 0;
    const durations = new Set([minDuration]);
    if (hasServerTiers) {
        serverTiers.forEach((t) => {
            const d = Number(t.duration) || 0;
            if (d > 0) durations.add(d);
        });
    } else {
        DEFAULT_PRICING_TIERS.forEach((t) => durations.add(t.hours * 60));
    }
    return [...durations].sort((a, b) => a - b);
};

const getPriceForDate = (boat, date, durationMin) => {
    if (!boat || !date) return 0;
    const basePrice = Number(boat.price_per_hour) || 0;
    const minDuration = Number(boat.schedule_min_duration) || 60;
    const serverTiersRaw = boat.price_tiers;
    let serverTiers = [];
    if (Array.isArray(serverTiersRaw)) serverTiers = serverTiersRaw;
    else if (typeof serverTiersRaw === 'string') {
        try { serverTiers = JSON.parse(serverTiersRaw || '[]'); } catch { serverTiers = []; }
    }
    const hasServerTiers = Array.isArray(serverTiers) && serverTiers.length > 0;
    let weekendBase = boat.price_weekend != null && String(boat.price_weekend).trim() !== ''
        ? Number(boat.price_weekend)
        : null;
    if (weekendBase == null && hasServerTiers) {
        const firstWithWeekend = serverTiers.find(
            (t) => t?.price_weekend != null && String(t.price_weekend).trim() !== '' && Number(t.price) > 0
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
                durationMin: Number(t.duration) || 0,
                price: Number(t.price) || 0,
                priceWeekend: t?.price_weekend != null && String(t.price_weekend).trim() !== '' ? Number(t.price_weekend) : null,
            })),
        ]
        : DEFAULT_PRICING_TIERS.map((t) => {
            const tierDurationMin = t.hours * 60;
            return {
                durationMin: tierDurationMin,
                price: Math.round(basePrice * t.multiplier),
                priceWeekend: weekendBase != null ? Math.round(weekendBase * (tierDurationMin / minDuration)) : null,
            };
        });
    const exact = displayTiers.find((t) => t.durationMin === durationMin);
    const weekdayPrice = exact ? exact.price : (() => {
        const pricePerMin = minDuration > 0 ? basePrice / minDuration : 0;
        return Math.round(pricePerMin * durationMin);
    })();
    if (!isWeekend(date)) return weekdayPrice;
    if (exact?.priceWeekend != null) return exact.priceWeekend;
    const withWeekend = displayTiers.find((t) => t.priceWeekend != null);
    if (!withWeekend || withWeekend.price === 0) return weekdayPrice;
    const ratio = withWeekend.priceWeekend / withWeekend.price;
    return Math.round(weekdayPrice * ratio);
};

let LinearGradient;
try { LinearGradient = require('expo-linear-gradient').LinearGradient; } catch (_) {}

const GRADIENT = ['#0A3D3D', '#0D5C5C', '#1A7A6E'];
const TEAL = '#0D5C5C';
const NAVY = '#1B365D';

export default function AddBookingScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    const [boats, setBoats] = useState([]);
    const [creatingBooking, setCreatingBooking] = useState(false);
    const [addBoatId, setAddBoatId] = useState(null);
    const [addDate, setAddDate] = useState(new Date());
    const [addCalendarMonth, setAddCalendarMonth] = useState(() => new Date());
    const [addShowCalendarModal, setAddShowCalendarModal] = useState(false);
    const [addDuration, setAddDuration] = useState(60);
    const [addPendingTime, setAddPendingTime] = useState(null);
    const [addShowTimePicker, setAddShowTimePicker] = useState(false);
    const [addBusyIntervals, setAddBusyIntervals] = useState([]);
    const [addBusySlotsLoading, setAddBusySlotsLoading] = useState(false);
    const [addClientPhone, setAddClientPhone] = useState('');
    const [addClientUserId, setAddClientUserId] = useState(null);
    const [addClientName, setAddClientName] = useState(null);
    const [addClientLookupLoading, setAddClientLookupLoading] = useState(false);
    const [addClientNotFound, setAddClientNotFound] = useState(false);
    const [addPassengers, setAddPassengers] = useState(1);
    const [addCaptain, setAddCaptain] = useState(false);
    const addClientLookupReqRef = useRef(0);

    useEffect(() => {
        api.get('/boats').then((res) => setBoats(Array.isArray(res.data) ? res.data : [])).catch(() => setBoats([]));
    }, []);

    const findBoatById = (id) => {
        if (id == null) return null;
        const nid = Number(id);
        return boats.find((b) => Number(b.id) === nid) || null;
    };

    const boatOptions = boats.map((b) => ({ id: b.id, title: b.title || 'Без названия' }));
    const addBoat = findBoatById(addBoatId);

    useEffect(() => {
        const firstBoat = boats[0]?.id ?? null;
        const boat = findBoatById(addBoatId ?? firstBoat);
        const minDuration = Number(boat?.schedule_min_duration) || 60;
        const captainIncluded = boat?.captain_included === true || boat?.captain_included === 1 || boat?.captain_included === '1';
        if (boats.length > 0 && addBoatId == null) {
            setAddBoatId(firstBoat);
            setAddDuration(minDuration);
            setAddCaptain(captainIncluded);
        }
    }, [boats]);

    // При смене катера — сбросить длительность, если её нет в опциях выбранного катера
    useEffect(() => {
        if (!addBoat) return;
        const opts = getDurationOptionsFromBoat(addBoat);
        setAddDuration((prev) => (opts.includes(prev) ? prev : Number(addBoat.schedule_min_duration) || 60));
    }, [addBoatId]);

    const fetchAddBusyIntervals = async (date, boatId) => {
        if (!boatId || !date) {
            setAddBusyIntervals([]);
            return;
        }
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;
        setAddBusySlotsLoading(true);
        try {
            const res = await api.get(`/boats/${boatId}/availability`, { params: { date: dateStr } });
            setAddBusyIntervals(Array.isArray(res.data?.busy) ? res.data.busy : []);
        } catch {
            setAddBusyIntervals([]);
        } finally {
            setAddBusySlotsLoading(false);
        }
    };

    const lookupClientByPhone = async (phoneOverride, reqId) => {
        const phone = (phoneOverride ?? addClientPhone ?? '').trim();
        if (!phone) return;
        setAddClientLookupLoading(true);
        setAddClientNotFound(false);
        try {
            const res = await api.get('/owner/clients/lookup', { params: { phone } });
            const data = res.data || {};
            if (reqId != null && reqId !== addClientLookupReqRef.current) return;
            setAddClientUserId(Number.isFinite(Number(data.id)) ? Number(data.id) : null);
            setAddClientName(data.name || null);
        } catch (e) {
            if (reqId != null && reqId !== addClientLookupReqRef.current) return;
            setAddClientUserId(null);
            if (e?.response?.status === 404) {
                setAddClientNotFound(true);
            } else {
                setAddClientName(null);
                const msg = e?.response?.data?.error || e.message || 'Не удалось найти клиента';
                Alert.alert('Ошибка', msg);
            }
        } finally {
            if (reqId == null || reqId === addClientLookupReqRef.current) setAddClientLookupLoading(false);
        }
    };

    useEffect(() => {
        const digits = String(addClientPhone || '').replace(/\D/g, '');
        if (digits.length < 11) {
            addClientLookupReqRef.current++;
            setAddClientLookupLoading(false);
            setAddClientNotFound(false);
            setAddClientUserId(null);
            return;
        }
        const reqId = ++addClientLookupReqRef.current;
        const t = setTimeout(() => lookupClientByPhone(addClientPhone, reqId), 400);
        return () => clearTimeout(t);
    }, [addClientPhone]);

    const handleSave = async () => {
        if (!addBoatId) return Alert.alert('Ошибка', 'Выберите катер');
        if (!addClientPhone || !String(addClientPhone).trim()) return Alert.alert('Ошибка', 'Введите телефон клиента');
        if (!addPendingTime) return Alert.alert('Ошибка', 'Выберите время');
        if (!addDate) return Alert.alert('Ошибка', 'Выберите дату');
        const boat = findBoatById(addBoatId);
        if (!boat) return Alert.alert('Ошибка', 'Катер не найден');
        const captainIncluded = boat?.captain_included === true || boat?.captain_included === 1 || boat?.captain_included === '1';
        const captainOptional = boat?.has_captain_option === true || boat?.has_captain_option === 1 || boat?.has_captain_option === '1';
        const finalCaptain = captainIncluded ? true : captainOptional ? addCaptain : false;
        setCreatingBooking(true);
        try {
            let clientUserId = addClientUserId;
            let clientName = addClientName;
            if (!clientUserId) {
                if (!clientName || !String(clientName).trim()) {
                    return Alert.alert('Ошибка', 'Если клиент не найден, укажите имя клиента');
                }
                let created;
                try {
                    created = await api.post('/owner/clients', {
                        phone: addClientPhone.trim(),
                        name: String(clientName).trim(),
                        email: null,
                    });
                } catch (e) {
                    const status = e?.response?.status;
                    const errText = e?.response?.data?.error || e?.response?.data?.message || (typeof e?.response?.data === 'string' ? e.response.data : null) || e?.message || 'Не удалось добавить клиента владельца';
                    return Alert.alert('Ошибка', `Шаг clients: ${errText}${status ? ` (HTTP ${status})` : ''}`);
                }
                clientUserId = created.data?.user_id ?? null;
                clientName = created.data?.name ?? clientName;
            }
            if (!clientUserId) return Alert.alert('Ошибка', 'Клиент добавлен в базу владельца, но не зарегистрирован в приложении');
            try {
                await api.post('/owner/clients', { phone: addClientPhone.trim(), name: clientName || null, email: null });
            } catch (_) {}
            const [hh, mm] = String(addPendingTime).split(':').map(Number);
            const start_at = zonedWallTimeToIso(
                BOOKING_TIME_ZONE,
                addDate.getFullYear(),
                addDate.getMonth(),
                addDate.getDate(),
                Number.isFinite(hh) ? hh : addDate.getHours(),
                Number.isFinite(mm) ? mm : addDate.getMinutes()
            );
            const total_price = getPriceForDate(boat, addDate, addDuration);
            try {
                await api.post('/owner/bookings', {
                    boat_id: addBoatId,
                    user_id: clientUserId,
                    start_at,
                    hours: addDuration,
                    passengers: addPassengers,
                    captain: finalCaptain,
                    total_price,
                    status: 'confirmed',
                });
            } catch (e) {
                const status = e?.response?.status;
                const errText = e?.response?.data?.error || e?.response?.data?.message || (typeof e?.response?.data === 'string' ? e.response.data : null) || e?.message || 'Не удалось создать бронирование';
                return Alert.alert('Ошибка', `Шаг bookings: ${errText}${status ? ` (HTTP ${status})` : ''}`);
            }
            navigation.goBack();
        } catch (e) {
            const status = e?.response?.status;
            const serverError = e?.response?.data?.error || e?.response?.data?.message || (typeof e?.response?.data === 'string' ? e.response.data : null);
            const msg = serverError || e.message || 'Не удалось создать бронирование';
            Alert.alert('Ошибка', status ? `${msg} (HTTP ${status})` : msg);
        } finally {
            setCreatingBooking(false);
        }
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
                <View style={[s.headerContent, { paddingTop: insets.top + 12 }]}>
                    <View style={s.headerRow}>
                        <TouchableOpacity style={s.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                            <ChevronLeft size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={s.headerTitle}>Добавить бронирование</Text>
                    </View>
                </View>
            </View>

            <ScrollView
                style={s.body}
                contentContainerStyle={[s.bodyContent, { paddingBottom: insets.bottom + 24 }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <Text style={s.subtitle}>Выберите катер, клиента, дату и время</Text>

                <Text style={s.label}>Катер</Text>
                <View style={s.boatChips}>
                    {boatOptions.length === 0 ? (
                        <Text style={s.emptyText}>Нет доступных катеров</Text>
                    ) : (
                        boatOptions.map((b) => {
                            const active = addBoatId != null && Number(addBoatId) === Number(b.id);
                            return (
                                <TouchableOpacity
                                    key={String(b.id)}
                                    style={[s.boatChip, active && s.boatChipActive]}
                                    onPress={() => {
                                        const boat = findBoatById(b.id);
                                        setAddBoatId(b.id);
                                        setAddPendingTime(null);
                                        setAddPassengers(1);
                                        setAddDuration(Number(boat?.schedule_min_duration) || 60);
                                        setAddCaptain(boat?.captain_included === true || boat?.captain_included === 1 || boat?.captain_included === '1');
                                    }}
                                    activeOpacity={0.75}
                                >
                                    <Text style={[s.boatChipText, active && s.boatChipTextActive]}>{b.title}</Text>
                                </TouchableOpacity>
                            );
                        })
                    )}
                </View>

                <Text style={s.label}>Телефон клиента</Text>
                <View style={s.clientLookupRow}>
                    <TextInput
                        style={s.phoneInput}
                        value={addClientPhone}
                        onChangeText={(t) => {
                            setAddClientPhone(formatPhoneRu(t));
                            setAddClientNotFound(false);
                            setAddClientUserId(null);
                        }}
                        placeholder="+7 ..."
                        placeholderTextColor={theme.colors.gray400}
                        keyboardType="phone-pad"
                    />
                    {addClientLookupLoading ? <ActivityIndicator size="small" color={TEAL} /> : null}
                </View>
                {addClientName && <Text style={s.clientFoundText}>Клиент: {addClientName}</Text>}
                {addClientNotFound && <Text style={s.clientNotFoundText}>Не найден — создадим по телефону</Text>}
                {addClientNotFound && (
                    <>
                        <Text style={s.label}>Имя клиента</Text>
                        <TextInput
                            style={s.nameInput}
                            value={addClientName ?? ''}
                            onChangeText={(t) => setAddClientName(t)}
                            placeholder="Например, Иван"
                            placeholderTextColor={theme.colors.gray400}
                            editable
                            autoCorrect={false}
                        />
                    </>
                )}

                <View style={s.row}>
                    <Text style={s.label}>Дата</Text>
                    <TouchableOpacity
                        style={s.valueBtn}
                        onPress={() => {
                            const base = addDate || new Date();
                            setAddCalendarMonth(new Date(base.getFullYear(), base.getMonth(), 1));
                            setAddShowCalendarModal(true);
                        }}
                    >
                        <Text style={s.valueText}>{addDate ? addDate.toLocaleDateString('ru-RU') : '—'}</Text>
                    </TouchableOpacity>
                </View>

                {addShowCalendarModal && addBoat && (() => {
                    let wd = addBoat.schedule_work_days;
                    if (typeof wd === 'string') try { wd = JSON.parse(wd); } catch { wd = null; }
                    const workDays = wd && typeof wd === 'object' && !wd.dates
                        ? { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: true, ...wd }
                        : { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: true };
                    const workDatesSet = wd?.dates && Array.isArray(wd.dates) ? new Set(wd.dates) : null;
                    const isWorkingDay = (d) => workDatesSet ? workDatesSet.has(toDateKey(d)) : workDays[getWeekdayKey(d)] === true;
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const grid = getCalendarGrid(addCalendarMonth);
                    const monthTitle = addCalendarMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
                    const prevMonth = () => setAddCalendarMonth(new Date(addCalendarMonth.getFullYear(), addCalendarMonth.getMonth() - 1, 1));
                    const nextMonth = () => setAddCalendarMonth(new Date(addCalendarMonth.getFullYear(), addCalendarMonth.getMonth() + 1, 1));
                    return (
                        <Modal visible transparent animationType="fade">
                            <View style={s.calOverlay}>
                                <View style={s.calSheet}>
                                    <View style={s.calHeader}>
                                        <TouchableOpacity onPress={() => setAddShowCalendarModal(false)} hitSlop={12}>
                                            <X size={22} color={NAVY} />
                                        </TouchableOpacity>
                                        <Text style={s.calHeaderTitle}>Выберите дату</Text>
                                        <View style={{ width: 22 }} />
                                    </View>
                                    <View style={s.calMonthRow}>
                                        <TouchableOpacity onPress={prevMonth} style={s.calArrowBtn}>
                                            <ChevronLeft size={24} color={NAVY} />
                                        </TouchableOpacity>
                                        <Text style={s.calMonthTitle}>{monthTitle}</Text>
                                        <TouchableOpacity onPress={nextMonth} style={s.calArrowBtn}>
                                            <ChevronRight size={24} color={NAVY} />
                                        </TouchableOpacity>
                                    </View>
                                    <View style={s.calWeekdayRow}>
                                        {WEEKDAY_LABELS.map((label, i) => (
                                            <Text key={label} style={[s.calWeekdayText, (i === 5 || i === 6) && s.calWeekdayWeekend]}>{label}</Text>
                                        ))}
                                    </View>
                                    <View style={s.calGrid}>
                                        {grid.map(({ date, isCurrentMonth }, idx) => {
                                            const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                                            const isPast = dateOnly < today;
                                            const working = isWorkingDay(date);
                                            const unavailable = !working || isPast;
                                            const selectable = isCurrentMonth && !unavailable;
                                            const selected = addDate && sameDay(date, addDate);
                                            return (
                                                <TouchableOpacity
                                                    key={idx}
                                                    style={[
                                                        s.calDayCell,
                                                        !isCurrentMonth && s.calDayOtherMonth,
                                                        selectable && s.calDayAvailable,
                                                        unavailable && isCurrentMonth && s.calDayUnavailable,
                                                        selected && s.calDaySelected,
                                                    ]}
                                                    onPress={() => {
                                                        if (selectable) {
                                                            setAddDate(date);
                                                            fetchAddBusyIntervals(date, addBoatId);
                                                            setAddShowCalendarModal(false);
                                                        }
                                                    }}
                                                    disabled={!selectable}
                                                    activeOpacity={selectable ? 0.7 : 1}
                                                >
                                                    <Text style={[
                                                        s.calDayNum,
                                                        !isCurrentMonth && s.calDayNumOther,
                                                        selectable && s.calDayNumAvailable,
                                                        unavailable && isCurrentMonth && s.calDayNumUnavailable,
                                                        selected && s.calDayNumSelected,
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

                <View style={s.row}>
                    <Text style={s.label}>Время</Text>
                    <TouchableOpacity
                        style={s.valueBtn}
                        onPress={() => {
                            if (!addBoatId) return Alert.alert('Ошибка', 'Выберите катер');
                            fetchAddBusyIntervals(addDate, addBoatId);
                            setAddShowTimePicker(true);
                        }}
                    >
                        <Text style={s.valueText}>{addPendingTime || '—'}</Text>
                    </TouchableOpacity>
                </View>

                <Text style={s.label}>Длительность</Text>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={s.durationChipsScroll}
                    style={s.durationChipsWrap}
                >
                    {getDurationOptionsFromBoat(addBoat).map((mins) => (
                        <TouchableOpacity
                            key={mins}
                            style={[s.durationChip, addDuration === mins && s.durationChipActive]}
                            onPress={() => setAddDuration(mins)}
                        >
                            <Text style={[s.durationChipText, addDuration === mins && s.durationChipTextActive]}>{formatDuration(mins)}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <Text style={s.label}>Пассажиры</Text>
                <View style={s.passengerRow}>
                    <TouchableOpacity
                        style={[s.stepBtn, addPassengers <= 1 && s.stepBtnDisabled]}
                        onPress={() => setAddPassengers(Math.max(1, addPassengers - 1))}
                        disabled={addPassengers <= 1}
                        activeOpacity={0.8}
                    >
                        <Text style={[s.stepBtnText, addPassengers <= 1 && s.stepBtnTextDisabled]}>-</Text>
                    </TouchableOpacity>
                    <Text style={s.passengerText}>
                        {addPassengers} {addPassengers === 1 ? 'гость' : addPassengers < 5 ? 'гостя' : 'гостей'}
                    </Text>
                    <TouchableOpacity
                        style={[s.stepBtn, addBoat?.capacity != null && Number(addBoat.capacity) > 0 && addPassengers >= Number(addBoat.capacity) && s.stepBtnDisabled]}
                        onPress={() => {
                            const max = Number(addBoat?.capacity) || 20;
                            setAddPassengers(Math.min(max, addPassengers + 1));
                        }}
                        disabled={addBoat?.capacity != null && Number(addBoat.capacity) > 0 && addPassengers >= Number(addBoat.capacity)}
                        activeOpacity={0.8}
                    >
                        <Text style={s.stepBtnText}>+</Text>
                    </TouchableOpacity>
                </View>

                <Text style={s.label}>Капитан</Text>
                {addBoat ? (() => {
                    const captainIncluded = addBoat?.captain_included === true || addBoat?.captain_included === 1 || addBoat?.captain_included === '1';
                    const captainOptional = addBoat?.has_captain_option === true || addBoat?.has_captain_option === 1 || addBoat?.has_captain_option === '1';
                    if (captainIncluded) return <Text style={s.clientFoundText}>С капитаном</Text>;
                    if (captainOptional) {
                        return (
                            <View style={s.captainRow}>
                                <TouchableOpacity
                                    style={[s.captainChip, addCaptain === false && s.captainChipActive]}
                                    onPress={() => setAddCaptain(false)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[s.captainChipText, addCaptain === false && s.captainChipTextActive]}>Без капитана</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[s.captainChip, addCaptain === true && s.captainChipActive]}
                                    onPress={() => setAddCaptain(true)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[s.captainChipText, addCaptain === true && s.captainChipTextActive]}>С капитаном</Text>
                                </TouchableOpacity>
                            </View>
                        );
                    }
                    return <Text style={s.clientFoundText}>Без капитана</Text>;
                })() : null}

                <Text style={s.priceLine}>
                    Итого: {(addBoat ? getPriceForDate(addBoat, addDate, addDuration) : 0).toLocaleString('ru-RU')} ₽
                </Text>

                <View style={s.actions}>
                    <TouchableOpacity style={s.cancelBtn} onPress={() => navigation.goBack()} disabled={creatingBooking}>
                        <Text style={s.cancelText}>Закрыть</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={s.saveBtn}
                        onPress={handleSave}
                        disabled={
                            creatingBooking ||
                            !addBoatId ||
                            !addClientPhone ||
                            !String(addClientPhone).trim() ||
                            !addPendingTime ||
                            !addDate
                        }
                        activeOpacity={0.9}
                    >
                        {creatingBooking ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.saveText}>Создать</Text>}
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Time picker */}
            {addShowTimePicker && (
                <Modal visible animationType="slide" transparent onRequestClose={() => setAddShowTimePicker(false)}>
                    <View style={s.timeOverlay}>
                        <View style={[s.timeSheet, { paddingBottom: insets.bottom + 16 }]}>
                            <View style={s.timeHeader}>
                                <TouchableOpacity onPress={() => setAddShowTimePicker(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                                    <X size={22} color={NAVY} />
                                </TouchableOpacity>
                                <Text style={s.timeHeaderTitle}>Время начала</Text>
                                <View style={{ width: 22 }} />
                            </View>
                            <View style={s.timeHint}>
                                {addBusySlotsLoading ? (
                                    <ActivityIndicator size="small" color={NAVY} style={{ marginVertical: 4 }} />
                                ) : (
                                    <Text style={s.timeHintText}>Показано текущее доступное время.</Text>
                                )}
                            </View>
                            <ScrollView showsVerticalScrollIndicator={false} style={s.timeScroll} contentContainerStyle={s.timeGrid}>
                                {TIME_SLOTS.map((slot) => {
                                    const isBusy = isSlotInBusyInterval(slot, addBusyIntervals);
                                    const canStartBase = isStartTimeValid(slot, addDuration, addBusyIntervals);
                                    const isToday = isSameDayInBookingTz(addDate, new Date());
                                    const nowMinutes = getNowMinutesInBookingTz();
                                    const slotMinutes = slotToMinutes(slot);
                                    const isPastToday = isToday && slotMinutes <= nowMinutes;
                                    const canStart = canStartBase && !isPastToday;
                                    const isSelected = addPendingTime === slot;
                                    const disabled = !canStart;
                                    return (
                                        <TouchableOpacity
                                            key={slot}
                                            style={[
                                                s.timeSlot,
                                                isSelected && s.timeSlotSelected,
                                                isBusy && s.timeSlotBusy,
                                                canStart && !isSelected && s.timeSlotAvailable,
                                            ]}
                                            onPress={() => { if (canStart) setAddPendingTime(slot); }}
                                            disabled={disabled}
                                            activeOpacity={disabled ? 1 : 0.7}
                                        >
                                            <Text
                                                style={[
                                                    s.timeSlotText,
                                                    isSelected && s.timeSlotTextSelected,
                                                    isBusy && s.timeSlotTextBusy,
                                                    canStart && !isSelected && s.timeSlotTextAvailable,
                                                ]}
                                            >
                                                {slot}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                            <View style={s.timeFooter}>
                                <TouchableOpacity
                                    style={[s.timeApplyBtn, !addPendingTime && s.timeApplyBtnDisabled]}
                                    onPress={() => setAddShowTimePicker(false)}
                                    disabled={!addPendingTime}
                                    activeOpacity={0.9}
                                >
                                    <Text style={s.timeApplyBtnText}>ПРИМЕНИТЬ</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            )}
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    headerWrap: { overflow: 'hidden', paddingBottom: 12 },
    headerContent: { paddingHorizontal: 20 },
    headerRow: { flexDirection: 'row', alignItems: 'center' },
    backButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    headerTitle: { fontSize: 22, fontFamily: theme.fonts.bold, color: '#fff' },
    body: { flex: 1 },
    bodyContent: { paddingHorizontal: 20, paddingTop: 16 },
    subtitle: { fontSize: 14, fontFamily: theme.fonts.regular, color: theme.colors.gray500, marginBottom: 20 },
    label: { fontSize: 13, fontFamily: theme.fonts.medium, color: theme.colors.gray500, marginBottom: 6 },
    emptyText: { fontSize: 14, fontFamily: theme.fonts.regular, color: theme.colors.gray400, marginBottom: 12 },
    boatChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    boatChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#F9FAFB',
    },
    boatChipActive: { backgroundColor: 'rgba(13,92,92,0.08)', borderColor: '#0D5C5C' },
    boatChipText: { fontSize: 13, fontFamily: theme.fonts.regular, color: theme.colors.gray600 },
    boatChipTextActive: { fontFamily: theme.fonts.semiBold, color: '#0D5C5C' },
    clientLookupRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
    phoneInput: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: '#F3F4F6',
        borderRadius: 10,
        fontFamily: theme.fonts.medium,
        color: '#1B365D',
    },
    clientFoundText: { fontSize: 13, fontFamily: theme.fonts.medium, color: '#0D5C5C', marginTop: 4 },
    clientNotFoundText: { fontSize: 13, fontFamily: theme.fonts.medium, color: theme.colors.gray500, marginTop: 4 },
    nameInput: {
        alignSelf: 'stretch',
        minHeight: 48,
        paddingVertical: 12,
        paddingHorizontal: 12,
        marginBottom: 12,
        backgroundColor: '#F3F4F6',
        borderRadius: 10,
        fontFamily: theme.fonts.medium,
        fontSize: 16,
        color: '#1B365D',
    },
    row: { marginBottom: 12 },
    valueBtn: { paddingVertical: 10, paddingHorizontal: 14, backgroundColor: '#F3F4F6', borderRadius: 10 },
    valueText: { fontSize: 15, fontFamily: theme.fonts.medium, color: '#1B365D' },
    durationChipsWrap: { marginBottom: 12 },
    durationChipsScroll: { flexDirection: 'row', gap: 8, paddingRight: 4 },
    durationChip: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#D1D5DB',
        backgroundColor: '#fff',
    },
    durationChipActive: { borderColor: '#0D5C5C', backgroundColor: 'rgba(13,92,92,0.08)' },
    durationChipText: { fontSize: 14, fontFamily: theme.fonts.medium, color: theme.colors.gray600 },
    durationChipTextActive: { fontFamily: theme.fonts.semiBold, color: '#0D5C5C' },
    passengerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    stepBtn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#F9FAFB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepBtnDisabled: { opacity: 0.5 },
    stepBtnText: { fontSize: 22, fontFamily: theme.fonts.bold, color: '#1B365D' },
    stepBtnTextDisabled: { color: theme.colors.gray400 },
    passengerText: { flex: 1, textAlign: 'center', fontSize: 14, fontFamily: theme.fonts.semiBold, color: '#1B365D' },
    captainRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    captainChip: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#fff',
        alignItems: 'center',
    },
    captainChipActive: { borderColor: '#0D5C5C', backgroundColor: 'rgba(13,92,92,0.08)' },
    captainChipText: { fontSize: 13, fontFamily: theme.fonts.medium, color: theme.colors.gray600 },
    captainChipTextActive: { color: '#0D5C5C', fontFamily: theme.fonts.semiBold },
    priceLine: { fontSize: 14, fontFamily: theme.fonts.semiBold, color: '#1B365D', marginTop: 12, marginBottom: 16 },
    actions: { flexDirection: 'row', gap: 12 },
    cancelBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10 },
    cancelText: { fontSize: 15, fontFamily: theme.fonts.semiBold, color: theme.colors.gray600 },
    saveBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: '#0D5C5C', borderRadius: 10 },
    saveText: { fontSize: 15, fontFamily: theme.fonts.semiBold, color: '#fff' },
    calOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    calSheet: { width: '100%', maxWidth: 400, backgroundColor: '#fff', borderRadius: 20, paddingBottom: 24, paddingHorizontal: 20 },
    calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
    calHeaderTitle: { fontSize: 18, fontFamily: theme.fonts.bold, color: '#1B365D' },
    calMonthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 20 },
    calArrowBtn: { padding: 8 },
    calMonthTitle: { fontSize: 20, fontFamily: theme.fonts.bold, color: '#1B365D', textTransform: 'capitalize' },
    calWeekdayRow: { flexDirection: 'row', marginBottom: 8 },
    calWeekdayText: { flex: 1, textAlign: 'center', fontSize: 13, fontFamily: theme.fonts.medium, color: theme.colors.gray500 },
    calWeekdayWeekend: { color: theme.colors.primary || '#0D5C5C' },
    calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    calDayCell: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', marginVertical: 2 },
    calDayOtherMonth: { opacity: 0.35 },
    calDayAvailable: { backgroundColor: '#ECFDF5' },
    calDayUnavailable: { backgroundColor: '#FEF2F2' },
    calDaySelected: { backgroundColor: '#1B365D', borderRadius: 999 },
    calDayNum: { fontSize: 16, fontFamily: theme.fonts.medium, color: '#1B365D' },
    calDayNumOther: { color: theme.colors.gray400 },
    calDayNumAvailable: { color: '#10B981' },
    calDayNumUnavailable: { color: theme.colors.error },
    calDayNumSelected: { color: '#fff', fontFamily: theme.fonts.bold },
    timeOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    timeSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 16, paddingHorizontal: 20, maxHeight: '80%' },
    timeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    timeHeaderTitle: { fontSize: 18, fontFamily: theme.fonts.bold, color: '#1B365D' },
    timeHint: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#F3F4F6', marginBottom: 12 },
    timeHintText: { fontSize: 13, fontFamily: theme.fonts.regular, color: theme.colors.gray500, textAlign: 'center' },
    timeScroll: { maxHeight: 360, marginBottom: 8 },
    timeGrid: { paddingVertical: 4, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    timeSlot: {
        width: '47%',
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
    },
    timeSlotAvailable: { backgroundColor: '#ECFDF5', borderColor: '#6EE7B7' },
    timeSlotBusy: { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' },
    timeSlotSelected: { backgroundColor: '#E5ECFF', borderColor: '#1B365D' },
    timeSlotText: { fontSize: 15, fontFamily: theme.fonts.medium, color: '#1B365D' },
    timeSlotTextAvailable: { color: '#0D5C5C' },
    timeSlotTextBusy: { color: theme.colors.error },
    timeSlotTextSelected: { color: '#1B365D', fontFamily: theme.fonts.semiBold },
    timeFooter: { paddingTop: 4, paddingBottom: 8 },
    timeApplyBtn: { backgroundColor: '#1B365D', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
    timeApplyBtnDisabled: { opacity: 0.5 },
    timeApplyBtnText: { fontSize: 15, fontFamily: theme.fonts.semiBold, color: '#fff' },
});

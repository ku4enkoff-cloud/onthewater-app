import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    RefreshControl, ScrollView, Modal, Alert, Platform, TextInput,
    ActivityIndicator,
} from 'react-native';
import { Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar, Clock, Timer, CheckCircle, XCircle, AlertCircle, Pencil, ChevronLeft, ChevronRight, X, Ship, Phone, Users } from 'lucide-react-native';
import * as LucideIcons from 'lucide-react-native';
import { theme } from '../../shared/theme';
import { api } from '../../shared/infrastructure/api';

const DURATION_OPTIONS = [30, 60, 90, 120, 180, 240];

// Иконки из lucide: "field-time" и "time-slot" из макета.
// Если конкретные экспорты не найдены, подстрахуемся `Clock`, чтобы UI не упал.
const FieldTimeIcon = LucideIcons.FieldTime || LucideIcons.fieldTime || Clock;
// В этой версии lucide-react-native иконки "time-slot" может не быть — ставим closest: Timer.
const TimeSlotIcon = Timer;

// Тайм-слоты для выбора времени начала (шаг 30 минут)
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

// Маска RU телефона: +7 (___) ___-__-__ (используется для автопоиска)
function formatPhoneRu(input) {
    const digitsOnly = (input || '').replace(/\D/g, '');
    if (!digitsOnly) return '';

    // Приводим к формату РФ: 8xxxxxxxxxx -> 7xxxxxxxxxx, если пользователь начал с 8
    // Если пользователь сразу ввел 7 — оставляем.
    let d = digitsOnly;
    if (d[0] === '8') d = '7' + d.slice(1);
    else if (d[0] !== '7') d = '7' + d;

    // Ожидаем 11 цифр (7 + 10 номера) для автопоиска
    d = d.slice(0, 11);

    const parts = [];
    parts.push('+7');

    if (d.length > 1) {
        const a = d.slice(1, 4);
        parts.push(` (${a}`);
        if (d.length >= 4) parts[parts.length - 1] += ')';
    }

    if (d.length > 4) {
        const b = d.slice(4, 7);
        parts.push(` ${b}`);
    }

    if (d.length > 7) {
        const c = d.slice(7, 9);
        parts.push(`-${c}`);
    }

    if (d.length > 9) {
        const e = d.slice(9, 11);
        parts.push(`-${e}`);
    }

    return parts.join('');
}

// Рассчитать total_price для выбранной даты/длительности
// Аналог логики из `client/screens/BoatDetailScreen.js`, но упрощённо и под минуты.
const getPriceForDate = (boat, date, durationMin) => {
    if (!boat || !date) return 0;
    const basePrice = Number(boat.price_per_hour) || 0;
    const minDuration = Number(boat.schedule_min_duration) || 60; // минуты

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
                priceWeekend: t?.price_weekend != null && String(t.price_weekend).trim() !== ''
                    ? Number(t.price_weekend)
                    : null,
            })),
        ]
        : DEFAULT_PRICING_TIERS.map((t) => {
            const tierDurationMin = t.hours * 60;
            return {
                durationMin: tierDurationMin,
                price: Math.round(basePrice * t.multiplier),
                priceWeekend: weekendBase != null
                    ? Math.round(weekendBase * (tierDurationMin / minDuration))
                    : null,
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
            grid.push({ date: cell, isCurrentMonth: cell.getMonth() === m });
        }
    }
    return grid;
};

let LinearGradient;
try { LinearGradient = require('expo-linear-gradient').LinearGradient; } catch (_) {}

const GRADIENT = ['#0A3D3D', '#0D5C5C', '#1A7A6E'];
const TEAL = '#0D5C5C';
const NAVY = '#1B365D';

// Бизнес-слоты трактуем как время лодки. Пока лодка без индивидуального timezone — Europe/Moscow.
const BOOKING_TIME_ZONE = 'Europe/Moscow';

/** Europe/Moscow wall-time (YYYY-MM-DD HH:mm) → ISO (UTC) */
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

const formatDateInBookingTz = (d) => {
    if (!d) return '—';
    const date = new Date(d);
    try {
        return new Intl.DateTimeFormat('ru-RU', {
            timeZone: BOOKING_TIME_ZONE,
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        }).format(date);
    } catch {
        return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    }
};

const formatTimeHHMMInBookingTz = (d) => {
    if (!d) return '';
    const date = new Date(d);
    try {
        return new Intl.DateTimeFormat('ru-RU', {
            timeZone: BOOKING_TIME_ZONE,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        }).format(date);
    } catch {
        const time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', hour12: false });
        return time.replace(/\s/g, '');
    }
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

const TABS = [
    { key: 'all',       label: 'Все',           status: null },
    { key: 'pending',   label: 'Ожидают',       status: 'pending' },
    { key: 'confirmed', label: 'Подтверждены',  status: 'confirmed' },
    { key: 'completed', label: 'Завершены',     status: 'completed' },
    { key: 'cancelled', label: 'Отменены',      status: 'cancelled' },
];

const EMPTY_MESSAGES = {
    all:       'Нет бронирований.',
    pending:   'Нет бронирований, ожидающих подтверждения.',
    confirmed: 'Нет подтверждённых бронирований.',
    completed: 'Нет завершённых бронирований.',
    cancelled: 'Нет отменённых бронирований.',
};

export default function OwnerBookingsScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    const [bookings, setBookings] = useState([]);
    const [boats, setBoats] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingBooking, setEditingBooking] = useState(null);
    const [editDate, setEditDate] = useState(new Date());
    const [editTime, setEditTime] = useState(new Date());
    const [editDuration, setEditDuration] = useState(60);
    const [showCalendarModal, setShowCalendarModal] = useState(false);
    const [calendarMonth, setCalendarMonth] = useState(() => new Date());
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [filterDate, setFilterDate] = useState(null);
    const [filterBoatId, setFilterBoatId] = useState(null);
    const [showFilterCalendar, setShowFilterCalendar] = useState(false);
    const [filterCalendarMonth, setFilterCalendarMonth] = useState(() => new Date());
    const [pendingTime, setPendingTime] = useState(null);
    const [busyIntervals, setBusyIntervals] = useState([]);
    const [busySlotsLoading, setBusySlotsLoading] = useState(false);
    const [timeBoatId, setTimeBoatId] = useState(null);

    // ---- Create booking (manual) ----
    const [addModalVisible, setAddModalVisible] = useState(false);
    const [creatingBooking, setCreatingBooking] = useState(false);
    const [addBoatId, setAddBoatId] = useState(null);
    const [addDate, setAddDate] = useState(new Date());
    const [addCalendarMonth, setAddCalendarMonth] = useState(() => new Date());
    const [addShowCalendarModal, setAddShowCalendarModal] = useState(false);
    const [addDuration, setAddDuration] = useState(60); // минуты
    const [addPendingTime, setAddPendingTime] = useState(null); // HH:mm wall time
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
        fetchBookings();
        fetchBoats();
        // Периодическое обновление списка, пока экран смонтирован.
        const id = setInterval(fetchBookings, 30000);
        return () => clearInterval(id);
    }, []);

    const fetchBookings = async () => {
        try {
            const res = await api.get('/owner/bookings');
            setBookings(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            console.log(
                'Error fetching owner bookings',
                e?.message,
                e?.response?.status,
                e?.response?.data,
            );
            setBookings([]);
        } finally {
            setRefreshing(false);
        }
    };

    const fetchBoats = async () => {
        try {
            const res = await api.get('/boats');
            setBoats(Array.isArray(res.data) ? res.data : []);
        } catch (_) {
            setBoats([]);
        }
    };

    const fetchBusyIntervals = async (date, boatId) => {
        if (!boatId || !date) {
            setBusyIntervals([]);
            return;
        }
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;
        setBusySlotsLoading(true);
        try {
            const res = await api.get(`/boats/${boatId}/availability`, { params: { date: dateStr } });
            setBusyIntervals(Array.isArray(res.data?.busy) ? res.data.busy : []);
        } catch (_) {
            setBusyIntervals([]);
        } finally {
            setBusySlotsLoading(false);
        }
    };

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
        } catch (_) {
            setAddBusyIntervals([]);
        } finally {
            setAddBusySlotsLoading(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchBookings();
        fetchBoats();
    };

    const VISIBLE_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'];
    const boatOptions = boats.map((b) => ({ id: b.id, title: b.title || 'Без названия' }));

    const filtered = bookings.filter((b) => {
        if (!VISIBLE_STATUSES.includes(b.status)) return false;
        if (activeTab !== 'all' && b.status !== activeTab) return false;
        if (filterDate != null) {
            const start = b.start_at || b.date_start;
            if (!start) return false;
            const d = new Date(start);
            if (d.getFullYear() !== filterDate.getFullYear() || d.getMonth() !== filterDate.getMonth() || d.getDate() !== filterDate.getDate()) return false;
        }
        if (filterBoatId != null) {
            const bookingBoatId = b.boat_id ?? b.boatId ?? b.boat?.id ?? null;
            if (bookingBoatId == null) return false;
            if (Number(bookingBoatId) !== Number(filterBoatId)) return false;
        }
        return true;
    });

    const getTabCount = (key) => {
        if (key === 'all') return bookings.filter((b) => VISIBLE_STATUSES.includes(b.status)).length;
        return bookings.filter((b) => b.status === key).length;
    };

    const handleAction = async (id, action) => {
        try {
            if (action === 'accept') {
                await api.post(`/owner/bookings/${id}/confirm`);
                setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'confirmed' } : b));
            } else {
                await api.post(`/owner/bookings/${id}/decline`);
                // На бэкенде бронирование удаляется, поэтому убираем его и из локального списка
                setBookings(prev => prev.filter(b => b.id !== id));
            }
        } catch (_) {}
    };

    const findBoatById = (id) => {
        if (id == null) return null;
        const nid = Number(id);
        if (!Number.isFinite(nid)) return null;
        return boats.find((b) => Number(b.id) === nid) || null;
    };

    const openAddModal = () => {
        const firstBoat = boats[0]?.id ?? null;
        const boat = findBoatById(addBoatId ?? firstBoat);

        const now = new Date();
        const minDuration = Number(boat?.schedule_min_duration) || 60;

        const captainIncluded = boat?.captain_included === true || boat?.captain_included === 1 || boat?.captain_included === '1';

        setAddModalVisible(true);
        setAddBoatId(boat?.id ?? firstBoat);
        setAddDate(now);
        setAddCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1));
        setAddDuration(minDuration);
        setAddPendingTime(null);
        setAddShowCalendarModal(false);
        setAddShowTimePicker(false);
        setAddBusyIntervals([]);
        setAddBusySlotsLoading(false);

        setAddClientPhone('');
        setAddClientUserId(null);
        setAddClientName(null);
        setAddClientLookupLoading(false);
        setAddClientNotFound(false);

        setAddPassengers(1);
        setAddCaptain(captainIncluded);
    };

    const closeAddModal = () => {
        setAddModalVisible(false);
        setAddShowCalendarModal(false);
        setAddShowTimePicker(false);
        setAddPendingTime(null);
        setAddBusyIntervals([]);
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
                // Имя может быть введено вручную — не сбрасываем.
            } else {
                setAddClientName(null);
                const msg = e?.response?.data?.error || e.message || 'Не удалось найти клиента';
                Alert.alert('Ошибка', msg);
            }
        } finally {
            if (reqId == null || reqId === addClientLookupReqRef.current) {
                setAddClientLookupLoading(false);
            }
        }
    };

    // Автопоиск клиента по телефону: ищем, когда номер “готовый” (>= 11 цифр).
    // Это уменьшает число запросов к серверу.
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
        const t = setTimeout(() => {
            lookupClientByPhone(addClientPhone, reqId);
        }, 400);

        return () => clearTimeout(t);
    }, [addClientPhone]);

    const handleSaveAddBooking = async () => {
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

            // Если по телефону не удалось получить `user_id` (из lookup),
            // создаём/привязываем клиента к базе владельца.
            if (!clientUserId) {
                const created = await api.post('/owner/clients', {
                    phone: addClientPhone.trim(),
                    name: clientName || null,
                    email: null,
                });
                // Для бронирования нужен именно users.id (owner_clients.id не подходит).
                clientUserId = created.data?.user_id ?? null;
                clientName = created.data?.name ?? clientName;
            }

            if (!clientUserId) return Alert.alert('Ошибка', 'Не удалось определить клиента');

            // На всякий случай убеждаемся, что клиент привязан в owner_clients
            try {
                await api.post('/owner/clients', {
                    phone: addClientPhone.trim(),
                    name: clientName || null,
                    email: null,
                });
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

            closeAddModal();
            fetchBookings();
        } catch (e) {
            const status = e?.response?.status;
            const serverError =
                e?.response?.data?.error ||
                e?.response?.data?.message ||
                (typeof e?.response?.data === 'string' ? e.response.data : null);
            const msg = serverError || e.message || 'Не удалось создать бронирование';
            Alert.alert('Ошибка', status ? `${msg} (HTTP ${status})` : msg);
        } finally {
            setCreatingBooking(false);
        }
    };

    const openEditModal = (item) => {
        const startAt = item.start_at || item.date_start;
        const d = startAt ? new Date(startAt) : new Date();
        const boatId = item.boat_id ?? item.boatId ?? item.boat?.id ?? null;
        setEditingBooking(item);
        setEditDate(d);
        setEditTime(d);
        setEditDuration(Number(item.hours) || 60);
        setCalendarMonth(new Date(d.getFullYear(), d.getMonth(), 1));
        setTimeBoatId(boatId);
        setPendingTime(formatTimeHHMMInBookingTz(startAt));
        fetchBusyIntervals(d, boatId);
        setEditModalVisible(true);
    };

    const closeEditModal = () => {
        setEditModalVisible(false);
        setEditingBooking(null);
        setShowCalendarModal(false);
        setShowTimePicker(false);
    };

    const handleSaveEdit = async () => {
        if (!editingBooking) return;
        try {
            const y = editDate.getFullYear();
            const mo = editDate.getMonth();
            const da = editDate.getDate();
            const [hh, mm] = String(pendingTime || '').split(':');
            const h = parseInt(hh, 10);
            const mi = parseInt(mm, 10);
            const start_at = zonedWallTimeToIso(
                BOOKING_TIME_ZONE,
                y,
                mo,
                da,
                Number.isFinite(h) ? h : editTime.getHours(),
                Number.isFinite(mi) ? mi : editTime.getMinutes()
            );
            const res = await api.patch(`/bookings/${editingBooking.id}`, {
                start_at,
                hours: editDuration,
            });
            const updated = res.data;
            setBookings(prev => prev.map(b => b.id === editingBooking.id ? { ...b, ...updated } : b));
            closeEditModal();
        } catch (e) {
            const status = e.response?.status;
            const msg = e.response?.data?.error || e.message || 'Не удалось сохранить изменения';
            const hint = status === 404 ? ' Проверьте, что бэкенд обновлён (git pull) и перезапущен.' : '';
            Alert.alert('Ошибка', msg + hint);
        }
    };

    const handleCancelBooking = () => {
        if (!editingBooking) return;
        Alert.alert(
            'Отменить бронирование',
            'Вы уверены, что хотите отменить это бронирование?',
            [
                { text: 'Нет', style: 'cancel' },
                {
                    text: 'Да, отменить',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.post(`/bookings/${editingBooking.id}/cancel`);
                            setBookings(prev => prev.map(b => b.id === editingBooking.id ? { ...b, status: 'cancelled' } : b));
                            closeEditModal();
                        } catch (e) {
                            Alert.alert('Ошибка', e.response?.data?.error || 'Не удалось отменить бронирование');
                        }
                    },
                },
            ]
        );
    };

    const getStatusColor = (status) => ({
        pending: '#E8A838',
        confirmed: TEAL,
        completed: theme.colors.gray500,
        cancelled: theme.colors.error,
    }[status] || theme.colors.gray400);

    const getStatusIcon = (status) => ({
        pending: Clock,
        confirmed: CheckCircle,
        completed: CheckCircle,
        cancelled: XCircle,
    }[status] || AlertCircle);

    const getStatusLabel = (status) => ({
        pending: 'Ожидает подтверждения',
        confirmed: 'Подтверждено',
        completed: 'Завершено',
        cancelled: 'Отменено',
    }[status] || status);

    const formatDate = (d) => {
        return formatDateInBookingTz(d);
    };

    const formatDuration = (mins) => {
        if (mins == null || mins === '' || Number.isNaN(Number(mins))) return '—';
        const m = Number(mins);
        if (m < 60) return `${m} мин`;
        const h = Math.floor(m / 60);
        const min = m % 60;
        if (min === 0) {
            if (h === 1) return '1 час';
            if (h >= 2 && h <= 4) return `${h} часа`;
            return `${h} часов`;
        }
        return `${h} ч ${min} мин`;
    };

    const openChatWithClient = async (item) => {
        try {
            const res = await api.post(`/owner/bookings/${item.id}/chat`);
            const chat = res.data;
            if (chat && chat.id) {
                navigation.navigate('ChatDetail', { chatId: chat.id });
            } else {
                Alert.alert('Ошибка', 'Не удалось открыть чат');
            }
        } catch (e) {
            const msg = e.response?.data?.error || e.message || 'Не удалось открыть чат';
            Alert.alert('Ошибка', msg);
        }
    };

    const renderCard = ({ item }) => {
        const StatusIcon = getStatusIcon(item.status);
        const color = getStatusColor(item.status);
        return (
            <View style={s.card}>
                <View style={s.cardHeader}>
                    <View style={s.statusRow}>
                        <StatusIcon size={14} color={color} />
                        <Text style={[s.statusText, { color }]}>{getStatusLabel(item.status)}</Text>
                    </View>
                    <Text style={s.cardPrice}>{(item.total_price || 0).toLocaleString('ru-RU')} ₽</Text>
                </View>
                <Text style={s.cardTitle} numberOfLines={2}>{item.boat_title}</Text>
                <View style={s.cardClientBlock}>
                    <Text style={s.cardClient}>Клиент: {item.client_name || '—'}</Text>
                    {(() => {
                        const phoneRaw =
                            item.client_phone ||
                            item.phone ||
                            item.user_phone ||
                            item.user_phone_e164 ||
                            item.client?.phone ||
                            item.user?.phone ||
                            null;
                        if (!phoneRaw) return null;
                        const digits = String(phoneRaw).replace(/\D/g, '');
                        const formatted = digits.length >= 11
                            ? `+${digits[0]} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`
                            : phoneRaw;
                        const telNumber = digits ? `+${digits}` : String(phoneRaw).trim();
                        const telUrl = `tel:${telNumber}`;
                        return (
                            <>
                                <TouchableOpacity
                                    onPress={() => Linking.openURL(telUrl)}
                                    activeOpacity={0.7}
                                    style={s.cardClientPhoneWrap}
                                >
                                    <Phone size={14} color={theme.colors.gray500} />
                                    <Text style={s.cardClientPhone}>{formatted}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => openChatWithClient(item)}
                                    activeOpacity={0.7}
                                    style={s.cardClientChatWrap}
                                >
                                    <Text style={s.cardClientChat}>Написать клиенту</Text>
                                </TouchableOpacity>
                            </>
                        );
                    })()}
                </View>
                <View style={s.cardDetails}>
                    <View style={s.detailRow}>
                        <Calendar size={14} color={theme.colors.gray400} />
                        <Text style={s.detailText}>
                            {formatDate(item.start_at || item.date_start)}
                        </Text>
                    </View>
                    <View style={s.detailRow}>
                        <FieldTimeIcon size={14} color={theme.colors.gray400} />
                        <Text style={s.detailText}>
                            {(() => {
                                const src = item.start_at || item.date_start;
                                if (!src) return '—';
                                return formatTimeHHMMInBookingTz(src);
                            })()}
                        </Text>
                    </View>
                    <View style={s.detailRow}>
                        <TimeSlotIcon size={14} color={theme.colors.gray400} />
                        <Text style={s.detailText}>{formatDuration(item.hours)}</Text>
                    </View>
                    <View style={s.detailRow}>
                        <Users size={14} color={theme.colors.gray400} />
                        <Text style={s.detailText}>
                            Гостей: {item.passengers || item.guests_count || '—'}
                        </Text>
                    </View>
                    <View style={s.detailRow}>
                        <Ship size={14} color={theme.colors.gray400} />
                        <Text style={s.detailText}>
                            Капитан: {(item.captain || item.captain_requested) ? 'Да' : 'Нет'}
                        </Text>
                    </View>
                </View>
                {(item.status === 'pending' || item.status === 'confirmed') && (
                    <View style={s.actionsWrap}>
                        <TouchableOpacity style={s.editBtn} onPress={() => openEditModal(item)} activeOpacity={0.8}>
                            <Pencil size={14} color={TEAL} />
                            <Text style={s.editBtnText}>Изменить</Text>
                        </TouchableOpacity>
                        {item.status === 'pending' && (
                            <View style={s.actions}>
                                <TouchableOpacity style={s.acceptBtn} onPress={() => handleAction(item.id, 'accept')} activeOpacity={0.8}>
                                    <Text style={s.acceptText}>Подтвердить</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={s.declineBtn} onPress={() => handleAction(item.id, 'decline')} activeOpacity={0.8}>
                                    <Text style={s.declineText}>Отклонить</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}
            </View>
        );
    };

    const addBoat = findBoatById(addBoatId);

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
                    <View style={s.headerTopRow}>
                        <Text style={[s.headerTitle, { textAlign: 'left' }]}>Бронирования</Text>
                        <TouchableOpacity style={s.headerAddBtn} onPress={openAddModal} activeOpacity={0.8}>
                            <Pencil size={18} color="#fff" />
                            <Text style={s.headerAddText}>Добавить вручную</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Scrollable tabs */}
            <View style={s.tabsWrap}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={s.tabsScroll}
                >
                    {TABS.map((tab) => {
                        const isActive = activeTab === tab.key;
                        const count = getTabCount(tab.key);
                        return (
                            <TouchableOpacity
                                key={tab.key}
                                style={[s.tab, isActive && s.tabActive]}
                                onPress={() => setActiveTab(tab.key)}
                                activeOpacity={0.7}
                            >
                                <Text style={[s.tabText, isActive && s.tabTextActive]}>
                                    {tab.label} ({count})
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Filters */}
            <View style={s.filtersWrap}>
                <TouchableOpacity
                    style={s.filterDateBtn}
                    onPress={() => {
                        const base = filterDate || new Date();
                        setFilterCalendarMonth(new Date(base.getFullYear(), base.getMonth(), 1));
                        setShowFilterCalendar(true);
                    }}
                    activeOpacity={0.7}
                >
                    <Calendar size={18} color={filterDate ? TEAL : theme.colors.gray400} />
                    <Text style={[s.filterDateText, filterDate && s.filterDateTextActive]}>
                        {filterDate ? filterDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Любая дата'}
                    </Text>
                    {filterDate != null && (
                        <TouchableOpacity hitSlop={8} onPress={() => setFilterDate(null)} style={s.filterClear}>
                            <X size={16} color={theme.colors.gray500} />
                        </TouchableOpacity>
                    )}
                </TouchableOpacity>
                {boatOptions.length > 0 && (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={s.filterBoatChips}
                    >
                        <TouchableOpacity
                            style={[
                                s.boatChip,
                                filterBoatId == null && s.boatChipActive,
                            ]}
                            onPress={() => setFilterBoatId(null)}
                            activeOpacity={0.7}
                        >
                            <Text
                                style={[
                                    s.boatChipText,
                                    filterBoatId == null && s.boatChipTextActive,
                                ]}
                            >
                                Все катера
                            </Text>
                        </TouchableOpacity>
                        {boatOptions.map((boat) => {
                            const active = filterBoatId === boat.id;
                            return (
                                <TouchableOpacity
                                    key={boat.id}
                                    style={[s.boatChip, active && s.boatChipActive]}
                                    onPress={() => setFilterBoatId(boat.id)}
                                    activeOpacity={0.7}
                                >
                                    <Text
                                        style={[
                                            s.boatChipText,
                                            active && s.boatChipTextActive,
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {boat.title}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                )}
            </View>
            {showFilterCalendar && (() => {
                const grid = getCalendarGrid(filterCalendarMonth);
                const monthTitle = filterCalendarMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
                const prevMonth = () => setFilterCalendarMonth(new Date(filterCalendarMonth.getFullYear(), filterCalendarMonth.getMonth() - 1, 1));
                const nextMonth = () => setFilterCalendarMonth(new Date(filterCalendarMonth.getFullYear(), filterCalendarMonth.getMonth() + 1, 1));
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return (
                    <Modal visible transparent animationType="fade">
                        <View style={s.calOverlay}>
                            <View style={s.calSheet}>
                                <View style={s.calHeader}>
                                    <TouchableOpacity onPress={() => setShowFilterCalendar(false)} hitSlop={12}>
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
                                        <Text key={label} style={[s.calWeekdayText, (i === 5 || i === 6) && s.calWeekdayWeekend]}>
                                            {label}
                                        </Text>
                                    ))}
                                </View>
                                <View style={s.calGrid}>
                                    {grid.map(({ date, isCurrentMonth }, idx) => {
                                        const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                                        const isPast = dateOnly < today;
                                        const selectable = isCurrentMonth && !isPast;
                                        const selected = filterDate && sameDay(date, filterDate);
                                        return (
                                            <TouchableOpacity
                                                key={idx}
                                                style={[
                                                    s.calDayCell,
                                                    !isCurrentMonth && s.calDayOtherMonth,
                                                    selectable && s.calDayAvailable,
                                                    !selectable && isCurrentMonth && s.calDayUnavailable,
                                                    selected && s.calDaySelected,
                                                ]}
                                                onPress={() => {
                                                    if (selectable) {
                                                        setFilterDate(date);
                                                        setShowFilterCalendar(false);
                                                    }
                                                }}
                                                disabled={!selectable}
                                                activeOpacity={selectable ? 0.7 : 1}
                                            >
                                                <Text
                                                    style={[
                                                        s.calDayNum,
                                                        !isCurrentMonth && s.calDayNumOther,
                                                        selectable && s.calDayNumAvailable,
                                                        !selectable && isCurrentMonth && s.calDayNumUnavailable,
                                                        selected && s.calDayNumSelected,
                                                    ]}
                                                >
                                                    {date.getDate()}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                                <View style={s.calFilterFooter}>
                                    <TouchableOpacity
                                        style={s.calFilterAllBtn}
                                        onPress={() => {
                                            setFilterDate(null);
                                            setShowFilterCalendar(false);
                                        }}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={s.calFilterAllText}>Любая дата</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>
                );
            })()}

            {/* Edit modal */}
            <Modal visible={editModalVisible} animationType="fade" transparent>
                <TouchableOpacity
                    style={[s.modalOverlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
                    activeOpacity={1}
                    onPress={closeEditModal}
                >
                    <TouchableOpacity style={s.modalContent} activeOpacity={1} onPress={() => {}}>
                        <Text style={s.modalTitle}>Изменить бронирование</Text>
                        {editingBooking && (
                            <Text style={s.modalBoat}>{editingBooking.boat_title}</Text>
                        )}
                        <View style={s.modalRow}>
                            <Text style={s.modalLabel}>Дата</Text>
                            <TouchableOpacity style={s.modalValueBtn} onPress={() => setShowCalendarModal(true)}>
                                <Text style={s.modalValue}>{editDate.toLocaleDateString('ru-RU')}</Text>
                            </TouchableOpacity>
                        </View>
                        {showCalendarModal && editingBooking && (() => {
                            let wd = editingBooking.schedule_work_days;
                            if (typeof wd === 'string') try { wd = JSON.parse(wd); } catch { wd = null; }
                            const workDays = wd && typeof wd === 'object' && !wd.dates
                                ? { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: true, ...wd }
                                : { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: true };
                            const workDatesSet = wd?.dates && Array.isArray(wd.dates) ? new Set(wd.dates) : null;
                            const isWorkingDay = (d) => workDatesSet ? workDatesSet.has(toDateKey(d)) : workDays[getWeekdayKey(d)] === true;
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const grid = getCalendarGrid(calendarMonth);
                            const monthTitle = calendarMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
                            const prevMonth = () => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));
                            const nextMonth = () => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));
                            return (
                                <Modal visible transparent animationType="fade">
                                    <View style={s.calOverlay}>
                                        <View style={s.calSheet}>
                                            <View style={s.calHeader}>
                                                <TouchableOpacity onPress={() => setShowCalendarModal(false)} hitSlop={12}>
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
                                                    <Text key={label} style={[s.calWeekdayText, (i === 5 || i === 6) && s.calWeekdayWeekend]}>
                                                        {label}
                                                    </Text>
                                                ))}
                                            </View>
                                            <View style={s.calGrid}>
                                                {grid.map(({ date, isCurrentMonth }, idx) => {
                                                    const key = toDateKey(date);
                                                    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                                                    const isPast = dateOnly < today;
                                                    const working = isWorkingDay(date);
                                                    const unavailable = !working || isPast;
                                                    const selectable = isCurrentMonth && !unavailable;
                                                    const selected = sameDay(date, editDate);
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
                                                                    setEditDate(date);
                                                                    fetchBusyIntervals(date, timeBoatId);
                                                                    setShowCalendarModal(false);
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
                        <View style={s.modalRow}>
                            <Text style={s.modalLabel}>Время</Text>
                            <TouchableOpacity
                                style={s.modalValueBtn}
                                onPress={() => {
                                    fetchBusyIntervals(editDate, timeBoatId);
                                    setShowTimePicker(true);
                                }}
                            >
                                <Text style={s.modalValue}>
                                    {pendingTime || '—'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        {/* Тайм-пикер для изменения времени бронирования */}
                        <Text style={s.modalLabel}>Длительность</Text>
                        <View style={s.durationChips}>
                            {DURATION_OPTIONS.map((mins) => (
                                <TouchableOpacity
                                    key={mins}
                                    style={[s.durationChip, editDuration === mins && s.durationChipActive]}
                                    onPress={() => setEditDuration(mins)}
                                >
                                    <Text style={[s.durationChipText, editDuration === mins && s.durationChipTextActive]}>
                                        {formatDuration(mins)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TouchableOpacity style={s.cancelBookingBtn} onPress={handleCancelBooking}>
                            <Text style={s.cancelBookingText}>Отменить бронирование</Text>
                        </TouchableOpacity>
                        <View style={s.modalActions}>
                            <TouchableOpacity style={s.modalCancelBtn} onPress={closeEditModal}>
                                <Text style={s.modalCancelText}>Закрыть</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={s.modalSaveBtn} onPress={handleSaveEdit}>
                                <Text style={s.modalSaveText}>Сохранить</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>

            {/* ---- Modal: manual booking create ---- */}
            <Modal visible={addModalVisible} animationType="fade" transparent>
                <View style={[s.modalOverlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
                    {/* Фон кликабельный для закрытия модалки; контент должен быть поверх */}
                    <TouchableOpacity
                        style={StyleSheet.absoluteFillObject}
                        activeOpacity={1}
                        onPress={closeAddModal}
                    />
                    <View style={[s.modalContent, s.addModalSheet]}>
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            contentContainerStyle={s.addModalScrollContent}
                        >
                            <Text style={s.modalTitle}>Добавить бронирование вручную</Text>
                            <Text style={s.modalBoat}>Выберите катер, клиента, дату и время</Text>

                        <Text style={s.modalLabel}>Катер</Text>
                        <View style={s.addBoatChips}>
                            {boatOptions.length === 0 ? (
                                <Text style={s.emptyText}>Нет доступных катеров</Text>
                            ) : (
                                boatOptions.map((b) => {
                                    const active = addBoatId != null && Number(addBoatId) === Number(b.id);
                                    return (
                                        <TouchableOpacity
                                            key={String(b.id)}
                                            style={[s.boatChip, active && s.boatChipActive, { marginRight: 0 }]}
                                            onPress={() => {
                                                const boat = findBoatById(b.id);
                                                setAddBoatId(b.id);
                                                setAddPendingTime(null);
                                                setAddPassengers(1);
                                                setAddDuration(Number(boat?.schedule_min_duration) || 60);
                                                const captainIncluded = boat?.captain_included === true || boat?.captain_included === 1 || boat?.captain_included === '1';
                                                setAddCaptain(captainIncluded);
                                            }}
                                            activeOpacity={0.75}
                                        >
                                            <Text style={[s.boatChipText, active && s.boatChipTextActive]}>{b.title}</Text>
                                        </TouchableOpacity>
                                    );
                                })
                            )}
                        </View>

                        <Text style={s.modalLabel}>Телефон клиента</Text>
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
                            {addClientLookupLoading ? (
                                <ActivityIndicator size="small" color={TEAL} />
                            ) : null}
                        </View>
                        {addClientName && <Text style={s.clientFoundText}>Клиент: {addClientName}</Text>}
                        {addClientNotFound && <Text style={s.clientNotFoundText}>Не найден — создадим по телефону</Text>}

                        {addClientNotFound && (
                            <>
                                <Text style={s.modalLabel}>Имя клиента</Text>
                                <TextInput
                                    style={s.addModalNameInput}
                                    value={addClientName ?? ''}
                                    onChangeText={(t) => {
                                        setAddClientName(t);
                                        setAddClientNotFound(true);
                                    }}
                                    placeholder="Например, Иван"
                                    placeholderTextColor={theme.colors.gray400}
                                    editable
                                    autoCorrect={false}
                                />
                            </>
                        )}

                        <View style={s.modalRow}>
                            <Text style={s.modalLabel}>Дата</Text>
                            <TouchableOpacity
                                style={s.modalValueBtn}
                                onPress={() => {
                                    const base = addDate || new Date();
                                    setAddCalendarMonth(new Date(base.getFullYear(), base.getMonth(), 1));
                                    setAddShowCalendarModal(true);
                                }}
                            >
                                <Text style={s.modalValue}>{addDate ? addDate.toLocaleDateString('ru-RU') : '—'}</Text>
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
                                                    <Text key={label} style={[s.calWeekdayText, (i === 5 || i === 6) && s.calWeekdayWeekend]}>
                                                        {label}
                                                    </Text>
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

                        <View style={s.modalRow}>
                            <Text style={s.modalLabel}>Время</Text>
                            <TouchableOpacity
                                style={s.modalValueBtn}
                                onPress={() => {
                                    if (!addBoatId) return Alert.alert('Ошибка', 'Выберите катер');
                                    fetchAddBusyIntervals(addDate, addBoatId);
                                    setAddShowTimePicker(true);
                                }}
                            >
                                <Text style={s.modalValue}>{addPendingTime || '—'}</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={s.modalLabel}>Длительность</Text>
                        <View style={s.durationChips}>
                            {DURATION_OPTIONS.map((mins) => (
                                <TouchableOpacity
                                    key={mins}
                                    style={[s.durationChip, addDuration === mins && s.durationChipActive]}
                                    onPress={() => setAddDuration(mins)}
                                >
                                    <Text style={[s.durationChipText, addDuration === mins && s.durationChipTextActive]}>
                                        {formatDuration(mins)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={s.modalLabel}>Пассажиры</Text>
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

                        <Text style={s.modalLabel}>Капитан</Text>
                        {addBoat ? (() => {
                            const captainIncluded = addBoat?.captain_included === true || addBoat?.captain_included === 1 || addBoat?.captain_included === '1';
                            const captainOptional = addBoat?.has_captain_option === true || addBoat?.has_captain_option === 1 || addBoat?.has_captain_option === '1';
                            if (captainIncluded) {
                                return <Text style={s.clientFoundText}>С капитаном</Text>;
                            }
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

                        <Text style={s.modalPriceLine}>
                            Итого: {(addBoat ? getPriceForDate(addBoat, addDate, addDuration) : 0).toLocaleString('ru-RU')} ₽
                        </Text>

                            <View style={s.modalActions}>
                                <TouchableOpacity style={s.modalCancelBtn} onPress={closeAddModal} disabled={creatingBooking}>
                                    <Text style={s.modalCancelText}>Закрыть</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={s.modalSaveBtn}
                                    onPress={handleSaveAddBooking}
                                    disabled={
                                        creatingBooking
                                        || !addBoatId
                                        || !addClientPhone || !String(addClientPhone).trim()
                                        || !addPendingTime
                                        || !addDate
                                    }
                                    activeOpacity={0.9}
                                >
                                    {creatingBooking ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.modalSaveText}>Создать</Text>}
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Тайм-пикер модальное окно */}
            {showTimePicker && (
                <Modal visible animationType="slide" transparent onRequestClose={() => setShowTimePicker(false)}>
                    <View style={s.timeOverlay}>
                        <View style={[s.timeSheet, { paddingBottom: insets.bottom + 16 }]}>
                            <View style={s.timeHeader}>
                                <TouchableOpacity onPress={() => setShowTimePicker(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                                    <X size={22} color={NAVY} />
                                </TouchableOpacity>
                                <Text style={s.timeHeaderTitle}>Время начала</Text>
                                <View style={{ width: 22 }} />
                            </View>
                            <View style={s.timeHint}>
                                {busySlotsLoading ? (
                                    <ActivityIndicator size="small" color={NAVY} style={{ marginVertical: 4 }} />
                                ) : (
                                    <Text style={s.timeHintText}>Показано текущее доступное время.</Text>
                                )}
                            </View>
                            <ScrollView
                                showsVerticalScrollIndicator={false}
                                style={s.timeScroll}
                                contentContainerStyle={s.timeGrid}
                            >
                                {TIME_SLOTS.map((slot) => {
                                    const isBusy = isSlotInBusyInterval(slot, busyIntervals);
                                    const canStartBase = isStartTimeValid(slot, editDuration, busyIntervals);

                                    const isToday = isSameDayInBookingTz(editDate, new Date());
                                    const nowMinutes = getNowMinutesInBookingTz();
                                    const slotMinutes = slotToMinutes(slot);
                                    const isPastToday = isToday && slotMinutes <= nowMinutes;

                                    const canStart = canStartBase && !isPastToday;
                                    const isSelected = pendingTime === slot;
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
                                            onPress={() => { if (canStart) setPendingTime(slot); }}
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
                                    style={[s.timeApplyBtn, !pendingTime && s.timeApplyBtnDisabled]}
                                    onPress={() => {
                                        if (!pendingTime) return;
                                        const [h, m] = pendingTime.split(':').map(Number);
                                        const d = new Date(editDate);
                                        d.setHours(h, m, 0, 0);
                                        setEditTime(d);
                                        setShowTimePicker(false);
                                    }}
                                    disabled={!pendingTime}
                                    activeOpacity={0.9}
                                >
                                    <Text style={s.timeApplyBtnText}>ПРИМЕНИТЬ</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            )}

            {/* ---- Time picker: manual booking create ---- */}
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
                            <ScrollView
                                showsVerticalScrollIndicator={false}
                                style={s.timeScroll}
                                contentContainerStyle={s.timeGrid}
                            >
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
                                    onPress={() => {
                                        if (!addPendingTime) return;
                                        setAddShowTimePicker(false);
                                    }}
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

            {/* List */}
            <FlatList
                data={filtered}
                renderItem={renderCard}
                keyExtractor={item => String(item.id)}
                contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 100 }]}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} />}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={s.empty}>
                        <Text style={s.emptyText}>{EMPTY_MESSAGES[activeTab]}</Text>
                    </View>
                }
            />
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F5F5F5' },

    headerWrap: { overflow: 'hidden' },
    headerContent: { paddingHorizontal: 24, paddingBottom: 16 },
    headerTitle: { fontSize: 22, fontFamily: theme.fonts.bold, color: '#fff', textAlign: 'center' },
    headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerAddBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(255,255,255,0.18)',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 12,
    },
    headerAddText: { color: '#fff', fontFamily: theme.fonts.semiBold, fontSize: 13 },

    tabsWrap: {
        backgroundColor: '#fff',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#E5E7EB',
    },
    tabsScroll: { paddingHorizontal: 16 },
    tab: {
        paddingVertical: 14, paddingHorizontal: 14,
        borderBottomWidth: 2.5, borderBottomColor: 'transparent',
        marginRight: 4,
    },
    tabActive: { borderBottomColor: TEAL },
    tabText: {
        fontSize: 14, fontFamily: theme.fonts.medium, color: theme.colors.gray400,
        whiteSpace: 'nowrap',
    },
    tabTextActive: { color: TEAL, fontFamily: theme.fonts.semiBold },

    filtersWrap: {
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#E5E7EB',
        gap: 10,
    },
    filterDateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: '#F9FAFB',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    filterDateText: { fontSize: 14, fontFamily: theme.fonts.regular, color: theme.colors.gray500, marginLeft: 8, flex: 1 },
    filterDateTextActive: { color: TEAL, fontFamily: theme.fonts.medium },
    filterBoatChips: { paddingTop: 4, paddingBottom: 2, gap: 8 },
    boatChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#F9FAFB',
        marginRight: 8,
    },
    boatChipActive: {
        backgroundColor: 'rgba(13,92,92,0.08)',
        borderColor: TEAL,
    },
    boatChipText: {
        fontSize: 13,
        fontFamily: theme.fonts.regular,
        color: theme.colors.gray600,
    },
    boatChipTextActive: {
        fontFamily: theme.fonts.semiBold,
        color: TEAL,
    },

    list: { paddingHorizontal: 20, paddingTop: 16 },

    card: {
        backgroundColor: '#fff', borderRadius: 16, padding: 16,
        marginBottom: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 10,
    },
    statusRow: { flexDirection: 'row', alignItems: 'center' },
    statusText: {
        fontSize: 12, fontFamily: theme.fonts.bold, marginLeft: 4,
        letterSpacing: 0.3,
    },
    cardPrice: { fontSize: 20, fontFamily: theme.fonts.bold, color: NAVY },
    cardTitle: { fontSize: 16, fontFamily: theme.fonts.semiBold, color: NAVY, marginBottom: 4 },
    cardClientBlock: {
        marginBottom: 8,
    },
    cardClient: {
        fontSize: 13,
        fontFamily: theme.fonts.regular,
        color: theme.colors.gray500,
    },
    cardClientPhoneWrap: {
        marginTop: 2,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    cardClientPhone: {
        fontSize: 13,
        fontFamily: theme.fonts.medium,
        color: NAVY,
        textDecorationLine: 'underline',
    },
    cardClientChatWrap: {
        marginTop: 4,
    },
    cardClientChat: {
        fontSize: 13,
        fontFamily: theme.fonts.medium,
        color: TEAL,
    },
    cardDetails: { marginTop: 4 },
    detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    detailText: { fontSize: 13, fontFamily: theme.fonts.regular, color: theme.colors.gray500, marginLeft: 6 },

    actionsWrap: { marginTop: 14 },
    editBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 12,
        marginBottom: 10,
    },
    editBtnText: { fontSize: 14, fontFamily: theme.fonts.semiBold, color: TEAL },
    actions: { flexDirection: 'row', gap: 10 },
    acceptBtn: {
        flex: 1, backgroundColor: TEAL, paddingVertical: 12,
        borderRadius: 10, alignItems: 'center',
    },
    acceptText: { fontSize: 14, fontFamily: theme.fonts.bold, color: '#fff' },
    declineBtn: {
        flex: 1, backgroundColor: '#fff', paddingVertical: 12,
        borderRadius: 10, alignItems: 'center',
        borderWidth: 1.2, borderColor: theme.colors.error,
    },
    declineText: { fontSize: 14, fontFamily: theme.fonts.bold, color: theme.colors.error },

    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 160 },
    emptyText: { fontSize: 15, fontFamily: theme.fonts.regular, color: theme.colors.gray400, textAlign: 'center' },

    /* Edit modal */
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 24,
    },
    modalContent: {
        backgroundColor: '#fff', borderRadius: 16, padding: 20,
    },
    /** Карточка ручного бронирования: поверх затемнения (Android touch order) */
    addModalSheet: {
        zIndex: 2,
        elevation: 12,
        maxHeight: '88%',
    },
    addModalScrollContent: {
        paddingBottom: 8,
    },
    modalTitle: { fontSize: 18, fontFamily: theme.fonts.bold, color: NAVY, marginBottom: 4 },
    modalBoat: { fontSize: 14, fontFamily: theme.fonts.regular, color: theme.colors.gray500, marginBottom: 16 },
    modalRow: { marginBottom: 12 },
    modalLabel: { fontSize: 13, fontFamily: theme.fonts.medium, color: theme.colors.gray500, marginBottom: 6 },
    modalValueBtn: { paddingVertical: 10, paddingHorizontal: 14, backgroundColor: '#F3F4F6', borderRadius: 10 },
    modalValue: { fontSize: 15, fontFamily: theme.fonts.medium, color: NAVY },
    durationChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
    durationChip: {
        paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10,
        borderWidth: 1.5, borderColor: '#D1D5DB', backgroundColor: '#fff',
    },
    durationChipActive: { borderColor: TEAL, backgroundColor: 'rgba(13,92,92,0.08)' },
    durationChipText: { fontSize: 14, fontFamily: theme.fonts.medium, color: theme.colors.gray600 },
    durationChipTextActive: { fontFamily: theme.fonts.semiBold, color: TEAL },
    modalActions: { flexDirection: 'row', marginTop: 20, gap: 12 },
    modalCancelBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10 },
    modalCancelText: { fontSize: 15, fontFamily: theme.fonts.semiBold, color: theme.colors.gray600 },
    modalSaveBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: TEAL, borderRadius: 10 },
    modalSaveText: { fontSize: 15, fontFamily: theme.fonts.semiBold, color: '#fff' },

    // ---- Manual booking create styles ----
    addBoatChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    clientLookupRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
    phoneInput: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: '#F3F4F6',
        borderRadius: 10,
        fontFamily: theme.fonts.medium,
        color: NAVY,
    },
    /** Полное имя: без flex:1 — иначе в колонке на Android высота может схлопнуться */
    addModalNameInput: {
        alignSelf: 'stretch',
        minHeight: 48,
        paddingVertical: 12,
        paddingHorizontal: 12,
        marginBottom: 8,
        backgroundColor: '#F3F4F6',
        borderRadius: 10,
        fontFamily: theme.fonts.medium,
        fontSize: 16,
        color: NAVY,
    },
    lookupBtn: {
        backgroundColor: TEAL,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 88,
    },
    lookupBtnText: { color: '#fff', fontFamily: theme.fonts.semiBold, fontSize: 13 },
    clientFoundText: { fontSize: 13, fontFamily: theme.fonts.medium, color: NAVY, marginTop: 4 },
    clientNotFoundText: { fontSize: 13, fontFamily: theme.fonts.medium, color: theme.colors.gray500, marginTop: 4 },
    modalPriceLine: { fontSize: 14, fontFamily: theme.fonts.semiBold, color: NAVY, marginTop: 12, marginBottom: 4 },

    passengerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
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
    stepBtnText: { fontSize: 22, fontFamily: theme.fonts.bold, color: NAVY },
    stepBtnTextDisabled: { color: theme.colors.gray400 },
    passengerText: { flex: 1, textAlign: 'center', fontSize: 14, fontFamily: theme.fonts.semiBold, color: NAVY },

    captainRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
    captainChip: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#fff',
        alignItems: 'center',
    },
    captainChipActive: { borderColor: TEAL, backgroundColor: 'rgba(13,92,92,0.08)' },
    captainChipText: { fontSize: 13, fontFamily: theme.fonts.medium, color: theme.colors.gray600 },
    captainChipTextActive: { color: TEAL, fontFamily: theme.fonts.semiBold },

    cancelBookingBtn: {
        marginTop: 20, paddingVertical: 12, alignItems: 'center',
        borderWidth: 1.2, borderColor: theme.colors.error, borderRadius: 10,
    },
    cancelBookingText: { fontSize: 14, fontFamily: theme.fonts.semiBold, color: theme.colors.error },

    /* Calendar modal */
    calOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    calSheet: {
        width: '100%', maxWidth: 400,
        backgroundColor: '#fff', borderRadius: 20, paddingBottom: 24, paddingHorizontal: 20,
    },
    calHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
    },
    calHeaderTitle: { fontSize: 18, fontFamily: theme.fonts.bold, color: NAVY },
    calMonthRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: 20,
    },
    calArrowBtn: { padding: 8 },
    calMonthTitle: { fontSize: 20, fontFamily: theme.fonts.bold, color: NAVY, textTransform: 'capitalize' },
    calWeekdayRow: { flexDirection: 'row', marginBottom: 8 },
    calWeekdayText: {
        flex: 1, textAlign: 'center', fontSize: 13, fontFamily: theme.fonts.medium, color: theme.colors.gray500,
    },
    calWeekdayWeekend: { color: theme.colors.primary || TEAL },
    calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    calDayCell: {
        width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', marginVertical: 2,
    },
    calDayOtherMonth: { opacity: 0.35 },
    calDayAvailable: { backgroundColor: '#ECFDF5' },
    calDayUnavailable: { backgroundColor: '#FEF2F2' },
    calDaySelected: { backgroundColor: NAVY, borderRadius: 999 },
    calDayNum: { fontSize: 16, fontFamily: theme.fonts.medium, color: NAVY },
    calDayNumOther: { color: theme.colors.gray400 },
    calDayNumAvailable: { color: '#10B981' },
    calDayNumUnavailable: { color: theme.colors.error },
    calDayNumSelected: { color: '#fff', fontFamily: theme.fonts.bold },

    calFilterFooter: {
        marginTop: 16,
        paddingHorizontal: 4,
    },
    calFilterAllBtn: {
        paddingVertical: 10,
        borderRadius: 999,
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
    },
    calFilterAllText: {
        fontSize: 14,
        fontFamily: theme.fonts.semiBold,
        color: NAVY,
    },

    /* Time picker modal (owner) */
    timeOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    timeSheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 16,
        paddingHorizontal: 20,
        maxHeight: '80%',
    },
    timeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    timeHeaderTitle: {
        fontSize: 18,
        fontFamily: theme.fonts.bold,
        color: NAVY,
    },
    timeHint: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        marginBottom: 12,
    },
    timeHintText: {
        fontSize: 13,
        fontFamily: theme.fonts.regular,
        color: theme.colors.gray500,
        textAlign: 'center',
    },
    timeScroll: {
        maxHeight: 360,
        marginBottom: 8,
    },
    timeGrid: {
        paddingVertical: 4,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    timeSlot: {
        width: '47%',
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
    },
    timeSlotAvailable: {
        backgroundColor: '#ECFDF5',
        borderColor: '#6EE7B7',
    },
    timeSlotBusy: {
        backgroundColor: '#FEE2E2',
        borderColor: '#FCA5A5',
    },
    timeSlotSelected: {
        backgroundColor: '#E5ECFF',
        borderColor: NAVY,
    },
    timeSlotText: {
        fontSize: 15,
        fontFamily: theme.fonts.medium,
        color: NAVY,
    },
    timeSlotTextAvailable: {
        color: TEAL,
    },
    timeSlotTextBusy: {
        color: theme.colors.error,
    },
    timeSlotTextSelected: {
        color: NAVY,
        fontFamily: theme.fonts.semiBold,
    },
    timeFooter: {
        paddingTop: 4,
        paddingBottom: 8,
    },
    timeApplyBtn: {
        backgroundColor: NAVY,
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
    },
    timeApplyBtnDisabled: {
        opacity: 0.5,
    },
    timeApplyBtnText: {
        fontSize: 15,
        fontFamily: theme.fonts.semiBold,
        color: '#fff',
    },
});

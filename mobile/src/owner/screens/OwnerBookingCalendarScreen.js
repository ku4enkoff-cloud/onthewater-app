import React, { useEffect, useMemo, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, RefreshControl, Linking, Modal, Alert, Platform, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Calendar, Ship, X } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme } from '../../shared/theme';
import { api } from '../../shared/infrastructure/api';

let LinearGradient;
try { LinearGradient = require('expo-linear-gradient').LinearGradient; } catch (_) {}

const GRADIENT = ['#0A3D3D', '#0D5C5C', '#1A7A6E', '#3A9E7A'];
const TEAL = '#0D5C5C';
const NAVY = '#1B365D';

const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const TIME_SLOTS = [];
for (let h = 0; h < 24; h++) {
    TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`);
    TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`);
}

const toDateKey = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const getCalendarGrid = (monthDate) => {
    const y = monthDate.getFullYear();
    const m = monthDate.getMonth();
    const first = new Date(y, m, 1);
    const start = new Date(first);
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

const formatDuration = (mins) => {
    const m = Number(mins);
    if (!Number.isFinite(m) || m <= 0) return '—';
    if (m < 60) return `${m} мин`;
    const h = Math.floor(m / 60);
    const min = m % 60;
    if (!min) return `${h} ч`;
    return `${h} ч ${min} мин`;
};

const getDurationOptionsFromBoat = (boat) => {
    if (!boat) return [60];
    const minDuration = Number(boat.schedule_min_duration) || 60;
    const tiersRaw = boat.price_tiers;
    let tiers = [];
    if (Array.isArray(tiersRaw)) tiers = tiersRaw;
    else if (typeof tiersRaw === 'string') {
        try { tiers = JSON.parse(tiersRaw || '[]'); } catch { tiers = []; }
    }
    const set = new Set([minDuration]);
    if (Array.isArray(tiers) && tiers.length > 0) {
        tiers.forEach((t) => {
            const d = Number(t.duration) || 0;
            if (d > 0) set.add(d);
        });
    }
    return [...set].sort((a, b) => a - b);
};

const slotToMinutes = (slot) => {
    const [h, m] = String(slot || '0:0').split(':').map(Number);
    return (Number(h) || 0) * 60 + (Number(m) || 0);
};

const isSlotInBusyInterval = (slot, busyIntervals = []) => {
    const t = slotToMinutes(slot);
    return busyIntervals.some((b) => {
        const start = slotToMinutes(b.start);
        const end = slotToMinutes(b.end);
        return t >= start && t < end;
    });
};

const isStartTimeValid = (slot, durationMin, busyIntervals = []) => {
    if (isSlotInBusyInterval(slot, busyIntervals)) return false;
    const startMin = slotToMinutes(slot);
    const endMin = startMin + Number(durationMin || 0);
    return busyIntervals.every((b) => {
        const bStart = slotToMinutes(b.start);
        const bEnd = slotToMinutes(b.end);
        return endMin <= bStart || startMin >= bEnd;
    });
};

const parseHoursObject = (value) => {
    let v = value;
    if (typeof v === 'string') {
        try { v = JSON.parse(v); } catch { v = null; }
    }
    if (!v || typeof v !== 'object') return null;
    const start = typeof v.start === 'string' ? v.start : null;
    const end = typeof v.end === 'string' ? v.end : null;
    if (!start || !end) return null;
    return { start, end };
};

const getBoatWorkHoursForDate = (boat, date) => {
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const weekday = parseHoursObject(boat?.schedule_weekday_hours);
    const weekend = parseHoursObject(boat?.schedule_weekend_hours);
    const selected = isWeekend ? (weekend || weekday) : (weekday || weekend);
    return selected || { start: '09:00', end: '21:00' };
};

export default function OwnerBookingCalendarScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const [boats, setBoats] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [selectedBoatId, setSelectedBoatId] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [calendarMonth, setCalendarMonth] = useState(() => new Date());
    const [refreshing, setRefreshing] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingBooking, setEditingBooking] = useState(null);
    const [editDate, setEditDate] = useState(new Date());
    const [editTime, setEditTime] = useState(new Date());
    const [editDuration, setEditDuration] = useState(60);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [pendingTime, setPendingTime] = useState(null);
    const [busyIntervals, setBusyIntervals] = useState([]);
    const [busySlotsLoading, setBusySlotsLoading] = useState(false);

    const loadData = async () => {
        try {
            const [boatsRes, bookingsRes] = await Promise.all([
                api.get('/boats'),
                api.get('/owner/bookings'),
            ]);
            const boatsList = Array.isArray(boatsRes.data) ? boatsRes.data : [];
            const bookingsList = Array.isArray(bookingsRes.data) ? bookingsRes.data : [];
            setBoats(boatsList);
            setBookings(bookingsList);
            if (boatsList.length > 0 && selectedBoatId == null) setSelectedBoatId(boatsList[0].id);
        } catch (_) {
            setBoats([]);
            setBookings([]);
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const durationOptions = useMemo(() => {
        if (!editingBooking) return [60];
        const boat = boats.find((b) => Number(b.id) === Number(editingBooking.boat_id));
        return getDurationOptionsFromBoat(boat);
    }, [boats, editingBooking]);

    const openEditModal = (booking) => {
        const startAt = booking.start_at || booking.date_start;
        const dt = startAt ? new Date(startAt) : new Date();
        setEditingBooking(booking);
        setEditDate(dt);
        setEditTime(dt);
        setEditDuration(Number(booking.hours) || 60);
        setPendingTime(
            `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`
        );
        setEditModalVisible(true);
    };

    const closeEditModal = () => {
        setEditModalVisible(false);
        setEditingBooking(null);
        setShowDatePicker(false);
        setShowTimePicker(false);
    };

    const fetchBusyIntervals = async (date, boatId) => {
        if (!date || !boatId) {
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

    const handleSaveEdit = async () => {
        if (!editingBooking) return;
        try {
            const start = new Date(editDate);
            const [h, m] = String(pendingTime || '').split(':').map(Number);
            start.setHours(Number.isFinite(h) ? h : editTime.getHours(), Number.isFinite(m) ? m : editTime.getMinutes(), 0, 0);
            const res = await api.patch(`/bookings/${editingBooking.id}`, {
                start_at: start.toISOString(),
                hours: editDuration,
            });
            const updated = res.data || {};
            setBookings((prev) => prev.map((b) => (b.id === editingBooking.id ? { ...b, ...updated } : b)));
            closeEditModal();
        } catch (e) {
            Alert.alert('Ошибка', e?.response?.data?.error || e?.message || 'Не удалось сохранить изменения');
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
                            setBookings((prev) => prev.map((b) => (b.id === editingBooking.id ? { ...b, status: 'cancelled' } : b)));
                            closeEditModal();
                        } catch (e) {
                            Alert.alert('Ошибка', e?.response?.data?.error || 'Не удалось отменить бронирование');
                        }
                    },
                },
            ]
        );
    };

    const filteredBookings = useMemo(() => {
        if (selectedBoatId == null || !selectedDate) return [];
        const key = toDateKey(selectedDate);
        return bookings
            .filter((b) => Number(b.boat_id) === Number(selectedBoatId))
            .filter((b) => {
                const src = b.start_at || b.date_start;
                if (!src) return false;
                return toDateKey(new Date(src)) === key;
            })
            .sort((a, b) => new Date(a.start_at || a.date_start) - new Date(b.start_at || b.date_start));
    }, [bookings, selectedBoatId, selectedDate]);

    const availableTimeSlots = useMemo(() => {
        if (!editingBooking) return TIME_SLOTS;
        const boat = boats.find((b) => Number(b.id) === Number(editingBooking.boat_id));
        const hours = getBoatWorkHoursForDate(boat, editDate);
        const startMin = slotToMinutes(hours.start);
        const endMin = slotToMinutes(hours.end);
        return TIME_SLOTS.filter((slot) => {
            const m = slotToMinutes(slot);
            return m >= startMin && m < endMin;
        });
    }, [boats, editingBooking, editDate]);

    const bookedDateKeys = useMemo(() => {
        if (selectedBoatId == null) return new Set();
        const keys = new Set();
        bookings
            .filter((b) => Number(b.boat_id) === Number(selectedBoatId))
            .forEach((b) => {
                const src = b.start_at || b.date_start;
                if (!src) return;
                keys.add(toDateKey(new Date(src)));
            });
        return keys;
    }, [bookings, selectedBoatId]);

    const monthTitle = calendarMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
    const grid = getCalendarGrid(calendarMonth);

    return (
        <View style={s.root}>
            <View style={s.headerWrap}>
                {LinearGradient ? (
                    <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
                ) : (
                    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: TEAL }]} />
                )}
                <View style={[s.headerContent, { paddingTop: insets.top + 12 }]}>
                    <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                        <ChevronLeft size={22} color="#fff" />
                        <Text style={s.backText}>Назад</Text>
                    </TouchableOpacity>
                    <Text style={s.headerTitle}>Календарь бронирований</Text>
                    <Text style={s.headerSub}>Выберите судно и дату</Text>
                </View>
            </View>

            <ScrollView
                style={s.body}
                contentContainerStyle={{ paddingBottom: insets.bottom + 18 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} />}
            >
                <View style={s.section}>
                    <View style={s.sectionTitleRow}>
                        <Ship size={16} color={NAVY} />
                        <Text style={s.sectionTitle}>Судно</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.boatRow}>
                        {boats.map((boat) => {
                            const active = Number(selectedBoatId) === Number(boat.id);
                            return (
                                <TouchableOpacity
                                    key={boat.id}
                                    style={[s.boatChip, active && s.boatChipActive]}
                                    onPress={() => setSelectedBoatId(boat.id)}
                                    activeOpacity={0.75}
                                >
                                    <Text style={[s.boatChipText, active && s.boatChipTextActive]} numberOfLines={1}>
                                        {boat.title || 'Без названия'}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                <View style={s.section}>
                    <View style={s.sectionTitleRow}>
                        <Calendar size={16} color={NAVY} />
                        <Text style={s.sectionTitle}>Дата</Text>
                    </View>
                    <View style={s.calWrap}>
                        <View style={s.calMonthRow}>
                            <TouchableOpacity onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))} style={s.calArrowBtn}>
                                <ChevronLeft size={22} color={NAVY} />
                            </TouchableOpacity>
                            <Text style={s.calMonthTitle}>{monthTitle}</Text>
                            <TouchableOpacity onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))} style={s.calArrowBtn}>
                                <ChevronRight size={22} color={NAVY} />
                            </TouchableOpacity>
                        </View>
                        <View style={s.weekdays}>
                            {WEEKDAY_LABELS.map((w) => (
                                <Text key={w} style={s.weekdayText}>{w}</Text>
                            ))}
                        </View>
                        <View style={s.grid}>
                            {grid.map(({ date, isCurrentMonth }, idx) => {
                                const selected = toDateKey(date) === toDateKey(selectedDate);
                                const hasBooking = isCurrentMonth && bookedDateKeys.has(toDateKey(date));
                                return (
                                    <TouchableOpacity
                                        key={idx}
                                        style={[
                                            s.dayCell,
                                            !isCurrentMonth && s.dayCellOther,
                                            hasBooking && !selected && s.dayCellBooked,
                                            selected && s.dayCellSelected,
                                        ]}
                                        onPress={() => setSelectedDate(date)}
                                        activeOpacity={0.75}
                                    >
                                        <Text
                                            style={[
                                                s.dayText,
                                                !isCurrentMonth && s.dayTextOther,
                                                hasBooking && !selected && s.dayTextBooked,
                                                selected && s.dayTextSelected,
                                            ]}
                                        >
                                            {date.getDate()}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                </View>

                <View style={s.section}>
                    <Text style={s.sectionTitle}>Бронирования на {selectedDate.toLocaleDateString('ru-RU')}</Text>
                    <FlatList
                        data={filteredBookings}
                        keyExtractor={(item) => String(item.id)}
                        scrollEnabled={false}
                        ListEmptyComponent={<Text style={s.emptyText}>На выбранную дату бронирований нет.</Text>}
                        renderItem={({ item }) => {
                            const start = item.start_at || item.date_start;
                            const startText = start
                                ? new Date(start).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
                                : '—';
                            const phoneRaw =
                                item.client_phone ||
                                item.phone ||
                                item.user_phone ||
                                item.user?.phone ||
                                null;
                            const digits = String(phoneRaw || '').replace(/\D/g, '');
                            const phoneDisplay = digits.length >= 11
                                ? `+${digits[0]} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`
                                : (phoneRaw || '—');
                            const telNumber = digits ? `+${digits}` : String(phoneRaw || '').trim();
                            return (
                                <View style={s.bookingCard}>
                                    <View style={s.bookingHeader}>
                                        <Text style={s.bookingTitle}>{item.boat_title || 'Катер'}</Text>
                                        <Text style={s.bookingPrice}>{Number(item.total_price || 0).toLocaleString('ru-RU')} ₽</Text>
                                    </View>
                                    <Text style={s.bookingLine}>Время: {startText}</Text>
                                    <Text style={s.bookingLine}>Длительность: {formatDuration(item.hours)}</Text>
                                    <Text style={s.bookingLine}>Клиент: {item.client_name || '—'}</Text>
                                    {phoneRaw ? (
                                        <TouchableOpacity
                                            onPress={() => Linking.openURL(`tel:${telNumber}`).catch(() => {})}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[s.bookingLine, s.bookingPhone]}>Телефон: {phoneDisplay}</Text>
                                        </TouchableOpacity>
                                    ) : (
                                        <Text style={s.bookingLine}>Телефон: —</Text>
                                    )}
                                    {(item.status === 'pending' || item.status === 'confirmed') && (
                                        <TouchableOpacity style={s.editBtn} onPress={() => openEditModal(item)} activeOpacity={0.8}>
                                            <Text style={s.editBtnText}>Изменить</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            );
                        }}
                    />
                </View>
            </ScrollView>

            <Modal visible={editModalVisible} transparent animationType="fade" onRequestClose={closeEditModal}>
                <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={closeEditModal}>
                    <TouchableOpacity style={s.modalContent} activeOpacity={1} onPress={() => {}}>
                        <Text style={s.modalTitle}>Изменить бронирование</Text>
                        <Text style={s.modalBoat}>{editingBooking?.boat_title || 'Катер'}</Text>

                        <Text style={s.modalLabel}>Дата</Text>
                        <TouchableOpacity style={s.modalValueBtn} onPress={() => setShowDatePicker(true)}>
                            <Text style={s.modalValue}>{editDate.toLocaleDateString('ru-RU')}</Text>
                        </TouchableOpacity>

                        <Text style={[s.modalLabel, { marginTop: 12 }]}>Время</Text>
                        <TouchableOpacity
                            style={s.modalValueBtn}
                            onPress={() => {
                                fetchBusyIntervals(editDate, editingBooking?.boat_id);
                                setShowTimePicker(true);
                            }}
                        >
                            <Text style={s.modalValue}>
                                {pendingTime || editTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        </TouchableOpacity>

                        <Text style={[s.modalLabel, { marginTop: 12 }]}>Длительность</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.durationRow}>
                            {durationOptions.map((mins) => (
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
                        </ScrollView>

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

            {showDatePicker && (
                <DateTimePicker
                    value={editDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(_, date) => {
                        setShowDatePicker(false);
                        if (date) setEditDate(date);
                    }}
                />
            )}

            {showTimePicker && (
                <Modal visible transparent animationType="slide" onRequestClose={() => setShowTimePicker(false)}>
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
                                    <Text style={s.timeHintText}>Показано доступное время для выбранной даты.</Text>
                                )}
                            </View>
                            <ScrollView showsVerticalScrollIndicator={false} style={s.timeScroll} contentContainerStyle={s.timeGrid}>
                                {availableTimeSlots.map((slot) => {
                                    const canStartBase = isStartTimeValid(slot, editDuration, busyIntervals);
                                    const now = new Date();
                                    const isToday = toDateKey(editDate) === toDateKey(now);
                                    const isPastToday = isToday && slotToMinutes(slot) <= (now.getHours() * 60 + now.getMinutes());
                                    const boat = boats.find((b) => Number(b.id) === Number(editingBooking?.boat_id));
                                    const hours = getBoatWorkHoursForDate(boat, editDate);
                                    const workEndMin = slotToMinutes(hours.end);
                                    const fitsWorkEnd = slotToMinutes(slot) + Number(editDuration || 0) <= workEndMin;
                                    const canStart = canStartBase && !isPastToday && fitsWorkEnd;
                                    const isBusy = isSlotInBusyInterval(slot, busyIntervals) || isPastToday;
                                    const isSelected = pendingTime === slot;
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
                                            disabled={!canStart}
                                            activeOpacity={canStart ? 0.7 : 1}
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
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F5F5F5' },
    headerWrap: { overflow: 'hidden' },
    headerContent: { paddingHorizontal: 20, paddingBottom: 14 },
    backBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginBottom: 8 },
    backText: { color: '#fff', fontSize: 15, fontFamily: theme.fonts.regular, marginLeft: 2 },
    headerTitle: { color: '#fff', fontSize: 22, fontFamily: theme.fonts.bold },
    headerSub: { color: 'rgba(255,255,255,0.82)', marginTop: 4, fontSize: 14, fontFamily: theme.fonts.regular },
    body: { flex: 1 },
    section: { paddingHorizontal: 16, marginTop: 14 },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    sectionTitle: { marginLeft: 6, color: NAVY, fontSize: 16, fontFamily: theme.fonts.semiBold },
    boatRow: { gap: 8, paddingRight: 4 },
    boatChip: {
        borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 999, backgroundColor: '#fff',
        paddingVertical: 8, paddingHorizontal: 12, marginRight: 8,
    },
    boatChipActive: { borderColor: TEAL, backgroundColor: 'rgba(13,92,92,0.08)' },
    boatChipText: { color: theme.colors.gray500, fontFamily: theme.fonts.regular, fontSize: 13 },
    boatChipTextActive: { color: TEAL, fontFamily: theme.fonts.semiBold },
    calWrap: { backgroundColor: '#fff', borderRadius: 14, padding: 10 },
    calMonthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    calArrowBtn: { padding: 4 },
    calMonthTitle: { color: NAVY, fontFamily: theme.fonts.bold, fontSize: 18, textTransform: 'capitalize' },
    weekdays: { flexDirection: 'row', justifyContent: 'space-between' },
    weekdayText: { width: '13.2%', textAlign: 'center', color: theme.colors.gray500, fontSize: 12, fontFamily: theme.fonts.medium, marginBottom: 6 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    dayCell: {
        width: '13.2%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10,
        marginBottom: 4,
    },
    dayCellOther: { opacity: 0.45 },
    dayCellBooked: { backgroundColor: '#ECFDF5' },
    dayCellSelected: { backgroundColor: NAVY },
    dayText: { color: NAVY, fontFamily: theme.fonts.medium, fontSize: 14 },
    dayTextOther: { color: theme.colors.gray500 },
    dayTextBooked: { color: '#10B981', fontFamily: theme.fonts.semiBold },
    dayTextSelected: { color: '#fff', fontFamily: theme.fonts.bold },
    emptyText: { color: theme.colors.gray500, fontFamily: theme.fonts.regular, marginTop: 8 },
    bookingCard: {
        marginTop: 8, backgroundColor: '#fff', borderRadius: 12, padding: 12,
        borderWidth: 1, borderColor: '#ECEFF3',
    },
    bookingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    bookingTitle: { color: NAVY, fontSize: 15, fontFamily: theme.fonts.semiBold, flex: 1, marginRight: 8 },
    bookingPrice: { color: NAVY, fontSize: 15, fontFamily: theme.fonts.bold },
    bookingLine: { color: theme.colors.gray500, fontSize: 13, fontFamily: theme.fonts.regular, marginTop: 2 },
    bookingPhone: { color: TEAL, textDecorationLine: 'underline', fontFamily: theme.fonts.medium },
    editBtn: {
        marginTop: 10,
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(13,92,92,0.08)',
        borderWidth: 1,
        borderColor: TEAL,
        borderRadius: 10,
        paddingVertical: 8,
        paddingHorizontal: 14,
    },
    editBtnText: { color: TEAL, fontFamily: theme.fonts.semiBold, fontSize: 14 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 20 },
    modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 18 },
    modalTitle: { fontSize: 20, color: NAVY, fontFamily: theme.fonts.bold, marginBottom: 4 },
    modalBoat: { fontSize: 15, color: theme.colors.gray500, fontFamily: theme.fonts.regular, marginBottom: 14 },
    modalLabel: { fontSize: 14, color: theme.colors.gray500, fontFamily: theme.fonts.medium, marginBottom: 6 },
    modalValueBtn: { backgroundColor: '#F3F4F6', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 12 },
    modalValue: { color: NAVY, fontFamily: theme.fonts.semiBold, fontSize: 16 },
    durationRow: { gap: 8, paddingTop: 2, paddingBottom: 2 },
    durationChip: {
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#D1D5DB',
        backgroundColor: '#fff',
        marginRight: 8,
    },
    durationChipActive: { borderColor: TEAL, backgroundColor: 'rgba(13,92,92,0.08)' },
    durationChipText: { color: '#111827', fontSize: 14, fontFamily: theme.fonts.medium },
    durationChipTextActive: { color: TEAL, fontFamily: theme.fonts.semiBold },
    cancelBookingBtn: {
        marginTop: 16,
        borderWidth: 1.4,
        borderColor: '#EF4444',
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
    },
    cancelBookingText: { color: '#EF4444', fontFamily: theme.fonts.semiBold, fontSize: 16 },
    modalActions: { flexDirection: 'row', marginTop: 14, gap: 10 },
    modalCancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
    modalCancelText: { color: '#111827', fontFamily: theme.fonts.semiBold, fontSize: 16 },
    modalSaveBtn: { flex: 1, backgroundColor: TEAL, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
    modalSaveText: { color: '#fff', fontFamily: theme.fonts.semiBold, fontSize: 16 },
    timeOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    timeSheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 16,
        paddingHorizontal: 20,
        maxHeight: '80%',
    },
    timeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    timeHeaderTitle: { fontSize: 18, fontFamily: theme.fonts.bold, color: NAVY },
    timeHint: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        marginBottom: 12,
    },
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
    timeSlotSelected: { backgroundColor: '#E5ECFF', borderColor: NAVY },
    timeSlotText: { fontSize: 15, fontFamily: theme.fonts.medium, color: NAVY },
    timeSlotTextAvailable: { color: TEAL },
    timeSlotTextBusy: { color: theme.colors.error },
    timeSlotTextSelected: { color: NAVY, fontFamily: theme.fonts.semiBold },
    timeFooter: { paddingTop: 4, paddingBottom: 8 },
    timeApplyBtn: { backgroundColor: NAVY, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
    timeApplyBtnDisabled: { opacity: 0.5 },
    timeApplyBtnText: { fontSize: 15, fontFamily: theme.fonts.semiBold, color: '#fff' },
});

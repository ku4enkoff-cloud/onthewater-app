import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    RefreshControl, ScrollView, Modal, Alert, Platform, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, Pencil, ChevronLeft, ChevronRight, X, Ship } from 'lucide-react-native';
import { theme } from '../../shared/theme';
import { api } from '../../shared/infrastructure/api';

const DURATION_OPTIONS = [30, 60, 90, 120, 180, 240];

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
    const [bookings, setBookings] = useState([]);
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
    const [showFilterDatePicker, setShowFilterDatePicker] = useState(false);

    useEffect(() => { fetchBookings(); }, []);

    const fetchBookings = async () => {
        try {
            const res = await api.get('/owner/bookings');
            setBookings(Array.isArray(res.data) ? res.data : []);
        } catch (_) {
            setBookings([]);
        } finally {
            setRefreshing(false);
        }
    };

    const onRefresh = () => { setRefreshing(true); fetchBookings(); };

    const VISIBLE_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'];
    const boatOptions = (() => {
        const map = new Map();
        bookings.forEach((b) => {
            if (!b.boat_id || !b.boat_title) return;
            if (!map.has(b.boat_id)) {
                map.set(b.boat_id, String(b.boat_title));
            }
        });
        return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
    })();

    const filtered = bookings.filter((b) => {
        if (!VISIBLE_STATUSES.includes(b.status)) return false;
        if (activeTab !== 'all' && b.status !== activeTab) return false;
        if (filterDate != null) {
            const start = b.start_at || b.date_start;
            if (!start) return false;
            const d = new Date(start);
            if (d.getFullYear() !== filterDate.getFullYear() || d.getMonth() !== filterDate.getMonth() || d.getDate() !== filterDate.getDate()) return false;
        }
        if (filterBoatId != null && b.boat_id !== filterBoatId) return false;
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

    const openEditModal = (item) => {
        const startAt = item.start_at || item.date_start;
        const d = startAt ? new Date(startAt) : new Date();
        setEditingBooking(item);
        setEditDate(d);
        setEditTime(d);
        setEditDuration(Number(item.hours) || 60);
        setCalendarMonth(new Date(d.getFullYear(), d.getMonth(), 1));
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
            const dateStr = editDate.toISOString().split('T')[0];
            const timeStr = `${String(editTime.getHours()).padStart(2, '0')}:${String(editTime.getMinutes()).padStart(2, '0')}`;
            const start_at = `${dateStr}T${timeStr}:00`;
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
        if (!d) return '—';
        const date = new Date(d);
        return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
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
                <Text style={s.cardClient}>Клиент: {item.client_name || '—'}</Text>
                <View style={s.cardDetails}>
                    <View style={s.detailRow}>
                        <Calendar size={14} color={theme.colors.gray400} />
                        <Text style={s.detailText}>{formatDate(item.start_at || item.date_start)}</Text>
                    </View>
                    <View style={s.detailRow}>
                        <Clock size={14} color={theme.colors.gray400} />
                        <Text style={s.detailText}>{formatDuration(item.hours)}</Text>
                    </View>
                    <Text style={s.detailText}>
                        Гостей: {item.passengers || item.guests_count || '—'} • Капитан: {(item.captain || item.captain_requested) ? 'Да' : 'Нет'}
                    </Text>
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
                    <Text style={s.headerTitle}>Бронирования</Text>
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
                    onPress={() => setShowFilterDatePicker(true)}
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
            {showFilterDatePicker && (
                <DateTimePicker
                    value={filterDate || new Date()}
                    mode="date"
                    onChange={(_, d) => {
                        setFilterDate(d || null);
                        if (Platform.OS === 'android') setShowFilterDatePicker(false);
                    }}
                />
            )}
            {showFilterDatePicker && Platform.OS === 'ios' && (
                <View style={s.filterDatePickerBar}>
                    <TouchableOpacity onPress={() => setShowFilterDatePicker(false)}>
                        <Text style={s.filterDatePickerDone}>Готово</Text>
                    </TouchableOpacity>
                </View>
            )}

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
                                                    const isPast = date < today;
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
                            <TouchableOpacity style={s.modalValueBtn} onPress={() => setShowTimePicker(true)}>
                                <Text style={s.modalValue}>
                                    {String(editTime.getHours()).padStart(2, '0')}:{String(editTime.getMinutes()).padStart(2, '0')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        {showTimePicker && (
                            <DateTimePicker
                                value={editTime}
                                mode="time"
                                onChange={(_, t) => { setEditTime(t || editTime); if (Platform.OS === 'android') setShowTimePicker(false); }}
                            />
                        )}
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
    filterDatePickerBar: {
        backgroundColor: '#fff',
        paddingVertical: 12,
        paddingHorizontal: 20,
        alignItems: 'flex-end',
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: '#E5E7EB',
    },
    filterDatePickerDone: { fontSize: 16, fontFamily: theme.fonts.semiBold, color: TEAL },

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
    cardClient: { fontSize: 13, fontFamily: theme.fonts.regular, color: theme.colors.gray500, marginBottom: 8 },
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
});

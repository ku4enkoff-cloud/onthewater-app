import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ScrollView,
    Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { theme } from '../../shared/theme';

const NAVY = '#1B365D';
const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

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
            grid.push({
                date: cell,
                isCurrentMonth: cell.getMonth() === m,
            });
        }
    }
    return grid;
};

export default function DatePickerModal({ visible, onClose, initialDate = null, onSelect }) {
    const insets = useSafeAreaInsets();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [selectedDate, setSelectedDate] = useState(
        () => initialDate ? new Date(initialDate) : new Date()
    );
    const [viewMonth, setViewMonth] = useState(() => {
        const d = initialDate ? new Date(initialDate) : new Date();
        return new Date(d.getFullYear(), d.getMonth(), 1);
    });

    useEffect(() => {
        if (visible) {
            const d = initialDate ? new Date(initialDate) : new Date();
            setSelectedDate(d);
            setViewMonth(new Date(d.getFullYear(), d.getMonth(), 1));
        }
    }, [visible, initialDate]);

    const prevMonth = () => {
        setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
    };
    const nextMonth = () => {
        setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
    };

    const monthTitle = viewMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
    const grid = getCalendarGrid(viewMonth);

    const handleApply = () => {
        onSelect?.(selectedDate);
        onClose?.();
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={onClose}
        >
            <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={onClose}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                        <ChevronLeft size={24} color={NAVY} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Дата поездки</Text>
                    <View style={{ width: 24 }} />
                </View>

                <View style={styles.monthRow}>
                    <TouchableOpacity onPress={prevMonth} style={styles.arrowBtn}>
                        <ChevronLeft size={24} color={NAVY} />
                    </TouchableOpacity>
                    <Text style={styles.monthTitle}>{monthTitle}</Text>
                    <TouchableOpacity onPress={nextMonth} style={styles.arrowBtn}>
                        <ChevronRight size={24} color={NAVY} />
                    </TouchableOpacity>
                </View>

                <View style={styles.weekdayRow}>
                    {WEEKDAY_LABELS.map((label, i) => (
                        <Text
                            key={label}
                            style={[styles.weekdayText, (i === 5 || i === 6) && styles.weekdayWeekend]}
                        >
                            {label}
                        </Text>
                    ))}
                </View>

                <View style={styles.grid}>
                    {grid.map(({ date, isCurrentMonth }, idx) => {
                        const isPast = date < today;
                        const selectable = isCurrentMonth && !isPast;
                        const selected = sameDay(date, selectedDate);
                        return (
                            <TouchableOpacity
                                key={idx}
                                style={[
                                    styles.dayCell,
                                    !isCurrentMonth && styles.dayOtherMonth,
                                    selectable && styles.dayAvailable,
                                    !selectable && isCurrentMonth && styles.dayUnavailable,
                                    selected && styles.daySelected,
                                ]}
                                onPress={() => selectable && setSelectedDate(date)}
                                disabled={!selectable}
                                activeOpacity={selectable ? 0.7 : 1}
                            >
                                <Text
                                    style={[
                                        styles.dayNum,
                                        !isCurrentMonth && styles.dayNumOther,
                                        selectable && styles.dayNumAvailable,
                                        !selectable && isCurrentMonth && styles.dayNumUnavailable,
                                        selected && styles.dayNumSelected,
                                    ]}
                                >
                                    {date.getDate()}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <TouchableOpacity
                    style={styles.applyBtn}
                    onPress={handleApply}
                    activeOpacity={0.9}
                >
                    <Text style={styles.applyBtnText}>ПОИСК</Text>
                </TouchableOpacity>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        paddingHorizontal: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: theme.fonts.bold,
        color: NAVY,
    },
    monthRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 20,
    },
    arrowBtn: { padding: 8 },
    monthTitle: {
        fontSize: 20,
        fontFamily: theme.fonts.bold,
        color: NAVY,
        textTransform: 'capitalize',
    },
    weekdayRow: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    weekdayText: {
        flex: 1,
        textAlign: 'center',
        fontSize: 13,
        fontFamily: theme.fonts.medium,
        color: theme.colors.gray500,
    },
    weekdayWeekend: { color: NAVY },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 24,
    },
    dayCell: {
        width: '14.28%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 2,
    },
    dayOtherMonth: { opacity: 0.35 },
    dayAvailable: { backgroundColor: 'rgba(27,54,93,0.06)' },
    dayUnavailable: { opacity: 0.5 },
    daySelected: { backgroundColor: NAVY, borderRadius: 999 },
    dayNum: { fontSize: 16, fontFamily: theme.fonts.medium, color: NAVY },
    dayNumOther: { color: theme.colors.gray400 },
    dayNumAvailable: { color: NAVY },
    dayNumUnavailable: { color: theme.colors.gray400 },
    dayNumSelected: { color: '#fff', fontFamily: theme.fonts.bold },
    applyBtn: {
        backgroundColor: NAVY,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    applyBtnText: {
        fontSize: 15,
        fontFamily: theme.fonts.bold,
        color: '#fff',
        letterSpacing: 1,
    },
});

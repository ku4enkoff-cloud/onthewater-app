import React, { useState, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Minus, Plus } from 'lucide-react-native';
import { theme } from '../../shared/theme';

const NAVY = '#1B365D';
const SCREEN_W = Dimensions.get('window').width;
const SLIDER_H_PAD = 24;
const TRACK_W = SCREEN_W - SLIDER_H_PAD * 2 - 48;
const THUMB_R = 12;

const DURATIONS = [2, 3, 4, 6, 8];
const CAPTAIN_OPTIONS = ['С капитаном', 'Без капитана'];
const ACTIVITIES = ['Прогулка', 'Рыбалка', 'Вечеринка', 'Спорт', 'Закат'];

const PRICE_MIN = 0;
const PRICE_MAX = 50000;

function clamp(v, min, max) {
    'worklet';
    return Math.min(Math.max(v, min), max);
}

function RangeSlider({ low, high, min, max, onChange }) {
    const trackRef = useRef(null);
    const layoutX = useRef(0);
    const layoutW = useRef(TRACK_W);

    const toX = (val) => ((val - min) / (max - min)) * layoutW.current;
    const toVal = (x) => Math.round((x / layoutW.current) * (max - min) + min);

    const makeResponder = (isHigh) =>
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {},
            onPanResponderMove: (_, g) => {
                const x = clamp(g.moveX - layoutX.current, 0, layoutW.current);
                const val = toVal(x);
                if (isHigh) {
                    onChange(low, Math.max(val, low + 500));
                } else {
                    onChange(Math.min(val, high - 500), high);
                }
            },
        });

    const lowResp = useRef(makeResponder(false)).current;
    const highResp = useRef(makeResponder(true)).current;

    const onLayout = (e) => {
        trackRef.current?.measureInWindow?.((x, _y, w) => {
            layoutX.current = x;
            layoutW.current = w;
        });
        layoutW.current = e.nativeEvent.layout.width;
    };

    const lowX = toX(low);
    const highX = toX(high);

    return (
        <View
            ref={trackRef}
            style={sliderStyles.track}
            onLayout={onLayout}
        >
            <View style={sliderStyles.trackBg} />
            <View
                style={[
                    sliderStyles.trackFill,
                    { left: lowX, width: highX - lowX },
                ]}
            />
            <View
                {...lowResp.panHandlers}
                style={[sliderStyles.thumb, { left: lowX - THUMB_R }]}
            />
            <View
                {...highResp.panHandlers}
                style={[sliderStyles.thumb, { left: highX - THUMB_R }]}
            />
        </View>
    );
}

const sliderStyles = StyleSheet.create({
    track: {
        height: 40,
        justifyContent: 'center',
        position: 'relative',
    },
    trackBg: {
        height: 4,
        backgroundColor: '#E5E7EB',
        borderRadius: 2,
    },
    trackFill: {
        position: 'absolute',
        height: 4,
        backgroundColor: NAVY,
        borderRadius: 2,
        top: 18,
    },
    thumb: {
        position: 'absolute',
        width: THUMB_R * 2,
        height: THUMB_R * 2,
        borderRadius: THUMB_R,
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: NAVY,
        top: 8,
    },
});

export default function FiltersModal({ visible, onClose, filters, onApply, totalResults }) {
    const insets = useSafeAreaInsets();
    const [priceLow, setPriceLow] = useState(filters?.priceLow ?? PRICE_MIN);
    const [priceHigh, setPriceHigh] = useState(filters?.priceHigh ?? PRICE_MAX);
    const [passengers, setPassengers] = useState(filters?.passengers ?? 1);
    const [duration, setDuration] = useState(filters?.duration ?? null);
    const [captain, setCaptain] = useState(filters?.captain ?? null);
    const [activity, setActivity] = useState(filters?.activity ?? null);

    const handlePriceChange = useCallback((low, high) => {
        setPriceLow(low);
        setPriceHigh(high);
    }, []);

    const countActive = () => {
        let n = 0;
        if (priceLow > PRICE_MIN || priceHigh < PRICE_MAX) n++;
        if (passengers !== 1) n++;
        if (duration) n++;
        if (captain) n++;
        if (activity) n++;
        return n;
    };

    const handleClear = () => {
        setPriceLow(PRICE_MIN);
        setPriceHigh(PRICE_MAX);
        setPassengers(1);
        setDuration(null);
        setCaptain(null);
        setActivity(null);
    };

    const handleApply = () => {
        onApply({
            priceLow,
            priceHigh,
            passengers,
            duration,
            captain,
            activity,
        });
        onClose();
    };

    const formatPrice = (v) => {
        if (v >= 1000) return Math.round(v / 1000) + ' 000';
        return String(v);
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity
                            onPress={onClose}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        >
                            <X size={24} color={NAVY} />
                        </TouchableOpacity>
                        <View style={styles.headerCenter}>
                            <Text style={styles.headerTitle}>Фильтры</Text>
                            {countActive() > 0 && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{countActive()}</Text>
                                </View>
                            )}
                        </View>
                        <View style={{ width: 24 }} />
                    </View>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                    >
                        {/* Price per hour */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeaderRow}>
                                <Text style={styles.sectionTitle}>Цена за час</Text>
                                <Text style={styles.priceRange}>
                                    {formatPrice(priceLow)} – {formatPrice(priceHigh)} ₽
                                </Text>
                            </View>
                            <RangeSlider
                                low={priceLow}
                                high={priceHigh}
                                min={PRICE_MIN}
                                max={PRICE_MAX}
                                onChange={handlePriceChange}
                            />
                        </View>

                        <View style={styles.divider} />

                        {/* Passengers */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeaderRow}>
                                <Text style={styles.sectionTitle}>Гости</Text>
                                <View style={styles.stepper}>
                                    <TouchableOpacity
                                        style={[
                                            styles.stepperBtn,
                                            passengers <= 1 && styles.stepperBtnDisabled,
                                        ]}
                                        onPress={() => setPassengers(Math.max(1, passengers - 1))}
                                        disabled={passengers <= 1}
                                    >
                                        <Minus size={16} color={passengers <= 1 ? '#D1D5DB' : NAVY} />
                                    </TouchableOpacity>
                                    <Text style={styles.stepperValue}>{passengers}</Text>
                                    <TouchableOpacity
                                        style={styles.stepperBtn}
                                        onPress={() => setPassengers(passengers + 1)}
                                    >
                                        <Plus size={16} color={NAVY} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        {/* Duration */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Длительность</Text>
                            <View style={styles.chipGrid}>
                                {DURATIONS.map((d) => (
                                    <TouchableOpacity
                                        key={d}
                                        style={[
                                            styles.optionChip,
                                            duration === d && styles.optionChipActive,
                                        ]}
                                        onPress={() =>
                                            setDuration(duration === d ? null : d)
                                        }
                                    >
                                        <Text
                                            style={[
                                                styles.optionChipText,
                                                duration === d && styles.optionChipTextActive,
                                            ]}
                                        >
                                            {d} часа
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.divider} />

                        {/* Captain options */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Капитан</Text>
                            <Text style={styles.sectionHint}>
                                Выберите катера с лицензированным капитаном или для самостоятельного управления.
                            </Text>
                            <View style={styles.chipGrid}>
                                {CAPTAIN_OPTIONS.map((opt) => (
                                    <TouchableOpacity
                                        key={opt}
                                        style={[
                                            styles.optionChip,
                                            styles.optionChipWide,
                                            captain === opt && styles.optionChipActive,
                                        ]}
                                        onPress={() =>
                                            setCaptain(captain === opt ? null : opt)
                                        }
                                    >
                                        <Text
                                            style={[
                                                styles.optionChipText,
                                                captain === opt && styles.optionChipTextActive,
                                            ]}
                                        >
                                            {opt}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.divider} />

                        {/* Activities */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Активности</Text>
                            <View style={styles.chipGrid}>
                                {ACTIVITIES.map((a) => (
                                    <TouchableOpacity
                                        key={a}
                                        style={[
                                            styles.optionChip,
                                            activity === a && styles.optionChipActive,
                                        ]}
                                        onPress={() =>
                                            setActivity(activity === a ? null : a)
                                        }
                                    >
                                        <Text
                                            style={[
                                                styles.optionChipText,
                                                activity === a && styles.optionChipTextActive,
                                            ]}
                                        >
                                            {a}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </ScrollView>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <TouchableOpacity onPress={handleClear}>
                            <Text style={styles.clearText}>Сбросить</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.applyButton}
                            onPress={handleApply}
                            activeOpacity={0.9}
                        >
                            <Text style={styles.applyButtonText}>
                                Показать {totalResults ?? ''} результат.
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '92%',
    },

    /* Header */
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    headerCenter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: theme.fonts.bold,
        color: NAVY,
    },
    badge: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#FBBF24',
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeText: {
        fontSize: 12,
        fontFamily: theme.fonts.bold,
        color: NAVY,
    },

    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 16,
    },

    /* Section */
    section: {
        paddingVertical: 20,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 17,
        fontFamily: theme.fonts.bold,
        color: NAVY,
    },
    sectionHint: {
        fontSize: 14,
        fontFamily: theme.fonts.regular,
        color: theme.colors.textMuted,
        marginBottom: 14,
        lineHeight: 20,
    },
    priceRange: {
        fontSize: 15,
        fontFamily: theme.fonts.medium,
        color: NAVY,
    },
    divider: {
        height: 1,
        backgroundColor: '#F3F4F6',
    },

    /* Stepper */
    stepper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    stepperBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1.5,
        borderColor: '#D1D5DB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepperBtnDisabled: {
        borderColor: '#E5E7EB',
    },
    stepperValue: {
        fontSize: 18,
        fontFamily: theme.fonts.semiBold,
        color: NAVY,
        minWidth: 24,
        textAlign: 'center',
    },

    /* Option chips */
    chipGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 4,
    },
    optionChip: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#D1D5DB',
        backgroundColor: '#fff',
    },
    optionChipWide: {
        flex: 1,
        alignItems: 'center',
    },
    optionChipActive: {
        borderColor: NAVY,
        backgroundColor: 'rgba(27,54,93,0.06)',
    },
    optionChipText: {
        fontSize: 15,
        fontFamily: theme.fonts.medium,
        color: theme.colors.gray700,
    },
    optionChipTextActive: {
        color: NAVY,
        fontFamily: theme.fonts.semiBold,
    },

    /* Footer */
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    clearText: {
        fontSize: 16,
        fontFamily: theme.fonts.medium,
        color: NAVY,
        textDecorationLine: 'underline',
    },
    applyButton: {
        backgroundColor: NAVY,
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
    },
    applyButtonText: {
        fontSize: 15,
        fontFamily: theme.fonts.bold,
        color: '#fff',
    },
});

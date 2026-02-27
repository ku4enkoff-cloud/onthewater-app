import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Dimensions,
    PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { theme } from '../../shared/theme';

const NAVY = '#1B365D';
const SCREEN_W = Dimensions.get('window').width;
const THUMB_R = 12;
/** Ширина контента: экран минус отступы sheet (24*2) */
const DEFAULT_TRACK_W = SCREEN_W - 48;


function clamp(v, min, max) {
    return Math.min(Math.max(v, min), max);
}

function RangeSlider({ low, high, min, max, onChange }) {
    const trackRef = useRef(null);
    const layoutX = useRef(0);
    const layoutW = useRef(DEFAULT_TRACK_W);

    /** Эффективная ширина трека: минус места под бегунки по краям */
    const effectiveW = () => Math.max(0, layoutW.current - THUMB_R * 2);
    const toX = (val) => {
        const w = effectiveW();
        if (w <= 0) return THUMB_R;
        return THUMB_R + ((val - min) / (max - min)) * w;
    };
    const toVal = (x) => {
        const w = effectiveW();
        if (w <= 0) return min;
        const rel = (x - THUMB_R) / w;
        return Math.round(rel * (max - min) + min);
    };

    const makeResponder = (isHigh) =>
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {},
            onPanResponderMove: (_, g) => {
                const rawX = g.moveX - layoutX.current;
                const x = clamp(rawX, THUMB_R, layoutW.current - THUMB_R);
                const val = toVal(x);
                const step = Math.max(100, Math.round((max - min) / 50));
                if (isHigh) {
                    onChange(low, Math.max(val, low + step));
                } else {
                    onChange(Math.min(val, high - step), high);
                }
            },
        });

    const lowResp = useRef(makeResponder(false)).current;
    const highResp = useRef(makeResponder(true)).current;

    const onLayout = (e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0) layoutW.current = w;
        trackRef.current?.measureInWindow?.((x) => {
            layoutX.current = x;
        });
    };

    const lowX = toX(low);
    const highX = toX(high);

    return (
        <View ref={trackRef} style={[sliderStyles.track, { width: '100%' }]} onLayout={onLayout}>
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
        overflow: 'visible',
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

export default function PriceFilterModal({ visible, onClose, priceMin = 0, priceMax = 50000, priceLow, priceHigh, onApply }) {
    const insets = useSafeAreaInsets();
    const min = priceMin;
    const max = priceMax > min ? priceMax : min + 1000;
    const [low, setLow] = useState(priceLow ?? min);
    const [high, setHigh] = useState(priceHigh ?? max);

    React.useEffect(() => {
        if (visible) {
            setLow(priceLow ?? min);
            setHigh(priceHigh ?? max);
        }
    }, [visible, priceLow, priceHigh, min, max]);

    const formatPrice = (v) => {
        if (v >= 1000) return (Math.round(v / 1000)).toLocaleString('ru-RU') + ' 000';
        return String(v);
    };

    const handleClear = () => {
        setLow(min);
        setHigh(max);
    };

    const handleApply = () => {
        onApply?.({ priceLow: low, priceHigh: high });
        onClose?.();
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
                <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Цена</Text>
                        <TouchableOpacity
                            onPress={onClose}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        >
                            <X size={24} color={NAVY} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.content}>
                        <View style={styles.labelRow}>
                            <Text style={styles.label}>Цена за час</Text>
                            <Text style={styles.rangeText}>
                                {formatPrice(low)} – {formatPrice(high)} ₽
                            </Text>
                        </View>
                        <RangeSlider
                            low={low}
                            high={high}
                            min={min}
                            max={max}
                            onChange={(l, h) => {
                                setLow(l);
                                setHigh(h);
                            }}
                        />
                    </View>

                    <View style={styles.footer}>
                        <TouchableOpacity onPress={handleClear}>
                            <Text style={styles.clearText}>Сбросить</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.applyButton}
                            onPress={handleApply}
                            activeOpacity={0.9}
                        >
                            <Text style={styles.applyButtonText}>Применить</Text>
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
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: theme.fonts.bold,
        color: NAVY,
    },
    content: {
        paddingVertical: 24,
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    label: {
        fontSize: 16,
        fontFamily: theme.fonts.regular,
        color: NAVY,
    },
    rangeText: {
        fontSize: 15,
        fontFamily: theme.fonts.medium,
        color: NAVY,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 16,
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

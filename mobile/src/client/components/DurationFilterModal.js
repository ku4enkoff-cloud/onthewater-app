import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { theme } from '../../shared/theme';

const NAVY = '#1B365D';

function formatDurationLabel(mins) {
    if (mins < 60) return `${mins} мин`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (m > 0) return `${h} ч ${m} мин`;
    if (h === 1) return '1 час';
    if (h >= 2 && h <= 4) return `${h} часа`;
    return `${h} часов`;
}

export default function DurationFilterModal({
    visible,
    onClose,
    duration = null,
    durationOptions = [30, 60, 120, 180, 240, 360, 480],
    onApply,
}) {
    const insets = useSafeAreaInsets();
    const [value, setValue] = useState(duration);

    React.useEffect(() => {
        if (visible) {
            setValue(duration);
        }
    }, [visible, duration]);

    const handleClear = () => {
        setValue(null);
    };

    const handleApply = () => {
        onApply?.({ duration: value });
        onClose?.();
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
                <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Длительность</Text>
                        <TouchableOpacity
                            onPress={onClose}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        >
                            <X size={24} color={NAVY} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.content}>
                        <View style={styles.chipGrid}>
                            {durationOptions.map((mins) => (
                                <TouchableOpacity
                                    key={mins}
                                    style={[
                                        styles.optionChip,
                                        value === mins && styles.optionChipActive,
                                    ]}
                                    onPress={() => setValue(value === mins ? null : mins)}
                                >
                                    <Text
                                        style={[
                                            styles.optionChipText,
                                            value === mins && styles.optionChipTextActive,
                                        ]}
                                    >
                                        {formatDurationLabel(mins)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
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
    label: {
        fontSize: 16,
        fontFamily: theme.fonts.regular,
        color: NAVY,
        marginBottom: 14,
    },
    chipGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    optionChip: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#D1D5DB',
        backgroundColor: '#fff',
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

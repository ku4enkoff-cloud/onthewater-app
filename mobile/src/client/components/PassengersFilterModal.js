import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Minus, Plus } from 'lucide-react-native';
import { theme } from '../../shared/theme';

const NAVY = '#1B365D';

export default function PassengersFilterModal({
    visible,
    onClose,
    passengers = 1,
    maxPassengers = 20,
    onApply,
}) {
    const insets = useSafeAreaInsets();
    const [value, setValue] = useState(passengers);

    React.useEffect(() => {
        if (visible) {
            setValue(passengers);
        }
    }, [visible, passengers]);

    const handleClear = () => {
        setValue(1);
    };

    const handleApply = () => {
        onApply?.({ passengers: value });
        onClose?.();
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
                <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Гости</Text>
                        <TouchableOpacity
                            onPress={onClose}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        >
                            <X size={24} color={NAVY} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.content}>
                        <View style={styles.labelRow}>
                            <Text style={styles.label}>Гости</Text>
                            <View style={styles.stepper}>
                                <TouchableOpacity
                                    style={[
                                        styles.stepperBtn,
                                        value <= 1 && styles.stepperBtnDisabled,
                                    ]}
                                    onPress={() => setValue(Math.max(1, value - 1))}
                                    disabled={value <= 1}
                                >
                                    <Minus size={16} color={value <= 1 ? '#D1D5DB' : NAVY} />
                                </TouchableOpacity>
                                <Text style={styles.stepperValue}>{value}</Text>
                                <TouchableOpacity
                                    style={[
                                        styles.stepperBtn,
                                        value >= maxPassengers && styles.stepperBtnDisabled,
                                    ]}
                                    onPress={() => setValue(Math.min(maxPassengers, value + 1))}
                                    disabled={value >= maxPassengers}
                                >
                                    <Plus size={16} color={value >= maxPassengers ? '#D1D5DB' : NAVY} />
                                </TouchableOpacity>
                            </View>
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
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    label: {
        fontSize: 16,
        fontFamily: theme.fonts.regular,
        color: NAVY,
    },
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
        borderColor: NAVY,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepperBtnDisabled: {
        borderColor: '#D1D5DB',
    },
    stepperValue: {
        fontSize: 18,
        fontFamily: theme.fonts.semiBold,
        color: NAVY,
        minWidth: 24,
        textAlign: 'center',
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

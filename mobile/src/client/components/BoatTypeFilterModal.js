import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { theme } from '../../shared/theme';

const NAVY = '#1B365D';

export default function BoatTypeFilterModal({
    visible,
    onClose,
    boatTypeId = null,
    boatTypeName = null,
    boatTypes = [],
    onApply,
}) {
    const insets = useSafeAreaInsets();
    const [selectedId, setSelectedId] = useState(boatTypeId);
    const [selectedName, setSelectedName] = useState(boatTypeName);

    React.useEffect(() => {
        if (visible) {
            setSelectedId(boatTypeId);
            setSelectedName(boatTypeName);
        }
    }, [visible, boatTypeId, boatTypeName]);

    const handleSelect = (item) => {
        const isSame = String(item.id) === String(selectedId);
        setSelectedId(isSame ? null : item.id);
        setSelectedName(isSame ? null : item.name);
    };

    const handleClear = () => {
        setSelectedId(null);
        setSelectedName(null);
    };

    const handleApply = () => {
        onApply?.({ boatTypeId: selectedId, boatTypeName: selectedName });
        onClose?.();
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
                <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Тип катера</Text>
                        <TouchableOpacity
                            onPress={onClose}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        >
                            <X size={24} color={NAVY} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.scroll}
                        contentContainerStyle={styles.content}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.chipGrid}>
                            {boatTypes.map((item) => {
                                const isActive = String(item.id) === String(selectedId);
                                return (
                                    <TouchableOpacity
                                        key={String(item.id)}
                                        style={[
                                            styles.optionChip,
                                            isActive && styles.optionChipActive,
                                        ]}
                                        onPress={() => handleSelect(item)}
                                    >
                                        <Text
                                            style={[
                                                styles.optionChipText,
                                                isActive && styles.optionChipTextActive,
                                            ]}
                                        >
                                            {item.name || '—'}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </ScrollView>

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
        maxHeight: '80%',
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
    scroll: {
        maxHeight: 400,
    },
    content: {
        paddingVertical: 24,
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

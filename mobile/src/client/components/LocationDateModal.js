import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { theme } from '../../shared/theme';
import LocationPickerModal from './LocationPickerModal';
import DatePickerModal from './DatePickerModal';

const NAVY = '#1B365D';

export default function LocationDateModal({
    visible,
    onClose,
    initialCity = 'Москва',
    initialUseLocation = false,
    initialDateISO = null,
    onApply,
}) {
    const insets = useSafeAreaInsets();
    const [selectedCity, setSelectedCity] = useState(
        initialUseLocation ? 'Моё местоположение' : (initialCity || 'Москва'),
    );
    const [isMyLocation, setIsMyLocation] = useState(!!initialUseLocation);
    const [date, setDate] = useState(() => (initialDateISO ? new Date(initialDateISO) : new Date()));
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showCityPicker, setShowCityPicker] = useState(false);

    useEffect(() => {
        if (visible) {
            setSelectedCity(initialUseLocation ? 'Моё местоположение' : (initialCity || 'Москва'));
            setIsMyLocation(!!initialUseLocation);
            setDate(initialDateISO ? new Date(initialDateISO) : new Date());
        }
    }, [visible, initialCity, initialUseLocation, initialDateISO]);

    const formatDate = (d) =>
        d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });

    const onDateSelect = (selectedDate) => {
        if (selectedDate) setDate(selectedDate);
        setShowDatePicker(false);
    };

    const handleCitySelect = ({ useMyLocation: useLoc, cityName: name }) => {
        setIsMyLocation(!!useLoc);
        setSelectedCity(useLoc ? 'Моё местоположение' : (name || 'Москва'));
        setShowCityPicker(false);
    };

    const handleContinue = () => {
        onApply?.({
            cityName: isMyLocation ? null : selectedCity,
            useMyLocation: isMyLocation,
            dateISO: date.toISOString(),
        });
        onClose?.();
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} animationType="fade" transparent>
            <View style={[styles.overlay, { paddingTop: insets.top }]}>
                {showCityPicker ? (
                    <LocationPickerModal
                        visible
                        onClose={() => setShowCityPicker(false)}
                        onSelect={handleCitySelect}
                    />
                ) : (
                    <>
                        <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
                            <View style={styles.header}>
                                <TouchableOpacity
                                    onPress={onClose}
                                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                                >
                                    <ChevronLeft size={24} color={NAVY} />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.fields}>
                                <TouchableOpacity
                                    style={styles.fieldRow}
                                    onPress={() => setShowCityPicker(true)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.fieldLabel}>Где</Text>
                                    <Text style={styles.fieldValue}>{selectedCity}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.fieldRow}
                                    onPress={() => setShowDatePicker(true)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.fieldLabel}>Дата</Text>
                                    <Text style={styles.fieldValue}>{formatDate(date)}</Text>
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity
                                style={styles.continueButton}
                                onPress={handleContinue}
                                activeOpacity={0.9}
                            >
                                <Text style={styles.continueButtonText}>ПРОДОЛЖИТЬ</Text>
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
                    </>
                )}

                {showDatePicker && (
                    <DatePickerModal
                        visible
                        onClose={() => setShowDatePicker(false)}
                        initialDate={date.toISOString()}
                        onSelect={onDateSelect}
                    />
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    backdrop: {
        flex: 1,
    },
    sheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 24,
        paddingTop: 12,
        alignSelf: 'stretch',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    fields: {
        marginBottom: 24,
    },
    fieldRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    fieldLabel: {
        fontSize: 16,
        fontFamily: theme.fonts.regular,
        color: theme.colors.textMuted,
    },
    fieldValue: {
        fontSize: 16,
        fontFamily: theme.fonts.semiBold,
        color: NAVY,
    },
    continueButton: {
        backgroundColor: NAVY,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    continueButtonText: {
        fontSize: 15,
        fontFamily: theme.fonts.bold,
        color: '#fff',
        letterSpacing: 1,
    },
});

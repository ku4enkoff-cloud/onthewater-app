import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Platform,
    ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ChevronLeft, MapPin, Check } from 'lucide-react-native';
import { theme } from '../../shared/theme';

const NAVY = '#1B365D';

const CITIES = [
    { id: 'my_location', name: 'Моё местоположение', isLocation: true },
    { id: 'moscow', name: 'Москва' },
    { id: 'mo_region', name: 'Московская область' },
    { id: 'spb', name: 'Санкт-Петербург' },
    { id: 'sochi', name: 'Сочи' },
    { id: 'crimea', name: 'Крым' },
    { id: 'kazan', name: 'Казань' },
    { id: 'nn', name: 'Нижний Новгород' },
];

export default function CityBoatsScreen({ route, navigation }) {
    const insets = useSafeAreaInsets();
    const { cityName: initialCity, useMyLocation: initialUseLocation, boatTypeId, boatTypeName, dateISO: initialDateISO } = route.params || {};

    const [selectedCity, setSelectedCity] = useState(
        initialUseLocation ? 'Моё местоположение' : (initialCity || 'Москва'),
    );
    const [isMyLocation, setIsMyLocation] = useState(!!initialUseLocation);
    const [date, setDate] = useState(() => (initialDateISO ? new Date(initialDateISO) : new Date()));
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showCityPicker, setShowCityPicker] = useState(false);

    const formatDate = (d) =>
        d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

    const onDateChange = (event, selectedDate) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) setDate(selectedDate);
    };

    const handleCitySelect = (city) => {
        if (city.isLocation) {
            setSelectedCity('Моё местоположение');
            setIsMyLocation(true);
        } else {
            setSelectedCity(city.name);
            setIsMyLocation(false);
        }
        setShowCityPicker(false);
    };

    const handleContinue = () => {
        navigation.navigate('SearchResults', {
            cityName: isMyLocation ? null : selectedCity,
            useMyLocation: isMyLocation,
            dateISO: date.toISOString(),
            boatTypeId,
            boatTypeName,
        });
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                    <ChevronLeft size={24} color={NAVY} />
                </TouchableOpacity>

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

            {/* City picker modal */}
            <Modal visible={showCityPicker} animationType="slide" transparent>
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowCityPicker(false)}
                >
                    <View style={[styles.citySheet, { paddingBottom: insets.bottom + 16 }]}>
                        <View style={styles.citySheetHandle} />
                        <Text style={styles.citySheetTitle}>Выберите город</Text>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {CITIES.map((city) => {
                                const isActive = city.isLocation
                                    ? isMyLocation
                                    : selectedCity === city.name && !isMyLocation;
                                return (
                                    <TouchableOpacity
                                        key={city.id}
                                        style={styles.cityRow}
                                        onPress={() => handleCitySelect(city)}
                                        activeOpacity={0.7}
                                    >
                                        {city.isLocation && (
                                            <MapPin size={20} color={NAVY} style={{ marginRight: 12 }} />
                                        )}
                                        <Text
                                            style={[
                                                styles.cityRowText,
                                                isActive && styles.cityRowTextActive,
                                            ]}
                                        >
                                            {city.name}
                                        </Text>
                                        {isActive && <Check size={20} color={NAVY} />}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Date picker */}
            {showDatePicker && (
                <>
                    {Platform.OS === 'android' && (
                        <DateTimePicker
                            value={date}
                            mode="date"
                            display="calendar"
                            onChange={onDateChange}
                            minimumDate={new Date()}
                            locale="ru-RU"
                        />
                    )}
                    {Platform.OS === 'ios' && (
                        <Modal visible transparent animationType="slide">
                            <TouchableOpacity
                                style={styles.modalOverlay}
                                activeOpacity={1}
                                onPress={() => setShowDatePicker(false)}
                            >
                                <View style={styles.datePickerModal}>
                                    <View style={styles.datePickerHeader}>
                                        <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                                            <Text style={styles.datePickerDone}>Готово</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <DateTimePicker
                                        value={date}
                                        mode="date"
                                        display="spinner"
                                        onChange={onDateChange}
                                        minimumDate={new Date()}
                                        locale="ru-RU"
                                        style={styles.iosDatePicker}
                                    />
                                </View>
                            </TouchableOpacity>
                        </Modal>
                    )}
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F0F0EF',
    },
    header: {
        paddingHorizontal: theme.spacing.lg,
        paddingTop: 8,
        paddingBottom: theme.spacing.lg,
    },
    backButton: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: theme.spacing.sm,
    },
    fields: {
        marginBottom: theme.spacing.lg,
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

    /* Shared overlay */
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },

    /* City picker sheet */
    citySheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingTop: 12,
        maxHeight: '70%',
    },
    citySheetHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#D1D5DB',
        alignSelf: 'center',
        marginBottom: 16,
    },
    citySheetTitle: {
        fontSize: 18,
        fontFamily: theme.fonts.bold,
        color: NAVY,
        paddingHorizontal: 24,
        marginBottom: 8,
    },
    cityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    cityRowText: {
        flex: 1,
        fontSize: 16,
        fontFamily: theme.fonts.medium,
        color: theme.colors.gray700,
    },
    cityRowTextActive: {
        fontFamily: theme.fonts.semiBold,
        color: NAVY,
    },

    /* Date picker */
    datePickerModal: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingBottom: 34,
    },
    datePickerHeader: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    datePickerDone: {
        fontSize: 17,
        fontFamily: theme.fonts.semiBold,
        color: NAVY,
    },
    iosDatePicker: {
        height: 200,
    },
});

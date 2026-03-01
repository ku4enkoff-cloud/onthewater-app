import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../../../theme';
import { api } from '../../../infrastructure/api';
import { Plus, X, MapPin, Camera, ChevronDown, Check, Trash2 } from 'lucide-react-native';

const TIER_DURATION_OPTIONS = [];
for (let m = 30; m <= 24 * 60; m += 30) {
    const hrs = Math.floor(m / 60);
    const mins = m % 60;
    TIER_DURATION_OPTIONS.push({
        value: m,
        label: hrs > 0 ? (mins > 0 ? `${hrs} ч ${mins} мин` : `${hrs} ч`) : `${mins} мин`,
    });
}
let tierIdCounter = 1;

export default function AddBoatScreen({ navigation }) {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type_id: '1',
        year: '',
        length_m: '',
        capacity: '',
        location_city: 'Москва',
        location_address: '',
        lat: 55.751244,
        lng: 37.618423,
        price_per_hour: '',
        price_per_day: '',
        price_weekend: '',
        captain_included: false,
        has_captain_option: false,
        rules: '',
        photos: [],
    });

    const [priceTiers, setPriceTiers] = useState([]);
    const [tierDurationOpenId, setTierDurationOpenId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1); // 1 - Основная информация, 2 - Фото, 3 - Цены и опции

    const boatTypes = [
        { id: '1', name: 'Катер', slug: 'motorboat' },
        { id: '2', name: 'Яхта', slug: 'yacht' },
        { id: '3', name: 'Гидроцикл', slug: 'jetski' },
        { id: '4', name: 'Парусная яхта', slug: 'sailboat' },
        { id: '5', name: 'Катамаран', slug: 'catamaran' },
        { id: '6', name: 'Буксировщик', slug: 'wakeboat' },
    ];

    const pickImages = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaType.Images,
                quality: 0.8,
                allowsEditing: false,
                allowsMultipleSelection: true,
            });

            if (!result.canceled && result.assets) {
                setFormData({
                    ...formData,
                    photos: [...formData.photos, ...result.assets.map(asset => asset.uri)]
                });
            }
        } catch (error) {
            console.log('Image picker error:', error);
            Alert.alert('Ошибка', 'Не удалось выбрать изображения');
        }
    };

    const removeImage = (index) => {
        const newPhotos = [...formData.photos];
        newPhotos.splice(index, 1);
        setFormData({ ...formData, photos: newPhotos });
    };

    const addTier = () => setPriceTiers((prev) => [...prev, { id: tierIdCounter++, duration: 120, price: '', price_weekend: '' }]);
    const removeTier = (id) => setPriceTiers((prev) => prev.filter((t) => t.id !== id));
    const updateTierDuration = (id, value) => {
        setPriceTiers((prev) => prev.map((t) => (t.id === id ? { ...t, duration: value } : t)));
        setTierDurationOpenId(null);
    };
    const updateTierPrice = (id, value) => setPriceTiers((prev) => prev.map((t) => (t.id === id ? { ...t, price: value } : t)));
    const updateTierPriceWeekend = (id, value) => setPriceTiers((prev) => prev.map((t) => (t.id === id ? { ...t, price_weekend: value } : t)));

    const handleSubmit = async () => {
        // Проверка заполненности полей
        const requiredFields = ['title', 'description', 'type_id', 'capacity', 'location_address', 'price_per_hour'];
        const missingFields = requiredFields.filter(field => !formData[field]);
        
        if (missingFields.length > 0) {
            Alert.alert('Ошибка', 'Заполните все обязательные поля');
            return;
        }

        if (formData.photos.length === 0) {
            Alert.alert('Внимание', 'Добавьте хотя бы одно фото катера');
            return;
        }

        setLoading(true);
        try {
            const payload = new FormData();
            payload.append('title', formData.title);
            payload.append('description', formData.description);
            payload.append('type_id', formData.type_id);
            payload.append('year', formData.year || '');
            payload.append('length_m', formData.length_m);
            payload.append('capacity', String(formData.capacity));
            payload.append('location_city', formData.location_city);
            payload.append('location_address', formData.location_address);
            payload.append('lat', String(formData.lat));
            payload.append('lng', String(formData.lng));
            payload.append('price_per_hour', String(formData.price_per_hour));
            payload.append('price_per_day', formData.price_per_day ? String(formData.price_per_day) : '');
            if (formData.price_weekend != null && String(formData.price_weekend).trim() !== '') {
                payload.append('price_weekend', String(formData.price_weekend).trim());
            }
            const tiersPayload = priceTiers
                .filter((t) => t.price.trim())
                .map((t) => ({
                    duration: t.duration,
                    price: t.price.trim(),
                    ...(t.price_weekend != null && String(t.price_weekend).trim() && { price_weekend: String(t.price_weekend).trim() }),
                }));
            if (tiersPayload.length > 0) {
                payload.append('price_tiers', JSON.stringify(tiersPayload));
            }
            payload.append('captain_included', formData.captain_included ? '1' : '0');
            payload.append('has_captain_option', formData.has_captain_option ? '1' : '0');
            payload.append('rules', formData.rules || '');
            formData.photos.forEach((uri, i) => {
                payload.append('photos', {
                    uri,
                    type: 'image/jpeg',
                    name: `photo_${i}.jpg`,
                });
            });
            await api.post('/boats', payload);
            Alert.alert('Успех', 'Катер успешно добавлен на модерацию');
            navigation.goBack();
        } catch (error) {
            console.log('Error adding boat:', error);
            const message = error.response?.data?.error || error.response?.data?.message || 'Не удалось добавить катер';
            Alert.alert('Ошибка', message);
        } finally {
            setLoading(false);
        }
    };

    const renderStepIndicator = () => (
        <View style={styles.stepIndicator}>
            {[1, 2, 3].map((stepNumber) => (
                <View key={stepNumber} style={styles.stepContainer}>
                    <View style={[
                        styles.stepCircle,
                        stepNumber === step && styles.stepCircleActive,
                        stepNumber < step && styles.stepCircleCompleted
                    ]}>
                        <Text style={[
                            styles.stepText,
                            stepNumber === step && styles.stepTextActive,
                            stepNumber < step && styles.stepTextCompleted
                        ]}>
                            {stepNumber < step ? '✓' : stepNumber}
                        </Text>
                    </View>
                    <Text style={[
                        styles.stepLabel,
                        stepNumber === step && styles.stepLabelActive
                    ]}>
                        {stepNumber === 1 ? 'Основное' : stepNumber === 2 ? 'Фото' : 'Цены'}
                    </Text>
                </View>
            ))}
        </View>
    );

    const renderStepContent = () => {
        switch (step) {
            case 1:
                return (
                    <View style={styles.stepContent}>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Название катера *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Например, 'Катер класса люкс'"
                                value={formData.title}
                                onChangeText={(text) => setFormData({ ...formData, title: text })}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Описание *</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Опишите ваш катер, его особенности, оборудование и т.д."
                                value={formData.description}
                                onChangeText={(text) => setFormData({ ...formData, description: text })}
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Тип судна *</Text>
                            <View style={styles.typeGrid}>
                                {boatTypes.map((type) => (
                                    <TouchableOpacity
                                        key={type.id}
                                        style={[
                                            styles.typeButton,
                                            formData.type_id === type.id && styles.typeButtonActive
                                        ]}
                                        onPress={() => setFormData({ ...formData, type_id: type.id })}
                                    >
                                        <Text style={[
                                            styles.typeButtonText,
                                            formData.type_id === type.id && styles.typeButtonTextActive
                                        ]}>
                                            {type.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                                <Text style={styles.label}>Год постройки</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="2020"
                                    value={formData.year}
                                    onChangeText={(text) => setFormData({ ...formData, year: text })}
                                    keyboardType="number-pad"
                                />
                            </View>
                            <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                                <Text style={styles.label}>Длина (м) *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="7.5"
                                    value={formData.length_m}
                                    onChangeText={(text) => setFormData({ ...formData, length_m: text })}
                                    keyboardType="decimal-pad"
                                />
                            </View>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Вместимость (чел.) *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="4"
                                value={formData.capacity}
                                onChangeText={(text) => setFormData({ ...formData, capacity: text })}
                                keyboardType="number-pad"
                            />
                        </View>
                    </View>
                );

            case 2:
                return (
                    <View style={styles.stepContent}>
                        <Text style={[theme.typography.body, { marginBottom: theme.spacing.md }]}>
                            Добавьте качественные фото вашего катера. Минимум 1 фото обязательно.
                        </Text>

                        <View style={styles.photosGrid}>
                            {formData.photos.map((photo, index) => (
                                <View key={index} style={styles.photoContainer}>
                                    <Image source={{ uri: photo }} style={styles.photo} />
                                    <TouchableOpacity
                                        style={styles.removeButton}
                                        onPress={() => removeImage(index)}
                                    >
                                        <X size={16} color="white" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                            <TouchableOpacity style={styles.addPhotoButton} onPress={pickImages}>
                                <Camera size={32} color={theme.colors.textMuted} />
                                <Text style={styles.addPhotoText}>Добавить фото</Text>
                                <Text style={styles.addPhotoSubtext}>
                                    {formData.photos.length}/10
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                );

            case 3:
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.sectionTitle}>Стоимость аренды</Text>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Цена за час (₽) *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="5000"
                                value={formData.price_per_hour}
                                onChangeText={(text) => setFormData({ ...formData, price_per_hour: text })}
                                keyboardType="number-pad"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Цена в выходные (Сб–Вс) за час (₽)</Text>
                            <Text style={styles.hint}>Если не заполнено, используется основная цена за час</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="6000"
                                value={formData.price_weekend}
                                onChangeText={(text) => setFormData({ ...formData, price_weekend: text })}
                                keyboardType="number-pad"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Цена за день (₽)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="30000"
                                value={formData.price_per_day}
                                onChangeText={(text) => setFormData({ ...formData, price_per_day: text })}
                                keyboardType="number-pad"
                            />
                        </View>

                        <Text style={[styles.sectionTitle, { marginTop: theme.spacing.lg }]}>Стоимость за другое время</Text>
                        <Text style={styles.hint}>Добавьте цены для разной длительности (будни и выходные)</Text>
                        {priceTiers.map((tier) => {
                            const tierLabel = TIER_DURATION_OPTIONS.find((d) => d.value === tier.duration)?.label || '';
                            const isOpen = tierDurationOpenId === tier.id;
                            return (
                                <View key={tier.id} style={styles.tierCard}>
                                    <View style={styles.tierTopRow}>
                                        <TouchableOpacity
                                            style={styles.tierDurationBtn}
                                            onPress={() => setTierDurationOpenId(isOpen ? null : tier.id)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={styles.tierDurationText}>{tierLabel}</Text>
                                            <ChevronDown size={16} color={theme.colors.primary} style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }} />
                                        </TouchableOpacity>
                                        <View style={styles.tierPriceWrap}>
                                            <TextInput
                                                style={styles.tierPriceInput}
                                                placeholder="0"
                                                placeholderTextColor={theme.colors.textMuted}
                                                value={tier.price}
                                                onChangeText={(v) => updateTierPrice(tier.id, v)}
                                                keyboardType="number-pad"
                                            />
                                            <Text style={styles.tierCurrency}>₽</Text>
                                        </View>
                                        <TouchableOpacity style={styles.tierDeleteBtn} onPress={() => removeTier(tier.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                            <Trash2 size={18} color={theme.colors.error} />
                                        </TouchableOpacity>
                                    </View>
                                    <View style={styles.tierWeekendRow}>
                                        <Text style={styles.tierWeekendLabel}>Выходные (Сб–Вс)</Text>
                                        <View style={styles.tierPriceWrap}>
                                            <TextInput
                                                style={styles.tierPriceInput}
                                                placeholder="0"
                                                placeholderTextColor={theme.colors.textMuted}
                                                value={tier.price_weekend ?? ''}
                                                onChangeText={(v) => updateTierPriceWeekend(tier.id, v)}
                                                keyboardType="number-pad"
                                            />
                                            <Text style={styles.tierCurrency}>₽</Text>
                                        </View>
                                    </View>
                                    {isOpen && (
                                        <View style={styles.tierDropdown}>
                                            <ScrollView nestedScrollEnabled style={styles.tierDropdownScroll} keyboardShouldPersistTaps="handled">
                                                {TIER_DURATION_OPTIONS.map((opt) => (
                                                    <TouchableOpacity
                                                        key={opt.value}
                                                        style={[styles.tierDropdownItem, opt.value === tier.duration && styles.tierDropdownItemActive]}
                                                        onPress={() => updateTierDuration(tier.id, opt.value)}
                                                        activeOpacity={0.6}
                                                    >
                                                        <Text style={[styles.tierDropdownText, opt.value === tier.duration && styles.tierDropdownTextActive]}>{opt.label}</Text>
                                                        {opt.value === tier.duration && <Check size={14} color={theme.colors.primary} />}
                                                    </TouchableOpacity>
                                                ))}
                                            </ScrollView>
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                        <TouchableOpacity style={styles.addTierBtn} onPress={addTier} activeOpacity={0.7}>
                            <Plus size={18} color={theme.colors.primary} />
                            <Text style={styles.addTierText}>Добавить стоимость</Text>
                        </TouchableOpacity>

                        <Text style={[styles.sectionTitle, { marginTop: theme.spacing.xl }]}>Место и опции</Text>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Город *</Text>
                            <View style={styles.locationContainer}>
                                <MapPin size={20} color={theme.colors.textMuted} style={styles.locationIcon} />
                                <TextInput
                                    style={[styles.input, { paddingLeft: 40 }]}
                                    placeholder="Например, Москва"
                                    value={formData.location_city}
                                    onChangeText={(text) => setFormData({ ...formData, location_city: text })}
                                />
                            </View>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Адрес причала *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Точный адрес встречи с клиентом"
                                value={formData.location_address}
                                onChangeText={(text) => setFormData({ ...formData, location_address: text })}
                            />
                        </View>

                        <View style={styles.checkboxContainer}>
                            <TouchableOpacity
                                style={styles.checkboxRow}
                                onPress={() => setFormData({ ...formData, captain_included: !formData.captain_included })}
                            >
                                <View style={[styles.checkbox, formData.captain_included && styles.checkboxChecked]} />
                                <Text style={styles.checkboxLabel}>Капитан включен в стоимость</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.checkboxContainer}>
                            <TouchableOpacity
                                style={styles.checkboxRow}
                                onPress={() => setFormData({ ...formData, has_captain_option: !formData.has_captain_option })}
                            >
                                <View style={[styles.checkbox, formData.has_captain_option && styles.checkboxChecked]} />
                                <Text style={styles.checkboxLabel}>Возможность аренды с капитаном</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Правила и ограничения</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Например, минимальный возраст водителя, запрет алкоголя и т.д."
                                value={formData.rules}
                                onChangeText={(text) => setFormData({ ...formData, rules: text })}
                                multiline
                                numberOfLines={3}
                                textAlignVertical="top"
                            />
                        </View>
                    </View>
                );
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <X size={24} color={theme.colors.textMain} />
                </TouchableOpacity>
                <Text style={theme.typography.h1}>Добавить катер</Text>
                <View style={{ width: 40 }} />
            </View>

            {renderStepIndicator()}

            <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                {renderStepContent()}
                <View style={{ height: 100 }} />
            </ScrollView>

            <View style={styles.footer}>
                {step > 1 && (
                    <TouchableOpacity
                        style={styles.backFooterButton}
                        onPress={() => setStep(step - 1)}
                    >
                        <Text style={styles.backFooterButtonText}>Назад</Text>
                    </TouchableOpacity>
                )}
                
                <TouchableOpacity
                    style={[styles.nextButton, loading && styles.nextButtonDisabled]}
                    onPress={() => {
                        if (step < 3) {
                            setStep(step + 1);
                        } else {
                            handleSubmit();
                        }
                    }}
                    disabled={loading}
                >
                    <Text style={styles.nextButtonText}>
                        {loading ? 'Отправка...' : step < 3 ? 'Далее' : 'Добавить катер'}
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.xl,
        paddingBottom: theme.spacing.md,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepIndicator: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.lg,
        marginBottom: theme.spacing.xl,
    },
    stepContainer: {
        alignItems: 'center',
        flex: 1,
    },
    stepCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: theme.colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    stepCircleActive: {
        backgroundColor: theme.colors.primary,
    },
    stepCircleCompleted: {
        backgroundColor: theme.colors.success,
    },
    stepText: {
        ...theme.typography.body,
        fontWeight: '600',
        color: theme.colors.textMuted,
    },
    stepTextActive: {
        color: 'white',
    },
    stepTextCompleted: {
        color: 'white',
    },
    stepLabel: {
        ...theme.typography.caption,
        color: theme.colors.textMuted,
        textAlign: 'center',
    },
    stepLabelActive: {
        color: theme.colors.primary,
        fontWeight: '600',
    },
    scrollContainer: {
        paddingHorizontal: theme.spacing.lg,
    },
    stepContent: {
        paddingBottom: theme.spacing.xl,
    },
    inputContainer: {
        marginBottom: theme.spacing.md,
    },
    label: {
        ...theme.typography.bodySm,
        fontWeight: '600',
        marginBottom: 8,
        color: theme.colors.textMain,
    },
    input: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        padding: 14,
        fontSize: 16,
        backgroundColor: theme.colors.surface,
    },
    textArea: {
        minHeight: 100,
        paddingTop: 12,
    },
    row: {
        flexDirection: 'row',
    },
    typeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.sm,
    },
    typeButton: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surface,
    },
    typeButtonActive: {
        backgroundColor: theme.colors.primaryLight,
        borderColor: theme.colors.primary,
    },
    typeButtonText: {
        ...theme.typography.bodySm,
        color: theme.colors.textMain,
    },
    typeButtonTextActive: {
        color: theme.colors.primary,
        fontWeight: '600',
    },
    photosGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.md,
    },
    photoContainer: {
        position: 'relative',
        width: '48%',
        aspectRatio: 4/3,
        borderRadius: theme.borderRadius.md,
        overflow: 'hidden',
    },
    photo: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    removeButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.6)',
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addPhotoButton: {
        width: '48%',
        aspectRatio: 4/3,
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderStyle: 'dashed',
        borderRadius: theme.borderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
    },
    addPhotoText: {
        ...theme.typography.body,
        marginTop: theme.spacing.sm,
        color: theme.colors.textMain,
    },
    addPhotoSubtext: {
        ...theme.typography.caption,
        color: theme.colors.textMuted,
        marginTop: 2,
    },
    locationContainer: {
        position: 'relative',
    },
    locationIcon: {
        position: 'absolute',
        left: 14,
        top: 16,
        zIndex: 1,
    },
    checkboxContainer: {
        marginBottom: theme.spacing.md,
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: theme.colors.border,
        marginRight: theme.spacing.sm,
        backgroundColor: theme.colors.surface,
    },
    checkboxChecked: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    checkboxLabel: {
        ...theme.typography.body,
        flex: 1,
    },
    sectionTitle: {
        ...theme.typography.h3,
        marginBottom: theme.spacing.sm,
    },
    hint: {
        ...theme.typography.caption,
        color: theme.colors.textMuted,
        marginBottom: 8,
    },
    tierCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.sm,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    tierTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    tierDurationBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.sm,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    tierDurationText: { fontSize: 14, fontWeight: '600', color: theme.colors.textMain },
    tierPriceWrap: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.sm,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingHorizontal: 12,
    },
    tierPriceInput: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.textMain,
        paddingVertical: 10,
    },
    tierCurrency: { fontSize: 14, color: theme.colors.textMuted, marginLeft: 4 },
    tierDeleteBtn: { padding: 6 },
    tierWeekendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        gap: theme.spacing.sm,
    },
    tierWeekendLabel: { fontSize: 13, fontWeight: '500', color: theme.colors.textMuted, minWidth: 100 },
    tierDropdown: {
        marginTop: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.sm,
        backgroundColor: theme.colors.background,
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
            android: { elevation: 3 },
        }),
    },
    tierDropdownScroll: { maxHeight: 200 },
    tierDropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    tierDropdownItemActive: { backgroundColor: theme.colors.primaryLight },
    tierDropdownText: { fontSize: 14, color: theme.colors.textMain },
    tierDropdownTextActive: { fontWeight: '600', color: theme.colors.primary },
    addTierBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1.5,
        borderColor: theme.colors.primary,
        borderStyle: 'dashed',
        borderRadius: theme.borderRadius.md,
        paddingVertical: 14,
        marginBottom: theme.spacing.md,
    },
    addTierText: { fontSize: 15, fontWeight: '600', color: theme.colors.primary },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: theme.colors.background,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
    },
    backFooterButton: {
        flex: 1,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        alignItems: 'center',
    },
    backFooterButtonText: {
        ...theme.typography.body,
        color: theme.colors.textMain,
        fontWeight: '600',
    },
    nextButton: {
        flex: 2,
        backgroundColor: theme.colors.primary,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
    },
    nextButtonDisabled: {
        opacity: 0.7,
    },
    nextButtonText: {
        ...theme.typography.body,
        color: 'white',
        fontWeight: '600',
    },
});
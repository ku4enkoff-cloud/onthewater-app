import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ScrollView, Alert, Platform, KeyboardAvoidingView, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, FileText, AlignLeft, ShieldCheck, Check, Anchor, XCircle } from 'lucide-react-native';
import { theme } from '../../shared/theme';
import { api } from '../../shared/infrastructure/api';

let LinearGradient = null;
try { LinearGradient = require('expo-linear-gradient').LinearGradient; } catch (_) {}

const GRADIENT = ['#0A4D4D', '#0D5C5C', '#1A7A5A'];
const TEAL = '#0D5C5C';

export default function AddBoatScreen({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const boatType = route.params?.boatType;
    const boatInfo = route.params?.boatInfo;
    const boatLocation = route.params?.boatLocation;
    const boatSchedule = route.params?.boatSchedule;
    const boatMedia = route.params?.boatMedia;

    const [title, setTitle] = useState(
        boatInfo ? `${boatInfo.manufacturer} ${boatInfo.model}` : '',
    );
    const [description, setDescription] = useState('');
    const [rules, setRules] = useState('');
    const [cancellationPolicy, setCancellationPolicy] = useState('');
    const [captainOption, setCaptainOption] = useState('none');
    const [loading, setLoading] = useState(false);

    const canSubmit = title.trim() && description.trim();

    const handleSubmit = async () => {
        if (!title.trim()) {
            Alert.alert('Ошибка', 'Введите название объявления');
            return;
        }
        if (!description.trim()) {
            Alert.alert('Ошибка', 'Введите описание катера');
            return;
        }

        const photos = boatMedia?.photos || [];
        if (photos.length === 0) {
            Alert.alert('Внимание', 'Нет фотографий катера');
            return;
        }

        setLoading(true);
        try {
            const payload = new FormData();
            payload.append('title', title.trim());
            payload.append('description', description.trim());
            payload.append('type_id', boatType?.id || '1');
            payload.append('type_name', boatType?.name || 'Катер');
            payload.append('manufacturer', boatInfo?.manufacturer || '');
            payload.append('model', boatInfo?.model || '');
            payload.append('year', boatInfo?.year || '');
            payload.append('length_m', '');
            payload.append('capacity', String(boatInfo?.capacity || '0'));
            payload.append('amenities', JSON.stringify(boatInfo?.amenities || []));
            payload.append('location_country', boatLocation?.country || '');
            payload.append('location_city', boatLocation?.city || '');
            payload.append('location_address', boatLocation?.address || '');
            payload.append('location_yacht_club', boatLocation?.yachtClub || '');
            payload.append('lat', String(boatLocation?.lat || 55.75));
            payload.append('lng', String(boatLocation?.lng || 37.62));
            payload.append('price_per_hour', String(boatSchedule?.pricePerMinDuration || '0'));
            payload.append('price_per_day', '');
            payload.append('captain_included', captainOption === 'included' ? '1' : '0');
            payload.append('has_captain_option', captainOption === 'optional' ? '1' : '0');
            payload.append('rules', rules.trim());
            payload.append('cancellation_policy', cancellationPolicy.trim());

            if (boatSchedule) {
                payload.append('schedule_work_days', JSON.stringify(boatSchedule.workDays));
                payload.append('schedule_weekday_hours', JSON.stringify(boatSchedule.weekdayHours));
                payload.append('schedule_weekend_hours', JSON.stringify(boatSchedule.weekendHours));
                payload.append('schedule_min_duration', String(boatSchedule.minDuration));
                if (boatSchedule.weekendPrice != null && boatSchedule.weekendPrice !== '') {
                    payload.append('price_weekend', String(boatSchedule.weekendPrice));
                }
                if (boatSchedule.priceTiers?.length > 0) {
                    payload.append('price_tiers', JSON.stringify(boatSchedule.priceTiers));
                }
            }

            photos.forEach((uri, i) => {
                payload.append('photos', { uri, type: 'image/jpeg', name: `photo_${i}.jpg` });
            });

            const videos = boatMedia?.videos || [];
            if (videos.length > 0) {
                payload.append('video_uris', JSON.stringify(videos));
            }

            await api.post('/boats', payload);
            Alert.alert('Успех', 'Катер успешно добавлен на модерацию', [
                { text: 'OK', onPress: () => navigation.navigate('MainTabs') },
            ]);
        } catch (error) {
            const message =
                error.response?.data?.error ||
                error.response?.data?.message ||
                'Не удалось добавить катер';
            Alert.alert('Ошибка', message);
        } finally {
            setLoading(false);
        }
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
                <View style={[s.headerInner, { paddingTop: insets.top + 8 }]}>
                    <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                        <ChevronLeft size={24} color="#fff" />
                        <Text style={s.backText}>Назад</Text>
                    </TouchableOpacity>
                    <Text style={s.title}>Описание{'\n'}объявления</Text>
                    <Text style={s.subtitle}>
                        Последний шаг! Придумайте привлекательное название и подробно опишите ваш катер.
                    </Text>
                </View>
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView
                    style={s.body}
                    contentContainerStyle={[s.bodyContent, { paddingBottom: 120 }]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Title */}
                    <View style={s.fieldWrap}>
                        <View style={s.fieldHeader}>
                            <FileText size={18} color={TEAL} />
                            <Text style={s.fieldLabel}>Название объявления *</Text>
                        </View>
                        <TextInput
                            style={s.input}
                            placeholder="Например, «Быстрый катер для отдыха»"
                            placeholderTextColor="#9CA3AF"
                            value={title}
                            onChangeText={setTitle}
                            maxLength={100}
                        />
                        <Text style={s.charCount}>{title.length}/100</Text>
                    </View>

                    {/* Description */}
                    <View style={s.fieldWrap}>
                        <View style={s.fieldHeader}>
                            <AlignLeft size={18} color={TEAL} />
                            <Text style={s.fieldLabel}>Описание катера *</Text>
                        </View>
                        <Text style={s.fieldHint}>
                            Опишите особенности, оборудование, для какого отдыха подойдёт
                        </Text>
                        <TextInput
                            style={[s.input, s.textArea]}
                            placeholder="Расскажите, чем ваш катер выделяется среди других..."
                            placeholderTextColor="#9CA3AF"
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            textAlignVertical="top"
                            maxLength={2000}
                        />
                        <Text style={s.charCount}>{description.length}/2000</Text>
                    </View>

                    {/* Rules */}
                    <View style={s.fieldWrap}>
                        <View style={s.fieldHeader}>
                            <ShieldCheck size={18} color={TEAL} />
                            <Text style={s.fieldLabel}>Правила поведения на катере</Text>
                        </View>
                        <Text style={s.fieldHint}>
                            Укажите важные правила и ограничения для арендаторов
                        </Text>
                        <TextInput
                            style={[s.input, s.textArea]}
                            placeholder="Например: запрет курения, наличие спасательных жилетов обязательно, минимальный возраст водителя 18 лет..."
                            placeholderTextColor="#9CA3AF"
                            value={rules}
                            onChangeText={setRules}
                            multiline
                            textAlignVertical="top"
                            maxLength={1000}
                        />
                        <Text style={s.charCount}>{rules.length}/1000</Text>
                    </View>

                    {/* Cancellation policy */}
                    <View style={s.fieldWrap}>
                        <View style={s.fieldHeader}>
                            <XCircle size={18} color={TEAL} />
                            <Text style={s.fieldLabel}>Условия отмены бронирования</Text>
                        </View>
                        <Text style={s.fieldHint}>
                            Опишите условия возврата средств при отмене бронирования
                        </Text>
                        <TextInput
                            style={[s.input, s.textArea]}
                            placeholder="Например: бесплатная отмена за 24 часа, при отмене менее чем за 12 часов — возврат 50%..."
                            placeholderTextColor="#9CA3AF"
                            value={cancellationPolicy}
                            onChangeText={setCancellationPolicy}
                            multiline
                            textAlignVertical="top"
                            maxLength={1000}
                        />
                        <Text style={s.charCount}>{cancellationPolicy.length}/1000</Text>
                    </View>

                    {/* Captain option */}
                    <View style={s.fieldWrap}>
                        <View style={s.fieldHeader}>
                            <Anchor size={18} color={TEAL} />
                            <Text style={s.fieldLabel}>Капитан *</Text>
                        </View>
                        <Text style={s.fieldHint}>
                            Укажите, как сдаётся катер в аренду
                        </Text>
                        <View style={s.captainOptions}>
                            {[
                                { key: 'included', label: 'С капитаном', desc: 'Капитан включён в стоимость аренды' },
                                { key: 'none', label: 'Без капитана', desc: 'Арендатор управляет самостоятельно' },
                            ].map((opt) => {
                                const active = captainOption === opt.key;
                                return (
                                    <TouchableOpacity
                                        key={opt.key}
                                        style={[s.captainCard, active && s.captainCardActive]}
                                        onPress={() => setCaptainOption(opt.key)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[s.radioOuter, active && s.radioOuterActive]}>
                                            {active && <View style={s.radioInner} />}
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[s.captainLabel, active && s.captainLabelActive]}>{opt.label}</Text>
                                            <Text style={s.captainDesc}>{opt.desc}</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Footer */}
            <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                <TouchableOpacity
                    style={[s.submitBtn, (!canSubmit || loading) && s.submitBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={!canSubmit || loading}
                    activeOpacity={0.85}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <>
                            <Check size={20} color="#fff" />
                            <Text style={s.submitBtnText}>Добавить катер</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#fff' },

    headerWrap: { overflow: 'hidden' },
    headerInner: { paddingHorizontal: 20, paddingBottom: 28 },
    backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    backText: { color: '#fff', fontSize: 16, fontFamily: theme.fonts.medium, marginLeft: 4 },
    title: { fontSize: 28, fontFamily: theme.fonts.bold, color: '#fff', lineHeight: 36, marginBottom: 10 },
    subtitle: { fontSize: 14, fontFamily: theme.fonts.regular, color: 'rgba(255,255,255,0.82)', lineHeight: 20 },

    body: { flex: 1 },
    bodyContent: { paddingHorizontal: 20, paddingTop: 24 },

    fieldWrap: { marginBottom: 24 },
    fieldHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    fieldLabel: { fontSize: 16, fontFamily: theme.fonts.semiBold, color: '#1B365D' },
    fieldHint: { fontSize: 13, fontFamily: theme.fonts.regular, color: '#9CA3AF', marginBottom: 8, lineHeight: 18 },

    input: {
        borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
        paddingHorizontal: 16, paddingVertical: 14,
        fontSize: 15, fontFamily: theme.fonts.regular, color: '#1B365D',
        backgroundColor: '#fff',
    },
    textArea: { minHeight: 120, paddingTop: 14 },
    charCount: {
        fontSize: 12, fontFamily: theme.fonts.regular, color: '#9CA3AF',
        textAlign: 'right', marginTop: 4,
    },

    captainOptions: { gap: 10 },
    captainCard: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12,
        paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff',
    },
    captainCardActive: { borderColor: TEAL, backgroundColor: '#F0FAFA' },
    radioOuter: {
        width: 22, height: 22, borderRadius: 11,
        borderWidth: 2, borderColor: '#D1D5DB',
        alignItems: 'center', justifyContent: 'center',
    },
    radioOuterActive: { borderColor: TEAL },
    radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: TEAL },
    captainLabel: { fontSize: 15, fontFamily: theme.fonts.semiBold, color: '#1B365D' },
    captainLabelActive: { color: TEAL },
    captainDesc: { fontSize: 12, fontFamily: theme.fonts.regular, color: '#9CA3AF', marginTop: 2 },

    footer: {
        paddingHorizontal: 20, paddingTop: 12,
        borderTopWidth: 1, borderTopColor: '#F3F4F6', backgroundColor: '#fff',
    },
    submitBtn: {
        backgroundColor: TEAL, borderRadius: 12, paddingVertical: 16,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    submitBtnDisabled: { opacity: 0.45 },
    submitBtnText: { fontSize: 16, fontFamily: theme.fonts.semiBold, color: '#fff' },
});

import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    ChevronLeft, Ship, Anchor, Waves, Sailboat, Move3d, Zap,
} from 'lucide-react-native';
import { theme } from '../../shared/theme';

let LinearGradient = null;
try { LinearGradient = require('expo-linear-gradient').LinearGradient; } catch (_) {}

const GRADIENT = ['#0A4D4D', '#0D5C5C', '#1A7A5A'];
const TEAL = '#0D5C5C';

const BOAT_TYPES = [
    { id: '1', name: 'Катер',          slug: 'motorboat', Icon: Ship },
    { id: '2', name: 'Яхта',           slug: 'yacht',     Icon: Anchor },
    { id: '3', name: 'Гидроцикл',      slug: 'jetski',    Icon: Zap },
    { id: '4', name: 'Парусная яхта',  slug: 'sailboat',  Icon: Sailboat },
    { id: '5', name: 'Катамаран',       slug: 'catamaran', Icon: Move3d },
    { id: '6', name: 'Буксировщик',    slug: 'wakeboat',  Icon: Waves },
];

const { width: SCREEN_W } = Dimensions.get('window');
const GRID_PAD = 20;
const GAP = 12;
const COLS = 3;
const CARD_W = (SCREEN_W - GRID_PAD * 2 - GAP * (COLS - 1)) / COLS;

export default function BoatTypeScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const [selected, setSelected] = useState(null);

    const handleNext = () => {
        if (!selected) return;
        const { Icon, ...serializable } = selected;
        navigation.replace('BoatInfo', { boatType: serializable });
    };

    return (
        <View style={s.root}>
            <View style={s.headerWrap}>
                {LinearGradient ? (
                    <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
                ) : (
                    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: TEAL }]} />
                )}

                <View style={[s.headerInner, { paddingTop: insets.top + 8 }]}>
                    <TouchableOpacity
                        style={s.backBtn}
                        onPress={() => navigation.goBack()}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                        <ChevronLeft size={24} color="#fff" />
                        <Text style={s.backText}>Назад</Text>
                    </TouchableOpacity>

                    <Text style={s.title}>Выберите тип{'\n'}судна</Text>
                    <Text style={s.subtitle}>
                        Укажите тип вашего судна, чтобы мы могли правильно настроить объявление.
                    </Text>
                </View>
            </View>

            <ScrollView
                style={s.body}
                contentContainerStyle={s.bodyContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={s.grid}>
                    {BOAT_TYPES.map((type) => {
                        const isActive = selected?.id === type.id;
                        const IconComp = type.Icon;
                        return (
                            <TouchableOpacity
                                key={type.id}
                                style={[s.card, isActive && s.cardActive]}
                                onPress={() => setSelected(type)}
                                activeOpacity={0.7}
                            >
                                <View style={[s.iconCircle, isActive && s.iconCircleActive]}>
                                    <IconComp
                                        size={28}
                                        color={isActive ? '#fff' : TEAL}
                                        strokeWidth={1.6}
                                    />
                                </View>
                                <Text
                                    style={[s.cardLabel, isActive && s.cardLabelActive]}
                                    numberOfLines={2}
                                >
                                    {type.name}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>

            <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                <TouchableOpacity
                    style={[s.nextBtn, !selected && s.nextBtnDisabled]}
                    onPress={handleNext}
                    disabled={!selected}
                    activeOpacity={0.85}
                >
                    <Text style={s.nextBtnText}>Продолжить</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#fff' },

    headerWrap: { overflow: 'hidden' },
    headerInner: { paddingHorizontal: 20, paddingBottom: 32 },
    backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
    backText: { color: '#fff', fontSize: 16, fontFamily: theme.fonts.medium, marginLeft: 4 },
    title: {
        fontSize: 28, fontFamily: theme.fonts.bold, color: '#fff',
        lineHeight: 36, marginBottom: 12,
    },
    subtitle: {
        fontSize: 14, fontFamily: theme.fonts.regular, color: 'rgba(255,255,255,0.82)',
        lineHeight: 20,
    },

    body: { flex: 1 },
    bodyContent: { paddingHorizontal: GRID_PAD, paddingTop: 28, paddingBottom: 24 },

    grid: {
        flexDirection: 'row', flexWrap: 'wrap',
        gap: GAP,
    },

    card: {
        width: CARD_W, aspectRatio: 0.9,
        borderRadius: 14, borderWidth: 1.5, borderColor: '#E5E7EB',
        backgroundColor: '#fff',
        alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: 6, paddingVertical: 12,
    },
    cardActive: {
        borderColor: TEAL, backgroundColor: '#F0F9F8',
    },

    iconCircle: {
        width: 52, height: 52, borderRadius: 26,
        backgroundColor: '#F0F9F8',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 10,
    },
    iconCircleActive: {
        backgroundColor: TEAL,
    },

    cardLabel: {
        fontSize: 13, fontFamily: theme.fonts.medium, color: '#374151',
        textAlign: 'center', lineHeight: 17,
    },
    cardLabelActive: {
        color: TEAL, fontFamily: theme.fonts.semiBold,
    },

    footer: {
        paddingHorizontal: 20, paddingTop: 12,
        borderTopWidth: 1, borderTopColor: '#F3F4F6', backgroundColor: '#fff',
    },
    nextBtn: {
        backgroundColor: TEAL, borderRadius: 12,
        paddingVertical: 16, alignItems: 'center',
    },
    nextBtnDisabled: { opacity: 0.45 },
    nextBtnText: { fontSize: 16, fontFamily: theme.fonts.semiBold, color: '#fff' },
});

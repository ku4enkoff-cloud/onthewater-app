import React, { useState, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Dimensions,
    Image, FlatList, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Anchor, Waves, Ship, ChevronRight } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { theme } from '../../shared/theme';

const { width } = Dimensions.get('window');
const CARD_RADIUS = 28;
const FOOTER_PADDING_H = 20;

const SLIDES = [
    {
        id: '1',
        Icon: Anchor,
        title: 'Откройте для себя\nлучшие катера',
        description: 'Тысячи лодок и яхт в аренду в 600+ локациях по всему миру.',
        accent: ['#0ea5e9', '#06b6d4'],
        image: 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=800&q=80',
    },
    {
        id: '2',
        Icon: Waves,
        title: 'Бронируйте\nза минуты',
        description: 'Подтверждение моментально, безопасная оплата.',
        accent: ['#34d399', '#10b981'],
        image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80',
    },
    {
        id: '3',
        Icon: Ship,
        title: 'Незабываемые\nвпечатления',
        description: 'Создавайте воспоминания с семьёй и друзьями на воде.',
        accent: ['#a78bfa', '#f472b6'],
        image: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=800&q=80',
    },
];

export default function OnboardingScreen({ onFinish }) {
    const insets = useSafeAreaInsets();
    const [current, setCurrent] = useState(0);
    const flatRef = useRef(null);

    const next = () => {
        if (current < SLIDES.length - 1) {
            flatRef.current?.scrollToIndex({ index: current + 1 });
            setCurrent(current + 1);
        } else {
            onFinish();
        }
    };

    const onViewableItemsChanged = useRef(({ viewableItems }) => {
        if (viewableItems[0]) setCurrent(viewableItems[0].index);
    }).current;
    const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

    const slide = SLIDES[current];
    const Icon = slide?.Icon;

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom }]}>
            <StatusBar style="light" />
            <FlatList
                ref={flatRef}
                data={SLIDES}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScrollToIndexFailed={() => {}}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View style={[styles.slide, { width }]}>
                        <Image source={{ uri: item.image }} style={styles.slideImage} />
                        <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.85)']}
                            locations={[0.2, 0.5, 1]}
                            style={StyleSheet.absoluteFill}
                        />
                    </View>
                )}
            />

            <TouchableOpacity
                style={[styles.skip, { top: insets.top + 8 }]}
                onPress={onFinish}
                activeOpacity={0.7}
            >
                <Text style={styles.skipText}>Пропустить</Text>
            </TouchableOpacity>

            <View style={[styles.logoWrap, { top: insets.top + 8 }]}>
                <LinearGradient
                    colors={['#0ea5e9', '#1B365D']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.logoBox}
                >
                    <Anchor size={22} color="#fff" strokeWidth={2} />
                </LinearGradient>
                <Text style={styles.logoText}>ONTHEWATER</Text>
            </View>

            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24) + 8 }]}>
                <View style={styles.footerCard}>
                    <LinearGradient
                        colors={['rgba(15,23,42,0.95)', 'rgba(15,23,42,0.98)']}
                        style={[styles.footerGradient, { borderRadius: CARD_RADIUS }]}
                    />
                    <View style={styles.footerContent}>
                        <View style={styles.indicators}>
                            {SLIDES.map((_, i) => (
                                <View
                                    key={i}
                                    style={[
                                        styles.dot,
                                        i === current && styles.dotActive,
                                        i === current && { backgroundColor: slide?.accent?.[0] || '#0ea5e9' },
                                    ]}
                                />
                            ))}
                        </View>
                        {Icon && (
                            <LinearGradient
                                colors={slide.accent || ['#0ea5e9', '#1B365D']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.iconWrap}
                            >
                                <Icon size={28} color="#fff" strokeWidth={1.8} />
                            </LinearGradient>
                        )}
                        {slide && (
                            <>
                                <Text style={styles.title}>{slide.title}</Text>
                                <Text style={styles.description}>{slide.description}</Text>
                            </>
                        )}
                        <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={next}
                            style={styles.nextBtnWrap}
                        >
                            <LinearGradient
                                colors={slide?.accent || ['#0ea5e9', '#1B365D']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.nextBtn}
                            >
                                <Text style={styles.nextBtnText}>
                                    {current === SLIDES.length - 1 ? 'Начать' : 'Далее'}
                                </Text>
                                <ChevronRight size={22} color="#fff" strokeWidth={2.5} />
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#030712',
    },
    slide: {
        flex: 1,
    },
    slideImage: {
        ...StyleSheet.absoluteFillObject,
        width,
        resizeMode: 'cover',
    },
    skip: {
        position: 'absolute',
        right: FOOTER_PADDING_H,
        zIndex: 10,
        paddingVertical: 10,
        paddingHorizontal: 18,
    },
    skipText: {
        fontSize: 15,
        color: 'rgba(255,255,255,0.85)',
        fontFamily: theme.fonts.medium,
    },
    logoWrap: {
        position: 'absolute',
        left: FOOTER_PADDING_H,
        zIndex: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    logoBox: {
        width: 42,
        height: 42,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 6 },
            android: { elevation: 6 },
        }),
    },
    logoText: {
        fontSize: 22,
        fontFamily: theme.fonts.bold,
        color: '#fff',
        letterSpacing: 0.5,
    },
    footer: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: FOOTER_PADDING_H,
    },
    footerCard: {
        borderRadius: CARD_RADIUS,
        overflow: 'hidden',
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.35, shadowRadius: 16 },
            android: { elevation: 16 },
        }),
    },
    footerGradient: {
        ...StyleSheet.absoluteFillObject,
    },
    footerContent: {
        paddingHorizontal: 24,
        paddingTop: 28,
        paddingBottom: 28,
    },
    indicators: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 28,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.25)',
    },
    dotActive: {
        width: 28,
    },
    iconWrap: {
        width: 56,
        height: 56,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 22,
    },
    title: {
        fontSize: 26,
        fontFamily: theme.fonts.bold,
        color: '#fff',
        lineHeight: 34,
        marginBottom: 10,
    },
    description: {
        fontSize: 16,
        fontFamily: theme.fonts.regular,
        color: 'rgba(255,255,255,0.75)',
        lineHeight: 24,
        marginBottom: 26,
    },
    nextBtnWrap: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    nextBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        height: 58,
        borderRadius: 16,
    },
    nextBtnText: {
        fontSize: 18,
        fontFamily: theme.fonts.bold,
        color: '#fff',
        letterSpacing: 0.3,
    },
});

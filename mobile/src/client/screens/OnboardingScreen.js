import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Image, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Anchor, Waves, Ship, ChevronRight } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { theme } from '../../shared/theme';

const { width } = Dimensions.get('window');

const SLIDES = [
    {
        id: '1',
        Icon: Anchor,
        title: 'Откройте для себя лучшие катера',
        description: 'Тысячи лодок и яхт в аренду в 600+ локациях по всему миру.',
        color: '#1B365D',
        image: 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=800&q=80',
    },
    {
        id: '2',
        Icon: Waves,
        title: 'Бронируйте за минуты',
        description: 'Подтверждение моментально, безопасная оплата.',
        color: '#34d399',
        image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80',
    },
    {
        id: '3',
        Icon: Ship,
        title: 'Незабываемые впечатления',
        description: 'Создавайте воспоминания с семьёй и друзьями на воде.',
        color: '#f472b6',
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
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
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
                        <View style={styles.slideOverlay} />
                    </View>
                )}
            />

            <TouchableOpacity style={[styles.skip, { top: insets.top + 12 }]} onPress={onFinish} activeOpacity={0.8}>
                <Text style={styles.skipText}>Пропустить</Text>
            </TouchableOpacity>

            <View style={[styles.logoWrap, { top: insets.top + 12 }]}>
                <View style={styles.logoBox}>
                    <Anchor size={24} color="#0a0f1c" />
                </View>
                <Text style={styles.logoText}>WAVE</Text>
            </View>

            <View style={styles.footer}>
                <View style={styles.indicators}>
                    {SLIDES.map((_, i) => (
                        <View
                            key={i}
                            style={[styles.dot, i === current && styles.dotActive]}
                        />
                    ))}
                </View>
                {Icon && (
                    <View style={[styles.iconWrap, { backgroundColor: slide.color + '20' }]}>
                        <Icon size={32} color={slide.color} />
                    </View>
                )}
                {slide && (
                    <>
                        <Text style={styles.title}>{slide.title}</Text>
                        <Text style={styles.description}>{slide.description}</Text>
                    </>
                )}
                <TouchableOpacity style={styles.nextBtn} onPress={next} activeOpacity={0.9}>
                    <Text style={styles.nextBtnText}>
                        {current === SLIDES.length - 1 ? 'Начать' : 'Далее'}
                    </Text>
                    <ChevronRight size={20} color="#0a0f1c" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0f1c',
    },
    slide: {
        flex: 1,
        height: '100%',
    },
    slideImage: {
        ...StyleSheet.absoluteFillObject,
        width,
        height: '100%',
        resizeMode: 'cover',
    },
    slideOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(10,15,28,0.6)',
    },
    skip: {
        position: 'absolute',
        right: 24,
        zIndex: 10,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 9999,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    skipText: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
        fontFamily: theme.fonts.medium,
    },
    logoWrap: {
        position: 'absolute',
        left: 24,
        zIndex: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    logoBox: {
        width: 40,
        height: 40,
        backgroundColor: '#1B365D',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoText: {
        fontSize: 20,
        fontFamily: theme.fonts.bold,
        color: '#fff',
    },
    footer: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: 24,
        paddingBottom: 32,
        paddingTop: 24,
    },
    indicators: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 24,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    dotActive: {
        width: 32,
        backgroundColor: '#1B365D',
    },
    iconWrap: {
        width: 64,
        height: 64,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontFamily: theme.fonts.bold,
        color: '#fff',
        marginBottom: 12,
    },
    description: {
        fontSize: 17,
        color: 'rgba(255,255,255,0.8)',
        lineHeight: 26,
        marginBottom: 24,
    },
    nextBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 56,
        backgroundColor: '#1B365D',
        borderRadius: 16,
    },
    nextBtnText: {
        fontSize: 18,
        fontFamily: theme.fonts.bold,
        color: '#0a0f1c',
    },
});

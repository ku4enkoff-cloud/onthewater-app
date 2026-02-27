import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, NativeModules, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { theme } from '../../shared/theme';
import { api } from '../../shared/infrastructure/api';

const CITY_COORDS = {
    'Москва': { lat: 55.751244, lon: 37.618423 },
    'Санкт-Петербург': { lat: 59.93428, lon: 30.335099 },
    'Сочи': { lat: 43.585472, lon: 39.723098 },
    'Крым': { lat: 44.952117, lon: 34.102417 },
    'Казань': { lat: 55.830955, lon: 49.06608 },
};

const DEFAULT_COORDS = { lat: 55.751244, lon: 37.618423 };

const isMapAvailable = NativeModules.yamap != null;
let YaMap = null;
let Marker = null;
if (isMapAvailable) {
    try {
        const yamap = require('react-native-yamap');
        YaMap = yamap.default;
        Marker = yamap.Marker;
    } catch (_) {}
}

export default function CityMapScreen({ route, navigation }) {
    const insets = useSafeAreaInsets();
    const { cityName, useMyLocation, boats = [] } = route.params || {};
    const [center, setCenter] = useState(DEFAULT_COORDS);

    useEffect(() => {
        if (useMyLocation) {
            (async () => {
                try {
                    const expoLocation = require('expo-location');
                    const { status } = await expoLocation.requestForegroundPermissionsAsync?.() || {};
                    if (status === 'granted') {
                        const pos = await expoLocation.getCurrentPositionAsync?.({});
                        if (pos?.coords) {
                            setCenter({ lat: pos.coords.latitude, lon: pos.coords.longitude });
                        }
                    }
                } catch (_) {}
            })();
        } else if (cityName && CITY_COORDS[cityName]) {
            setCenter(CITY_COORDS[cityName]);
        } else {
            setCenter(DEFAULT_COORDS);
        }
    }, [cityName, useMyLocation]);

    if (!isMapAvailable || !YaMap) {
        return (
            <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
                <TouchableOpacity
                    style={[styles.backButton, { top: insets.top + 8 }]}
                    onPress={() => navigation.goBack()}
                >
                    <ChevronLeft size={24} color={theme.colors.textMain} />
                </TouchableOpacity>
                <Text style={styles.placeholderTitle}>Карта</Text>
                <Text style={styles.placeholderText}>
                    Карта Яндекс доступна в полной сборке приложения (expo run:android / expo run:ios)
                </Text>
            </View>
        );
    }

    const markers = boats.filter((b) => b.lat != null && b.lng != null);

    return (
        <View style={styles.container}>
            <YaMap
                style={StyleSheet.absoluteFillObject}
                initialRegion={{
                    lat: center.lat,
                    lon: center.lon,
                    zoom: 12,
                }}
            >
                {markers.map((boat) => (
                    <Marker
                        key={boat.id}
                        point={{ lat: boat.lat, lon: boat.lng }}
                        onPress={() => navigation.navigate('BoatDetail', { boatId: boat.id })}
                    />
                ))}
            </YaMap>
            <TouchableOpacity
                style={[styles.backButton, { top: insets.top + 8 }]}
                onPress={() => navigation.goBack()}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
                <ChevronLeft size={24} color={theme.colors.textMain} />
            </TouchableOpacity>
            <View style={[styles.headerBar, { top: insets.top + 8 }]}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                    {useMyLocation ? 'Моё местоположение' : (cityName || 'Карта')}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.surface,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.lg,
    },
    backButton: {
        position: 'absolute',
        left: theme.spacing.lg,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
    },
    headerBar: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingHorizontal: 56,
        zIndex: 9,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: theme.colors.textMain,
        backgroundColor: theme.colors.background,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 10,
        overflow: 'hidden',
    },
    placeholderTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: theme.colors.textMain,
        marginBottom: theme.spacing.sm,
    },
    placeholderText: {
        fontSize: 15,
        color: theme.colors.textMuted,
        textAlign: 'center',
    },
});

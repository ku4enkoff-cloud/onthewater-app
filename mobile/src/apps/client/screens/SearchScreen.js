import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Dimensions, NativeModules } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../../theme';
import { api } from '../../../infrastructure/api';
import { getPhotoUrl } from '../../../shared/infrastructure/config';

const { width } = Dimensions.get('window');

const resolvePhotoUri = (src) => getPhotoUrl(src);

// Карта доступна только если нативный модуль Яндекс.Карт слинкован (не в Expo Go)
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

export default function SearchScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const [boats, setBoats] = useState([]);

    const [region, setRegion] = useState({
        latitude: 55.751244,
        longitude: 37.618423,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
    });

    useEffect(() => {
        fetchBoats();
    }, []);

    const fetchBoats = async () => {
        try {
            if (isMapAvailable && YaMap) {
                const res = await api.get('/boats', {
                    params: { lat: region.latitude, lng: region.longitude, radius: 20 }
                });
                setBoats(res.data);
            } else {
                const res = await api.get('/boats', { params: { popular: 1, limit: 10 } });
                setBoats(res.data);
            }
        } catch (e) {
            console.log('Search Error:', e);
        }
    };

    const renderBoatCard = ({ item }, vertical = false) => (
        <TouchableOpacity
            style={[styles.card, vertical && styles.cardVertical]}
            onPress={() => navigation.navigate('BoatDetail', { boatId: item.id })}
        >
            <Image
                source={{ uri: resolvePhotoUri(item.photos?.[0]) || 'https://placehold.co/400x300/png' }}
                style={styles.cardImage}
            />
            <View style={styles.cardInfo}>
                <View style={styles.cardHeader}>
                    <Text style={theme.typography.h3} numberOfLines={1}>{item.title}</Text>
                    {item.price_weekend != null && String(item.price_weekend).trim() !== '' ? (
                        <Text style={styles.priceText}>{item.price_per_hour} ₽ будни · {item.price_weekend} ₽ вых.</Text>
                    ) : (
                        <Text style={styles.priceText}>{item.price_per_hour} ₽ / час</Text>
                    )}
                </View>
                <Text style={theme.typography.bodySm}>{item.location_city}</Text>
                <Text style={theme.typography.caption}>Вместимость: {item.capacity} чел. • ★ {item.rating}</Text>
            </View>
        </TouchableOpacity>
    );

    const listContent = (
        <View style={[styles.bottomListContainer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
            <FlatList
                horizontal
                data={boats}
                renderItem={renderBoatCard}
                keyExtractor={item => item.id.toString()}
                showsHorizontalScrollIndicator={false}
                snapToInterval={width * 0.85 + 16}
                decelerationRate="fast"
                contentContainerStyle={{ paddingHorizontal: 16 }}
            />
        </View>
    );

    // Без нативного модуля карты (Expo Go) показываем только список
    if (!isMapAvailable || !YaMap) {
        return (
            <View style={styles.container}>
                <View style={styles.listOnlyHeader}>
                    <Text style={theme.typography.h1}>Поиск катеров</Text>
                    <Text style={[theme.typography.bodySm, { color: theme.colors.textMuted, marginTop: 4 }]}>
                        Карта доступна в полной сборке приложения
                    </Text>
                </View>
                <FlatList
                    data={boats}
                    renderItem={(args) => renderBoatCard(args, true)}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={[styles.verticalList, { paddingBottom: insets.bottom + 80 }]}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyHint}>
                            <Text style={[theme.typography.body, { color: theme.colors.textMuted }]}>
                                Запустите бэкенд (server) и обновите список
                            </Text>
                        </View>
                    }
                />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <YaMap
                style={StyleSheet.absoluteFillObject}
                initialRegion={{
                    lat: region.latitude,
                    lon: region.longitude,
                    zoom: 12
                }}
                onCameraPositionChangeEnd={(event) => {
                    setRegion({
                        latitude: event.nativeEvent.point.lat,
                        longitude: event.nativeEvent.point.lon,
                        latitudeDelta: 0.1,
                        longitudeDelta: 0.1,
                    });
                    fetchBoats();
                }}
            >
                {boats.map(boat => (
                    <Marker
                        key={boat.id}
                        point={{ lat: boat.lat || region.latitude, lon: boat.lng || region.longitude }}
                    />
                ))}
            </YaMap>
            {listContent}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    listOnlyHeader: {
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.xl,
        paddingBottom: theme.spacing.md,
    },
    verticalList: {
        paddingHorizontal: theme.spacing.lg,
    },
    emptyHint: {
        paddingVertical: theme.spacing.xl,
        alignItems: 'center',
    },
    bottomListContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    card: {
        width: width * 0.85,
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.lg,
        marginRight: 16,
        ...theme.shadows.card,
        overflow: 'hidden',
        marginBottom: 10,
    },
    cardVertical: {
        width: '100%',
        marginRight: 0,
        marginBottom: theme.spacing.md,
    },
    cardImage: {
        width: '100%',
        height: 180,
        resizeMode: 'cover',
    },
    cardInfo: {
        padding: theme.spacing.md,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    priceText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.secondary,
    }
});

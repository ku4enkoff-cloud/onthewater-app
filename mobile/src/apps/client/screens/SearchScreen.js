import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../../theme';
import { api } from '../../../infrastructure/api';
import { getPhotoUrl } from '../../../shared/infrastructure/config';

const resolvePhotoUri = (src) => getPhotoUrl(src);

export default function SearchScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const [boats, setBoats] = useState([]);

    useEffect(() => {
        fetchBoats();
    }, []);

    const fetchBoats = async () => {
        try {
            const res = await api.get('/boats', { params: { popular: 1, limit: 20 } });
            setBoats(res.data);
        } catch (e) {
            console.log('Search Error:', e);
        }
    };

    const renderBoatCard = ({ item }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('BoatDetail', { boatId: item.id })}
        >
            <Image
                source={{ uri: resolvePhotoUri(item.photos?.[0]) || 'https://placehold.co/400x300/png' }}
                style={styles.cardImage}
            />
            <View style={styles.cardInfo}>
                <View style={styles.cardHeader}>
                    <Text style={theme.typography.h3} numberOfLines={1}>{item.title || 'Катер'}</Text>
                    {item.price_weekend != null && String(item.price_weekend).trim() !== '' ? (
                        <Text style={styles.priceText}>{Number(item.price_per_hour || 0).toLocaleString('ru-RU')} ₽ будни · {Number(item.price_weekend).toLocaleString('ru-RU')} ₽ вых.</Text>
                    ) : (
                        <Text style={styles.priceText}>от {Number(item.price_per_hour || 0).toLocaleString('ru-RU')} ₽/час</Text>
                    )}
                </View>
                <View style={{ marginTop: 4 }}>
                    <Text style={theme.typography.bodySm}>{item.location_city}</Text>
                    <Text style={theme.typography.caption}>Вместимость: {item.capacity} чел. • ★ {item.rating}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    // Главный экран — только список катеров, без карты (карта в CityMapScreen)
    return (
        <View style={styles.container}>
            <View style={styles.listOnlyHeader}>
                <Text style={theme.typography.h1}>Поиск катеров</Text>
                <Text style={[theme.typography.bodySm, { color: theme.colors.textMuted, marginTop: 4 }]}>
                    Популярные предложения
                </Text>
            </View>
            <FlatList
                data={boats}
                renderItem={renderBoatCard}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={[styles.verticalList, { paddingBottom: insets.bottom + 80 }]}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyHint}>
                        <Text style={[theme.typography.body, { color: theme.colors.textMuted }]}>
                            Запустите бэкенд и обновите список
                        </Text>
                    </View>
                }
            />
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
    card: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: theme.borderRadius.lg,
        marginBottom: theme.spacing.md,
        ...theme.shadows.card,
        overflow: 'hidden',
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
        gap: 8,
        marginBottom: 0,
    },
    priceText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.colors.secondary,
        flexShrink: 0,
    }
});

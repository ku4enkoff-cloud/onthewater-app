import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, MapPin, ChevronRight } from 'lucide-react-native';
import { theme } from '../../shared/theme';
import { api } from '../../shared/infrastructure/api';

export default function LocationSelectScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const [cities, setCities] = useState([]);

    useEffect(() => {
        let isMounted = true;
        (async () => {
            try {
                const res = await api.get('/destinations');
                const items = (res.data || []).map((d, idx) => ({
                    id: String(d.id ?? idx),
                    name: d.name || '—',
                }));
                if (isMounted) setCities(items);
            } catch (e) {
                console.log('LocationSelect destinations error', e);
                if (isMounted) {
                    setCities([
                        { id: 'moscow', name: 'Москва' },
                        { id: 'mo_region', name: 'Московская область' },
                        { id: 'spb', name: 'Санкт-Петербург' },
                        { id: 'sochi', name: 'Сочи' },
                        { id: 'crimea', name: 'Крым' },
                        { id: 'kazan', name: 'Казань' },
                    ]);
                }
            }
        })();
        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                    <ChevronLeft size={24} color={theme.colors.textMain} />
                </TouchableOpacity>
                <Text style={styles.title}>Выберите место</Text>
            </View>

            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                <TouchableOpacity
                    style={styles.row}
                    onPress={() =>
                        navigation.navigate('SearchResults', {
                            useMyLocation: true,
                            cityName: null,
                            dateISO: new Date().toISOString(),
                        })
                    }
                    activeOpacity={0.7}
                >
                    <View style={styles.rowIcon}>
                        <MapPin size={22} color={theme.colors.primary} />
                    </View>
                    <Text style={styles.rowTitle}>Моё местоположение</Text>
                    <ChevronRight size={20} color={theme.colors.textMuted} />
                </TouchableOpacity>

                {cities.map((city) => (
                    <TouchableOpacity
                        key={city.id}
                        style={styles.row}
                        onPress={() =>
                            navigation.navigate('SearchResults', {
                                cityName: city.name,
                                useMyLocation: false,
                                dateISO: new Date().toISOString(),
                            })
                        }
                        activeOpacity={0.7}
                    >
                        <Text style={styles.rowTitle}>{city.name}</Text>
                        <ChevronRight size={20} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
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
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: theme.spacing.sm,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.textMain,
    },
    list: {
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.md,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    rowIcon: {
        marginRight: theme.spacing.md,
    },
    rowTitle: {
        flex: 1,
        fontSize: 17,
        fontWeight: '500',
        color: theme.colors.textMain,
    },
});

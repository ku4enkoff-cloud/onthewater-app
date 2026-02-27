import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, MapPin, ChevronRight } from 'lucide-react-native';
import { theme } from '../../shared/theme';

const CITIES = [
    { id: 'moscow', name: 'Москва' },
    { id: 'spb', name: 'Санкт-Петербург' },
    { id: 'sochi', name: 'Сочи' },
    { id: 'crimea', name: 'Крым' },
    { id: 'kazan', name: 'Казань' },
];

export default function LocationSelectScreen({ navigation }) {
    const insets = useSafeAreaInsets();

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

            <View style={styles.list}>
                <TouchableOpacity
                    style={styles.row}
                    onPress={() => navigation.navigate('CityBoats', { useMyLocation: true })}
                    activeOpacity={0.7}
                >
                    <View style={styles.rowIcon}>
                        <MapPin size={22} color={theme.colors.primary} />
                    </View>
                    <Text style={styles.rowTitle}>Моё местоположение</Text>
                    <ChevronRight size={20} color={theme.colors.textMuted} />
                </TouchableOpacity>

                {CITIES.map((city) => (
                    <TouchableOpacity
                        key={city.id}
                        style={styles.row}
                        onPress={() => navigation.navigate('CityBoats', { cityName: city.name })}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.rowTitle}>{city.name}</Text>
                        <ChevronRight size={20} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                ))}
            </View>
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

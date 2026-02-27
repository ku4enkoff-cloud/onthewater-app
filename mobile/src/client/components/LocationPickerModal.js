import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Search, MapPin, Navigation } from 'lucide-react-native';
import { theme } from '../../shared/theme';

const CITIES = [
    { id: 'moscow', name: 'Москва' },
    { id: 'spb', name: 'Санкт-Петербург' },
    { id: 'sochi', name: 'Сочи' },
    { id: 'crimea', name: 'Крым' },
    { id: 'kazan', name: 'Казань' },
    { id: 'nn', name: 'Нижний Новгород' },
    { id: 'krasnodar', name: 'Краснодар' },
];

export default function LocationPickerModal({ visible, onClose, onSelect }) {
    const insets = useSafeAreaInsets();
    const [query, setQuery] = useState('');

    const filtered = useMemo(() => {
        if (!query.trim()) return CITIES;
        const q = query.trim().toLowerCase();
        return CITIES.filter((c) => c.name.toLowerCase().includes(q));
    }, [query]);

    const handleSelect = (useMyLocation, cityName) => {
        setQuery('');
        onSelect?.({ useMyLocation, cityName });
        onClose?.();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                style={[styles.container, { paddingTop: insets.top }]}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={0}
            >
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={onClose}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                        <ChevronLeft size={24} color={theme.colors.textMain} />
                    </TouchableOpacity>
                </View>

                <View style={styles.searchWrap}>
                    <View style={styles.searchBar}>
                        <Search size={20} color={theme.colors.gray400} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Куда хотите отправиться?"
                            placeholderTextColor={theme.colors.gray400}
                            value={query}
                            onChangeText={setQuery}
                            autoFocus={false}
                            returnKeyType="search"
                        />
                    </View>
                    <View style={styles.searchSeparator} />
                </View>

                <ScrollView
                    style={styles.list}
                    contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <TouchableOpacity
                        style={styles.row}
                        onPress={() => handleSelect(true, null)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.rowIcon}>
                            <Navigation size={22} color={theme.colors.primary} />
                        </View>
                        <Text style={styles.rowTitle}>Моё местоположение</Text>
                    </TouchableOpacity>

                    {filtered.map((c) => (
                        <TouchableOpacity
                            key={c.id}
                            style={styles.row}
                            onPress={() => handleSelect(false, c.name)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.rowIcon}>
                                <MapPin size={22} color={theme.colors.primary} />
                            </View>
                            <Text style={styles.rowTitle}>{c.name}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: theme.spacing.sm,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchWrap: {
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: theme.spacing.sm,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 17,
        fontFamily: theme.fonts.regular,
        color: theme.colors.textMain,
        paddingVertical: 0,
    },
    searchSeparator: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginTop: theme.spacing.md,
    },
    list: {
        flex: 1,
    },
    listContent: {
        paddingHorizontal: theme.spacing.lg,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
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

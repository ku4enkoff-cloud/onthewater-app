import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    FlatList,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Search, MapPin, Navigation } from 'lucide-react-native';
import { theme } from '../../shared/theme';
import { api } from '../../shared/infrastructure/api';
import { YANDEX_GEO_SUGGEST_API_KEY } from '../../shared/infrastructure/config';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const YANDEX_SUGGEST_URL = 'https://suggest-maps.yandex.ru/v1/suggest';

function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return debouncedValue;
}

function extractCityFromSuggestion(item) {
    const comp = item?.address?.component;
    if (Array.isArray(comp)) {
        const locality = comp.find((c) => c.kind && c.kind.includes('LOCALITY'));
        if (locality?.name) return locality.name;
        const province = comp.find((c) => c.kind && c.kind.includes('PROVINCE'));
        if (province?.name) return province.name;
    }
    const title = item?.title?.text || '';
    return title.split(',')[0]?.trim() || title;
}

export default function LocationPickerModal({ visible, onClose, onSelect }) {
    const insets = useSafeAreaInsets();
    const [query, setQuery] = useState('');
    const [citiesWithBoats, setCitiesWithBoats] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [loadingCities, setLoadingCities] = useState(false);
    const [loadingSuggest, setLoadingSuggest] = useState(false);
    const debouncedQuery = useDebounce(query, 300);
    const citiesSetRef = useRef(new Set());

    const fetchCitiesWithBoats = useCallback(async () => {
        setLoadingCities(true);
        try {
            const res = await api.get('/boats/cities');
            const list = Array.isArray(res.data) ? res.data : [];
            setCitiesWithBoats(list);
            citiesSetRef.current = new Set(list.map((c) => (c || '').trim().toLowerCase()));
        } catch (e) {
            console.warn('Fetch cities error:', e);
            setCitiesWithBoats([]);
            citiesSetRef.current = new Set();
        } finally {
            setLoadingCities(false);
        }
    }, []);

    useEffect(() => {
        if (visible) {
            fetchCitiesWithBoats();
            setQuery('');
            setSuggestions([]);
        }
    }, [visible, fetchCitiesWithBoats]);

    useEffect(() => {
        if (!debouncedQuery.trim()) {
            setSuggestions([]);
            setLoadingSuggest(false);
            return;
        }

        if (!YANDEX_GEO_SUGGEST_API_KEY) {
            const q = debouncedQuery.trim().toLowerCase();
            const cities = citiesWithBoats.filter((c) => (c || '').toLowerCase().includes(q));
            setSuggestions(cities.map((c) => ({ id: c, name: c })));
            setLoadingSuggest(false);
            return;
        }

        setLoadingSuggest(true);
        const url = `${YANDEX_SUGGEST_URL}?apikey=${encodeURIComponent(YANDEX_GEO_SUGGEST_API_KEY)}&text=${encodeURIComponent(debouncedQuery)}&types=locality,province,country&lang=ru&results=10`;
        fetch(url)
            .then(async (r) => {
                const text = await r.text();
                if (!text?.trim()) return { results: [] };
                try {
                    return JSON.parse(text);
                } catch (_) {
                    return { results: [] };
                }
            })
            .then((data) => {
                const raw = data?.results || [];
                const citiesSet = citiesSetRef.current;
                const filtered = [];
                const seen = new Set();
                for (const item of raw) {
                    const city = extractCityFromSuggestion(item);
                    const cityNorm = city.trim().toLowerCase();
                    if (!cityNorm || seen.has(cityNorm)) continue;
                    const matches = Array.from(citiesSet).some(
                        (ourCity) =>
                            ourCity === cityNorm ||
                            (ourCity && cityNorm.includes(ourCity)) ||
                            (ourCity && ourCity.includes(cityNorm)),
                    );
                    if (matches) {
                        seen.add(cityNorm);
                        filtered.push({ id: item.uri || city, name: city });
                    }
                }
                if (filtered.length === 0 && citiesSet.size > 0) {
                    const q = debouncedQuery.trim().toLowerCase();
                    const local = citiesWithBoats.filter((c) => (c || '').toLowerCase().includes(q));
                    setSuggestions(local.map((c) => ({ id: c, name: c })));
                } else {
                    setSuggestions(filtered);
                }
            })
            .catch((e) => {
                console.warn('Yandex suggest error:', e);
                const q = debouncedQuery.trim().toLowerCase();
                const local = citiesWithBoats.filter((c) => (c || '').toLowerCase().includes(q));
                setSuggestions(local.map((c) => ({ id: c, name: c })));
            })
            .finally(() => setLoadingSuggest(false));
    }, [debouncedQuery, citiesWithBoats]);

    const handleSelect = useCallback(
        (useMyLocation, cityName) => {
            setQuery('');
            setSuggestions([]);
            onSelect?.({ useMyLocation, cityName });
            onClose?.();
        },
        [onSelect, onClose],
    );

    const displayList = query.trim()
        ? suggestions
        : citiesWithBoats.map((c) => ({ id: c, name: c }));

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={styles.row}
            onPress={() => handleSelect(false, item.name)}
            activeOpacity={0.7}
        >
            <View style={styles.rowIcon}>
                <MapPin size={22} color={theme.colors.primary} />
            </View>
            <Text style={styles.rowTitle}>{item.name}</Text>
        </TouchableOpacity>
    );

    const ListHeader = () => (
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
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={onClose}
        >
            <View style={[styles.wrapper, { height: SCREEN_HEIGHT }]}>
                <KeyboardAvoidingView
                    style={[styles.container, { paddingTop: insets.top, flex: 1 }]}
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
                            {loadingSuggest && (
                                <ActivityIndicator size="small" color={theme.colors.primary} />
                            )}
                        </View>
                        <View style={styles.searchSeparator} />
                    </View>

                    {loadingCities ? (
                        <View style={styles.loadingWrap}>
                            <ActivityIndicator size="large" color={theme.colors.primary} />
                        </View>
                    ) : (
                        <FlatList
                            data={displayList}
                            keyExtractor={(item) => item.id}
                            renderItem={renderItem}
                            ListHeaderComponent={ListHeader}
                            contentContainerStyle={[
                                styles.listContent,
                                { paddingBottom: insets.bottom + 24 },
                            ]}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        />
                    )}
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
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
    loadingWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
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

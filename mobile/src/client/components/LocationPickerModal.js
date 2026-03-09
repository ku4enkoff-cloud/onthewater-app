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
    NativeModules,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Search, MapPin, Navigation } from 'lucide-react-native';
import { theme } from '../../shared/theme';
import { api } from '../../shared/infrastructure/api';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const isMapKitSuggestAvailable = NativeModules.YamapSuggests != null;
let SuggestModule = null;
let SuggestTypes = null;
if (isMapKitSuggestAvailable) {
    try {
        const yamap = require('react-native-yamap');
        SuggestModule = yamap.Suggest;
        SuggestTypes = yamap.SuggestTypes;
    } catch (_) {}
}

function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return debouncedValue;
}

/** Из ответа MapKit Suggest: title — название (город или "город, регион"), subtitle — доп. строка */
function cityNameFromMapKitItem(item) {
    const t = (item?.title || '').trim();
    return t.split(',')[0]?.trim() || t;
}

export default function LocationPickerModal({ visible, onClose, onSelect }) {
    const insets = useSafeAreaInsets();
    const [query, setQuery] = useState('');
    const [locationList, setLocationList] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [loadingCities, setLoadingCities] = useState(false);
    const [loadingSuggest, setLoadingSuggest] = useState(false);
    const debouncedQuery = useDebounce(query, 300);
    const citiesSetRef = useRef(new Set());

    const fetchLocationList = useCallback(async () => {
        setLoadingCities(true);
        try {
            let regions = [];
            let dests = [];
            try {
                const regionsRes = await api.get('/boats/regions');
                regions = Array.isArray(regionsRes.data) ? regionsRes.data : [];
            } catch (e) {
                console.warn('Regions fetch error:', e?.message || e);
            }
            try {
                const destinationsRes = await api.get('/destinations');
                dests = Array.isArray(destinationsRes.data) ? destinationsRes.data : [];
            } catch (e) {
                console.warn('Destinations fetch error:', e?.message || e);
            }
            const destNames = dests.map((d) => (d?.name ? String(d.name).trim() : '')).filter(Boolean);
            const seen = new Set();
            const combined = [];
            for (const r of regions) {
                const name = (r && typeof r === 'object' && r.region) ? String(r.region).trim() : (typeof r === 'string' ? String(r).trim() : '');
                if (name && !seen.has(name.toLowerCase())) {
                    seen.add(name.toLowerCase());
                    combined.push(name);
                }
            }
            for (const name of destNames) {
                if (name && !seen.has(name.toLowerCase())) {
                    seen.add(name.toLowerCase());
                    combined.push(name);
                }
            }
            setLocationList(combined.sort((a, b) => a.localeCompare(b, 'ru')));
            citiesSetRef.current = new Set(combined.map((c) => (c || '').trim().toLowerCase()));
        } catch (e) {
            console.warn('Fetch locations error:', e);
            setLocationList([]);
            citiesSetRef.current = new Set();
        } finally {
            setLoadingCities(false);
        }
    }, []);

    useEffect(() => {
        if (visible) {
            fetchLocationList();
            setQuery('');
            setSuggestions([]);
            if (SuggestModule?.reset) SuggestModule.reset().catch(() => {});
        }
        return () => {
            if (SuggestModule?.reset) SuggestModule.reset().catch(() => {});
        };
    }, [visible, fetchLocationList]);

    useEffect(() => {
        if (!debouncedQuery.trim()) {
            setSuggestions([]);
            setLoadingSuggest(false);
            return;
        }

        const q = debouncedQuery.trim().toLowerCase();
        const fallbackOnlyLocal = () => {
            const cities = locationList.filter((c) => (c || '').toLowerCase().includes(q));
            setSuggestions(cities.map((c) => ({ id: c, name: c })));
            setLoadingSuggest(false);
        };

        if (!SuggestModule?.suggest) {
            fallbackOnlyLocal();
            return;
        }

        setLoadingSuggest(true);
        const options = SuggestTypes ? { suggestTypes: [SuggestTypes.YMKSuggestTypeGeo] } : undefined;
        SuggestModule.suggest(debouncedQuery.trim(), options)
            .then((raw) => {
                const citiesSet = citiesSetRef.current;
                const seen = new Set();
                const filtered = [];
                for (const item of raw || []) {
                    const city = cityNameFromMapKitItem(item);
                    const cityNorm = city.trim().toLowerCase();
                    if (!cityNorm || seen.has(cityNorm)) continue;
                    const matches = citiesSet.size === 0 || Array.from(citiesSet).some(
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
                    const local = locationList.filter((c) => (c || '').toLowerCase().includes(q));
                    setSuggestions(local.map((c) => ({ id: c, name: c })));
                } else {
                    setSuggestions(filtered);
                }
            })
            .catch((e) => {
                if (__DEV__) console.warn('MapKit Suggest error:', e);
                fallbackOnlyLocal();
            })
            .finally(() => setLoadingSuggest(false));
    }, [debouncedQuery, locationList]);

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
        : locationList.map((c) => ({ id: c, name: c }));

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

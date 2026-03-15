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
import { API_BASE, YANDEX_GEO_SUGGEST_API_KEY } from '../../shared/infrastructure/config';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const YANDEX_SUGGEST_URL = 'https://suggest-maps.yandex.ru/v1/suggest';

/** Подсказки через бэкенд (прокси) — обход 403 по Referer в мобильном приложении */
async function fetchSuggestViaBackend(text) {
    const res = await fetch(`${API_BASE.replace(/\/$/, '')}/suggest?text=${encodeURIComponent(text.trim())}`);
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    return Array.isArray(data?.results) ? data.results : null;
}

/** Прямой запрос к Yandex Geosuggest (может давать 403 при ограничении по Referer) */
async function fetchYandexGeosuggestDirect(text, apiKey) {
    if (!text?.trim() || !apiKey?.trim()) return [];
    const params = new URLSearchParams({
        apikey: apiKey.trim(),
        text: text.trim(),
        types: 'country,province,locality',
        lang: 'ru',
        results: '10',
    });
    const res = await fetch(`${YANDEX_SUGGEST_URL}?${params.toString()}`);
    if (!res.ok) {
        const errBody = await res.text();
        const err = new Error(`Geosuggest ${res.status}`);
        err.status = res.status;
        err.body = errBody;
        throw err;
    }
    const data = await res.json();
    return Array.isArray(data?.results) ? data.results : [];
}

/** Сначала прокси бэкенда, при недоступности — прямой запрос к Yandex */
async function fetchSuggestResults(text, apiKey) {
    const viaBackend = await fetchSuggestViaBackend(text);
    if (viaBackend !== null) return viaBackend;
    return fetchYandexGeosuggestDirect(text, apiKey);
}

/** Из ответа Geosuggest: title.text или title — название (город или "город, регион") */
function cityNameFromGeosuggestItem(item) {
    const title = item?.title;
    const t = (typeof title === 'string' ? title : title?.text || '').trim();
    return t.split(',')[0]?.trim() || t;
}

function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return debouncedValue;
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
        }
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

        let cancelled = false;
        setLoadingSuggest(true);

        fetchSuggestResults(debouncedQuery.trim(), YANDEX_GEO_SUGGEST_API_KEY)
            .then((raw) => {
                if (cancelled) return;
                const citiesSet = citiesSetRef.current;
                const seen = new Set();
                const filtered = [];
                for (const item of raw || []) {
                    const city = cityNameFromGeosuggestItem(item);
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
                        filtered.push({ id: item?.uri || city, name: city });
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
                if (__DEV__) {
                    if (e?.status === 403) {
                        console.warn(
                            'Yandex Geosuggest 403: проверьте ключ в developer.tech.yandex.ru — включите «Геословарь» (Geosuggest) для ключа и снимите ограничение по HTTP referer для мобильного приложения.',
                            e?.body || ''
                        );
                    } else {
                        console.warn('Yandex Geosuggest error:', e);
                    }
                }
                fallbackOnlyLocal();
            })
            .finally(() => {
                if (!cancelled) setLoadingSuggest(false);
            });

        return () => { cancelled = true; };
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
                <MapPin size={20} color={theme.colors.gray500} />
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
                <Navigation size={20} color={theme.colors.gray500} />
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
                            <Search size={18} color={theme.colors.gray400} />
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
        fontSize: 15,
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
        paddingVertical: 10,
        borderBottomWidth: 0,
    },
    rowIcon: {
        marginRight: theme.spacing.md,
    },
    rowTitle: {
        flex: 1,
        fontSize: 15,
        fontWeight: '400',
        fontFamily: theme.fonts.regular,
        color: theme.colors.textMain,
    },
});

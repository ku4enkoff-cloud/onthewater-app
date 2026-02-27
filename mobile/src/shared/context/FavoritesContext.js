import React, { createContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@boatrent_favorites';

export const FavoritesContext = createContext({
    favoriteBoats: [],
    addFavorite: () => {},
    removeFavorite: () => {},
    toggleFavorite: () => {},
    isFavorite: () => false,
});

export function FavoritesProvider({ children }) {
    const [boats, setBoats] = useState([]);

    useEffect(() => {
        (async () => {
            try {
                const raw = await AsyncStorage.getItem(STORAGE_KEY);
                if (raw) {
                    const list = JSON.parse(raw);
                    if (Array.isArray(list)) setBoats(list);
                }
            } catch (e) {
                console.log('Favorites load error', e);
            }
        })();
    }, []);

    useEffect(() => {
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(boats)).catch(() => {});
    }, [boats]);

    const addFavorite = useCallback((boat) => {
        if (!boat || !boat.id) return;
        setBoats((prev) => (prev.some((b) => b.id === boat.id) ? prev : [...prev, boat]));
    }, []);

    const removeFavorite = useCallback((boatId) => {
        setBoats((prev) => prev.filter((b) => b.id !== boatId));
    }, []);

    const toggleFavorite = useCallback((boat) => {
        if (!boat || !boat.id) return;
        setBoats((prev) => {
            const has = prev.some((b) => b.id === boat.id);
            if (has) return prev.filter((b) => b.id !== boat.id);
            return [...prev, boat];
        });
    }, []);

    const isFavorite = useCallback(
        (boatId) => boats.some((b) => b.id === boatId),
        [boats]
    );

    return (
        <FavoritesContext.Provider
            value={{
                favoriteBoats: boats,
                addFavorite,
                removeFavorite,
                toggleFavorite,
                isFavorite,
            }}
        >
            {children}
        </FavoritesContext.Provider>
    );
}

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Anchor, Heart, Calendar, MessageSquare, User } from 'lucide-react-native';
import { theme } from '../../shared/theme';
import { api } from '../../shared/infrastructure/api';
import SearchScreen from '../screens/SearchScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import BookingsScreen from '../screens/BookingsScreen';
import ChatScreen from '../screens/ChatScreen';
import ProfileScreen from '../screens/ProfileScreen';

const NAVY = '#1B365D';
const CHAT_BADGE_BLUE = '#1E5DB8';
const Tab = createBottomTabNavigator();

const TAB_BAR_BASE_HEIGHT = 64;
const TAB_BAR_PADDING_TOP = 8;
const TAB_BAR_PADDING_BOTTOM = 8;

export default function ClientTabs() {
    const insets = useSafeAreaInsets();
    const bottomInset = Platform.OS === 'android' ? Math.max(insets.bottom, 24) : insets.bottom;
    const [unreadMessages, setUnreadMessages] = useState(0);

    const refreshUnreadMessagesBadge = useCallback(async () => {
        try {
            const res = await api.get('/chats/unread-messages-count');
            const count = Number(res.data?.count ?? 0);
            setUnreadMessages(Number.isFinite(count) ? count : 0);
        } catch (_) {
            setUnreadMessages(0);
        }
    }, []);

    useEffect(() => {
        refreshUnreadMessagesBadge();
        const id = setInterval(refreshUnreadMessagesBadge, 30000);
        return () => clearInterval(id);
    }, [refreshUnreadMessagesBadge]);

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarActiveTintColor: NAVY,
                tabBarInactiveTintColor: theme.colors.gray400,
                tabBarShowLabel: false,
                tabBarStyle: {
                    paddingBottom: TAB_BAR_PADDING_BOTTOM + bottomInset,
                    paddingTop: TAB_BAR_PADDING_TOP,
                    height: TAB_BAR_BASE_HEIGHT + bottomInset,
                    backgroundColor: '#fff',
                    borderTopWidth: 1,
                    borderTopColor: theme.colors.gray100,
                },
                tabBarIcon: ({ color, focused }) => {
                    let Icon;
                    if (route.name === 'Search') Icon = Anchor;
                    else if (route.name === 'Favorites') Icon = Heart;
                    else if (route.name === 'Bookings') Icon = Calendar;
                    else if (route.name === 'Chat') Icon = MessageSquare;
                    else if (route.name === 'Profile') Icon = User;

                    if (route.name === 'Chat') {
                        const iconEl = focused ? (
                            <View style={styles.activeIcon}>
                                <Icon color="#fff" size={20} />
                            </View>
                        ) : (
                            <Icon color={color} size={24} />
                        );
                        return (
                            <View style={styles.iconWrap}>
                                {iconEl}
                                {unreadMessages > 0 && (
                                    <View style={styles.unreadBadge}>
                                        <Text style={styles.unreadBadgeText}>
                                            {unreadMessages > 99 ? '99+' : unreadMessages}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        );
                    }

                    if (focused) {
                        return (
                            <View style={styles.activeIcon}>
                                <Icon color="#fff" size={20} />
                            </View>
                        );
                    }
                    return <Icon color={color} size={24} />;
                },
            })}
        >
            <Tab.Screen name="Search" component={SearchScreen} options={{ title: 'Главная' }} />
            <Tab.Screen name="Favorites" component={FavoritesScreen} options={{ title: 'Избранное' }} />
            <Tab.Screen name="Bookings" component={BookingsScreen} options={{ title: 'Брони' }} />
            <Tab.Screen
                name="Chat"
                component={ChatScreen}
                options={{ title: 'Сообщения' }}
                listeners={{
                    tabPress: refreshUnreadMessagesBadge,
                    focus: refreshUnreadMessagesBadge,
                }}
            />
            <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Профиль' }} />
        </Tab.Navigator>
    );
}

const styles = StyleSheet.create({
    activeIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: NAVY,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconWrap: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    unreadBadge: {
        position: 'absolute',
        top: -6,
        right: -10,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: CHAT_BADGE_BLUE,
        borderWidth: 2,
        borderColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    unreadBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontFamily: theme.fonts.bold,
    },
});

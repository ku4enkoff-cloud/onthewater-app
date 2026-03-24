import React, { useCallback, useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayoutDashboard, Ship, Calendar, MessageCircle, User } from 'lucide-react-native';
import { theme } from '../../shared/theme';
import { api } from '../../shared/infrastructure/api';
import OwnerDashboardScreen from '../screens/OwnerDashboardScreen';
import MyBoatsScreen from '../screens/MyBoatsScreen';
import OwnerBookingsScreen from '../screens/OwnerBookingsScreen';
import OwnerChatScreen from '../screens/OwnerChatScreen';
import OwnerAccountScreen from '../screens/OwnerAccountScreen';

const TEAL = '#0D5C5C';
const Tab = createBottomTabNavigator();

export default function OwnerTabs() {
    const insets = useSafeAreaInsets();
    const tabBarHeight = 62 + insets.bottom;
    const tabBarPaddingBottom = 6 + insets.bottom;
    const [pendingBookings, setPendingBookings] = useState(0);
    const [unreadMessages, setUnreadMessages] = useState(0);

    const refreshBookingsBadge = useCallback(async () => {
        try {
            const res = await api.get('/owner/bookings');
            const list = Array.isArray(res.data) ? res.data : [];
            const count = list.filter((b) => b && b.status === 'pending').length;
            setPendingBookings(count);
        } catch (_) {
            setPendingBookings(0);
        }
    }, []);

    const refreshUnreadMessagesBadge = useCallback(async () => {
        try {
            const res = await api.get('/owner/unread-messages-count');
            const count = Number(res.data?.count ?? 0);
            setUnreadMessages(Number.isFinite(count) ? count : 0);
        } catch (_) {
            setUnreadMessages(0);
        }
    }, []);

    useEffect(() => {
        refreshBookingsBadge();
        refreshUnreadMessagesBadge();
        const id = setInterval(() => {
            refreshBookingsBadge();
            refreshUnreadMessagesBadge();
        }, 30000);
        return () => clearInterval(id);
    }, [refreshBookingsBadge, refreshUnreadMessagesBadge]);

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarActiveTintColor: TEAL,
                tabBarInactiveTintColor: theme.colors.textMuted,
                tabBarLabelStyle: { fontSize: 11, fontFamily: theme.fonts.medium, marginTop: -2 },
                tabBarStyle: {
                    paddingBottom: tabBarPaddingBottom,
                    paddingTop: 8,
                    height: tabBarHeight,
                    backgroundColor: '#fff',
                    borderTopWidth: 0.5,
                    borderTopColor: '#E5E7EB',
                },
                tabBarIcon: ({ color, focused }) => {
                    const sz = 22;
                    if (route.name === 'Dashboard') {
                        return (
                            <View style={focused ? iconStyles.active : undefined}>
                                <LayoutDashboard size={sz} color={color} strokeWidth={1.8} />
                            </View>
                        );
                    }
                    if (route.name === 'MyBoats') return <Ship size={sz} color={color} strokeWidth={1.8} />;
                    if (route.name === 'Bookings') {
                        return (
                            <View style={badgeStyles.iconWrap}>
                                <Calendar size={sz} color={color} strokeWidth={1.8} />
                                {pendingBookings > 0 && (
                                    <View style={badgeStyles.badge}>
                                        <Text style={badgeStyles.badgeText}>
                                            {pendingBookings > 99 ? '99+' : pendingBookings}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        );
                    }
                    if (route.name === 'Chat') {
                        return (
                            <View style={badgeStyles.iconWrap}>
                                <MessageCircle size={sz} color={color} strokeWidth={1.8} />
                                {unreadMessages > 0 && (
                                    <View style={badgeStyles.badge}>
                                        <Text style={badgeStyles.badgeText}>
                                            {unreadMessages > 99 ? '99+' : unreadMessages}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        );
                    }
                    if (route.name === 'Account') return <User size={sz} color={color} strokeWidth={1.8} />;
                },
            })}
        >
            <Tab.Screen name="Dashboard" component={OwnerDashboardScreen} options={{ title: 'Дашборд' }} />
            <Tab.Screen name="MyBoats" component={MyBoatsScreen} options={{ title: 'Катера' }} />
            <Tab.Screen
                name="Bookings"
                component={OwnerBookingsScreen}
                options={{ title: 'Брони' }}
                listeners={{
                    tabPress: () => {
                        // обновить бейдж при открытии вкладки
                        refreshBookingsBadge();
                    },
                }}
            />
            <Tab.Screen
                name="Chat"
                component={OwnerChatScreen}
                options={{ title: 'Сообщения' }}
                listeners={{
                    tabPress: refreshUnreadMessagesBadge,
                    focus: refreshUnreadMessagesBadge,
                }}
            />
            <Tab.Screen name="Account" component={OwnerAccountScreen} options={{ title: 'Аккаунт' }} />
        </Tab.Navigator>
    );
}

const iconStyles = {
    active: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: 'rgba(13,92,92,0.1)',
        justifyContent: 'center', alignItems: 'center',
    },
};

const badgeStyles = {
    iconWrap: { position: 'relative' },
    badge: {
        position: 'absolute',
        top: -7,
        right: -10,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#E11D48',
        borderWidth: 2,
        borderColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    badgeText: { color: '#fff', fontSize: 11, fontFamily: theme.fonts.bold },
};

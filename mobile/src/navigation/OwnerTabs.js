import React, { useCallback, useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ship, Calendar, MessageCircle, User } from 'lucide-react-native';
import { theme } from '../theme';
import { api } from '../shared/infrastructure/api';

// Экраны владельца
import MyBoatsScreen from '../apps/owner/screens/MyBoatsScreen';
import OwnerBookingsScreen from '../apps/owner/screens/OwnerBookingsScreen';
import OwnerChatScreen from '../apps/owner/screens/OwnerChatScreen';
import ProfileScreen from '../apps/client/screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function OwnerTabs() {
    const [pendingBookings, setPendingBookings] = useState(0);

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

    useEffect(() => {
        refreshBookingsBadge();
        const id = setInterval(refreshBookingsBadge, 30000);
        return () => clearInterval(id);
    }, [refreshBookingsBadge]);

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.textMuted,
                tabBarStyle: {
                    paddingBottom: 5,
                    paddingTop: 5,
                    height: 60,
                    backgroundColor: theme.colors.background,
                },
                tabBarIcon: ({ color, size }) => {
                    if (route.name === 'MyBoats') return <Ship color={color} size={size} />;
                    if (route.name === 'Bookings') {
                        return (
                            <View style={badgeStyles.iconWrap}>
                                <Calendar color={color} size={size} />
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
                    if (route.name === 'Chat') return <MessageCircle color={color} size={size} />;
                    if (route.name === 'Profile') return <User color={color} size={size} />;
                },
            })}
        >
            <Tab.Screen name="MyBoats" component={MyBoatsScreen} options={{ title: 'Мой флот' }} />
            <Tab.Screen
                name="Bookings"
                component={OwnerBookingsScreen}
                options={{ title: 'Брони' }}
                listeners={{ tabPress: refreshBookingsBadge }}
            />
            <Tab.Screen name="Chat" component={OwnerChatScreen} options={{ title: 'Чат' }} />
            <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Профиль' }} />
        </Tab.Navigator>
    );
}

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
        borderColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    badgeText: { color: '#fff', fontSize: 11, fontFamily: theme.fonts.bold },
};

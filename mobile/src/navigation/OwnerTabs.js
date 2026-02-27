import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ship, Calendar, MessageCircle, User } from 'lucide-react-native';
import { theme } from '../theme';

// Экраны владельца
import MyBoatsScreen from '../apps/owner/screens/MyBoatsScreen';
import OwnerBookingsScreen from '../apps/owner/screens/OwnerBookingsScreen';
import OwnerChatScreen from '../apps/owner/screens/OwnerChatScreen';
import ProfileScreen from '../apps/client/screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function OwnerTabs() {
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
                    if (route.name === 'Bookings') return <Calendar color={color} size={size} />;
                    if (route.name === 'Chat') return <MessageCircle color={color} size={size} />;
                    if (route.name === 'Profile') return <User color={color} size={size} />;
                },
            })}
        >
            <Tab.Screen name="MyBoats" component={MyBoatsScreen} options={{ title: 'Мой флот' }} />
            <Tab.Screen name="Bookings" component={OwnerBookingsScreen} options={{ title: 'Брони' }} />
            <Tab.Screen name="Chat" component={OwnerChatScreen} options={{ title: 'Чат' }} />
            <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Профиль' }} />
        </Tab.Navigator>
    );
}

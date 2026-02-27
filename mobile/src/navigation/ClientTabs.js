import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Compass, Calendar, MessageCircle, User } from 'lucide-react-native';
import { theme } from '../theme';

// Импорт экранов клиента
import SearchScreen from '../apps/client/screens/SearchScreen';
import BookingsScreen from '../apps/client/screens/BookingsScreen';
import ChatScreen from '../apps/client/screens/ChatScreen';
import ProfileScreen from '../apps/client/screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function ClientTabs() {
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
                    if (route.name === 'Search') return <Compass color={color} size={size} />;
                    if (route.name === 'Bookings') return <Calendar color={color} size={size} />;
                    if (route.name === 'Chat') return <MessageCircle color={color} size={size} />;
                    if (route.name === 'Profile') return <User color={color} size={size} />;
                },
            })}
        >
            <Tab.Screen name="Search" component={SearchScreen} options={{ title: 'Поиск' }} />
            <Tab.Screen name="Bookings" component={BookingsScreen} options={{ title: 'Брони' }} />
            <Tab.Screen name="Chat" component={ChatScreen} options={{ title: 'Сообщения' }} />
            <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Профиль' }} />
        </Tab.Navigator>
    );
}

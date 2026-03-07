import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Anchor, Ship, Settings, MessageCircle, User } from 'lucide-react-native';
import { theme } from '../../shared/theme';
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
                                <Anchor size={sz} color={color} strokeWidth={1.8} />
                            </View>
                        );
                    }
                    if (route.name === 'MyBoats') return <Ship size={sz} color={color} strokeWidth={1.8} />;
                    if (route.name === 'Bookings') return <Settings size={sz} color={color} strokeWidth={1.8} />;
                    if (route.name === 'Chat') return <MessageCircle size={sz} color={color} strokeWidth={1.8} />;
                    if (route.name === 'Account') return <User size={sz} color={color} strokeWidth={1.8} />;
                },
            })}
        >
            <Tab.Screen name="Dashboard" component={OwnerDashboardScreen} options={{ title: 'Дашборд' }} />
            <Tab.Screen name="MyBoats" component={MyBoatsScreen} options={{ title: 'Катера' }} />
            <Tab.Screen name="Bookings" component={OwnerBookingsScreen} options={{ title: 'Брони' }} />
            <Tab.Screen name="Chat" component={OwnerChatScreen} options={{ title: 'Сообщения' }} />
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

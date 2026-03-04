import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Anchor, Heart, Compass, MessageSquare, User } from 'lucide-react-native';
import { theme } from '../../shared/theme';
import SearchScreen from '../screens/SearchScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import BookingsScreen from '../screens/BookingsScreen';
import ChatScreen from '../screens/ChatScreen';
import ProfileScreen from '../screens/ProfileScreen';

const NAVY = '#1B365D';
const Tab = createBottomTabNavigator();

const TAB_BAR_BASE_HEIGHT = 64;
const TAB_BAR_PADDING_TOP = 8;
const TAB_BAR_PADDING_BOTTOM = 8;

export default function ClientTabs() {
    const insets = useSafeAreaInsets();
    const bottomInset = Platform.OS === 'android' ? Math.max(insets.bottom, 24) : insets.bottom;

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
                    else if (route.name === 'Bookings') Icon = Compass;
                    else if (route.name === 'Chat') Icon = MessageSquare;
                    else if (route.name === 'Profile') Icon = User;

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
            <Tab.Screen name="Chat" component={ChatScreen} options={{ title: 'Сообщения' }} />
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
});

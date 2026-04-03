import React, { useContext, useEffect, useCallback } from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';

import { AuthContext } from '../context/AuthContext';
import { theme } from '../theme';

import AuthStack from './AuthStack';
import ClientNavigator from './ClientNavigator';
import OwnerNavigator from './OwnerNavigator';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
    const { user, loading } = useContext(AuthContext);
    const navigationRef = useNavigationContainerRef();

    // Обработка нажатий по push-уведомлениям (бронь -> экран бронирования)
    useEffect(() => {
        if (!navigationRef) return;
        let subscription;
        let isMounted = true;
        const Notifications = (() => {
            try {
                // Делать require лениво, чтобы не тянуть expo-notifications в web
                // eslint-disable-next-line global-require
                return require('expo-notifications');
            } catch {
                return null;
            }
        })();
        if (!Notifications) return;

        const handleResponse = (response) => {
            if (!response || !navigationRef.isReady() || !user || user.role !== 'client') return;
            const data = response.notification?.request?.content?.data || {};
            if (data.type === 'booking') {
                const bookingId = data.bookingId || data.booking_id || data.id;
                if (bookingId) {
                    navigationRef.navigate('ClientApp', {
                        screen: 'BookingDetail',
                        params: { bookingId },
                    });
                } else {
                    navigationRef.navigate('ClientApp', {
                        screen: 'MainTabs',
                        params: { screen: 'Bookings' },
                    });
                }
            }
        };

        (async () => {
            // Обработать уведомление, по которому приложение было открыто
            try {
                const initial = await Notifications.getLastNotificationResponseAsync();
                if (isMounted && initial) handleResponse(initial);
            } catch {
                // ignore
            }
            // Подписка на новые нажатия
            try {
                subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
            } catch {
                // ignore
            }
        })();

        return () => {
            isMounted = false;
            if (subscription) subscription.remove();
        };
    }, [navigationRef, user?.id, user?.role]);

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <NavigationContainer ref={navigationRef}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {user == null ? (
                    // Пользователь не авторизован -> Экран Входа / Регистрации
                    <Stack.Screen name="Auth" component={AuthStack} />
                ) : user.role === 'owner' ? (
                    // Авторизован как Владелец
                    <Stack.Screen name="OwnerApp" component={OwnerNavigator} />
                ) : (
                    // Авторизован как Клиент (по умолчанию)
                    <Stack.Screen name="ClientApp" component={ClientNavigator} />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}

import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
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

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <NavigationContainer>
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

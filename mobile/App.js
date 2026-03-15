import React, { useCallback, useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import {
    Jost_300Light,
    Jost_400Regular,
    Jost_500Medium,
    Jost_600SemiBold,
    Jost_700Bold,
} from '@expo-google-fonts/jost';
import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';

SplashScreen.preventAutoHideAsync();

// Показывать push и когда приложение открыто (foreground)
if (Platform.OS !== 'web' && Constants.appOwnership !== 'expo') {
  try {
    const Notifications = require('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (_) {}
}

if (Platform.OS === 'android' || Platform.OS === 'ios') {
  try {
    const YaMap = require('react-native-yamap').default;
    YaMap.init('84448445-01d9-454b-8398-9adaaf19ad61');
  } catch (_) {}
}

export default function App() {
    const [fontsLoaded, setFontsLoaded] = useState(false);

    // Канал Android с высоким приоритетом — создаём после монтирования (нативный модуль готов)
    useEffect(() => {
        if (Platform.OS !== 'android' || Constants.appOwnership === 'expo') return;
        try {
            const Notifications = require('expo-notifications');
            if (Notifications.setNotificationChannelAsync) {
                Notifications.setNotificationChannelAsync('default', {
                    name: 'Уведомления',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#1B365D',
                }).catch(() => {});
            }
        } catch (_) {}
    }, []);

    useEffect(() => {
        Font.loadAsync({
            Jost_300Light,
            Jost_400Regular,
            Jost_500Medium,
            Jost_600SemiBold,
            Jost_700Bold,
        })
            .then(() => setFontsLoaded(true))
            .catch((e) => console.warn('Font load error', e));
    }, []);

    const onLayoutRootView = useCallback(async () => {
        if (fontsLoaded) await SplashScreen.hideAsync();
    }, [fontsLoaded]);

    if (!fontsLoaded) return null;

    return (
        <SafeAreaProvider>
            <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
                <AuthProvider>
                    <RootNavigator />
                    <StatusBar style="auto" />
                </AuthProvider>
            </View>
        </SafeAreaProvider>
    );
}

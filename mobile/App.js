import React, { useCallback, useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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

if (Platform.OS === 'android' || Platform.OS === 'ios') {
  try {
    const YaMap = require('react-native-yamap').default;
    YaMap.init('666d8497-b404-4f94-97ea-8d2e64f79015');
  } catch (_) {}
}

export default function App() {
    const [fontsLoaded, setFontsLoaded] = useState(false);

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

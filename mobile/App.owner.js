import React, { useContext, useState, useEffect, useCallback } from 'react';
import { Platform, View, ActivityIndicator } from 'react-native';
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
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider, AuthContext } from './src/shared/context/AuthContext';
import { theme } from './src/shared/theme';
import OwnerAuthStack from './src/owner/OwnerAuthStack';
import OwnerNavigator from './src/owner/navigation/OwnerNavigator';

SplashScreen.preventAutoHideAsync();

if (Platform.OS === 'android' || Platform.OS === 'ios') {
  try {
    const YaMap = require('react-native-yamap').default;
    YaMap.init('84448445-01d9-454b-8398-9adaaf19ad61');
  } catch (_) {}
}

function OwnerRoot() {
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
      {user == null ? <OwnerAuthStack /> : <OwnerNavigator />}
    </NavigationContainer>
  );
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
          <OwnerRoot />
          <StatusBar style="light" />
        </AuthProvider>
      </View>
    </SafeAreaProvider>
  );
}

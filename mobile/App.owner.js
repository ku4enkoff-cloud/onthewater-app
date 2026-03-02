import React, { useContext, useState, useEffect, useCallback } from 'react';
import { Platform, View, ActivityIndicator, Text } from 'react-native';
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

class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(e) { return { error: e }; }
  componentDidCatch(e, info) { console.error('App error', e, info); }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ color: '#c00', textAlign: 'center' }}>Ошибка загрузки. Перезапустите приложение.</Text>
          <Text style={{ marginTop: 8, fontSize: 12, color: '#666' }}>{String(this.state.error.message)}</Text>
        </View>
      );
    }
    return this.props.children;
  }
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
    let cancelled = false;
    const fallback = setTimeout(() => {
      if (!cancelled) setFontsLoaded(true);
    }, 5000);
    Font.loadAsync({
      Jost_300Light,
      Jost_400Regular,
      Jost_500Medium,
      Jost_600SemiBold,
      Jost_700Bold,
    })
      .then(() => !cancelled && setFontsLoaded(true))
      .catch((e) => {
        console.warn('Font load error', e);
        if (!cancelled) setFontsLoaded(true);
      })
      .finally(() => clearTimeout(fallback));
    return () => { cancelled = true; clearTimeout(fallback); };
  }, []);

  // Скрыть overlay "Bundling/Reloading" сразу при монтировании
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  const onLayoutRootView = useCallback(async () => {
    await SplashScreen.hideAsync().catch(() => {});
  }, []);

  // Первый кадр без зависимостей от theme — чтобы гарантированно отрисоваться после "Bundling 100%"
  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }} onLayout={onLayoutRootView}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
          <AuthProvider>
            <OwnerRoot />
            <StatusBar style="light" />
          </AuthProvider>
        </View>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

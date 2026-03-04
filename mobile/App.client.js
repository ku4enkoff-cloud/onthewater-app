import React, { useContext, useState, useEffect, useCallback } from 'react';
import { Platform, View, Text, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { FavoritesProvider } from './src/shared/context/FavoritesContext';
import { theme } from './src/shared/theme';
import ClientNavigator from './src/client/navigation/ClientNavigator';
import OnboardingScreen from './src/client/screens/OnboardingScreen';

SplashScreen.preventAutoHideAsync();

const ONBOARDING_KEY = '@boatrent_onboarding_done';

if (Platform.OS === 'android' || Platform.OS === 'ios') {
  try {
    const YaMap = require('react-native-yamap').default;
    YaMap.init('84448445-01d9-454b-8398-9adaaf19ad61');
  } catch (_) {}
}

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: theme.colors.surface }}>
          <Text style={{ fontSize: 18, color: theme.colors.textMain, textAlign: 'center', marginBottom: 8 }}>Произошла ошибка</Text>
          <Text style={{ fontSize: 14, color: theme.colors.textMuted, textAlign: 'center' }}>{String(this.state.error?.message || '')}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

function ClientRoot() {
  const { loading } = useContext(AuthContext);
  const [onboardingDone, setOnboardingDone] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      if (!cancelled) setOnboardingDone(false); // таймаут: не зависать, показать онбординг
    }, 3000);
    AsyncStorage.getItem(ONBOARDING_KEY).then((v) => {
      if (!cancelled) {
        clearTimeout(t);
        setOnboardingDone(v === '1');
      }
    }).catch(() => {
      if (!cancelled) {
        clearTimeout(t);
        setOnboardingDone(false);
      }
    });
    return () => { cancelled = true; clearTimeout(t); };
  }, []);

  const finishOnboarding = () => {
    AsyncStorage.setItem(ONBOARDING_KEY, '1');
    setOnboardingDone(true);
  };

  if (onboardingDone === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.waveDark }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (!onboardingDone) {
    return <OnboardingScreen onFinish={finishOnboarding} />;
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.surface }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 16, fontSize: 16, color: theme.colors.textMuted }}>Загрузка...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <ClientNavigator />
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
      .catch((e) => {
        console.warn('Font load error', e);
        setFontsLoaded(true); // чтобы не зависнуть на сплэше при ошибке шрифтов
      });
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) await SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <ErrorBoundary>
          <AuthProvider>
            <FavoritesProvider>
              <ClientRoot />
              <StatusBar style="auto" />
            </FavoritesProvider>
          </AuthProvider>
        </ErrorBoundary>
      </View>
    </SafeAreaProvider>
  );
}

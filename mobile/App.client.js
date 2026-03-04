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
import AppSplashScreen from './src/shared/components/AppSplashScreen';
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
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const setDone = (value) => {
      if (!cancelled) setOnboardingDone(value);
    };
    const t = setTimeout(() => setDone(false), 2000);
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then((v) => {
        clearTimeout(t);
        setDone(v === '1');
      })
      .catch(() => {
        clearTimeout(t);
        setDone(false);
      });
    return () => { cancelled = true; clearTimeout(t); };
  }, []);

  // Страховка: если "Загрузка..." висит дольше 5 сек — показываем приложение (хуки всегда в одном порядке)
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setLoadingTimedOut(true), 5000);
    return () => clearTimeout(t);
  }, [loading]);
  useEffect(() => {
    if (!loading) setLoadingTimedOut(false);
  }, [loading]);

  const finishOnboarding = () => {
    AsyncStorage.setItem(ONBOARDING_KEY, '1');
    setOnboardingDone(true);
  };

  if (onboardingDone === null) {
    return <AppSplashScreen />;
  }

  if (!onboardingDone) {
    return <OnboardingScreen onFinish={finishOnboarding} />;
  }

  if (loading && !loadingTimedOut) {
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

  // Гарантированно скрыть сплэш после загрузки шрифтов (onLayout иногда не срабатывает — остаётся "Bundling 100%")
  useEffect(() => {
    if (!fontsLoaded) return;
    const hide = async () => {
      try {
        await SplashScreen.hideAsync();
      } catch (_) {}
    };
    const t = setTimeout(hide, 100);
    return () => clearTimeout(t);
  }, [fontsLoaded]);

  // Не показывать чёрный экран: пока грузятся шрифты — фон как у сплэша
  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.waveDark }} onLayout={onLayoutRootView} />
    );
  }

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: theme.colors.waveDark }} onLayout={onLayoutRootView}>
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

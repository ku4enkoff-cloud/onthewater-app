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

  // Если дольше 2.5 сек висим на экране ONTHEWATER — принудительно переходим дальше
  useEffect(() => {
    const t = setTimeout(() => {
      setOnboardingDone((prev) => (prev === null ? false : prev));
    }, 2500);
    return () => clearTimeout(t);
  }, []);

  // Страховка: если "Загрузка..." висит дольше 5 сек — показываем приложение
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

  // Ожидание чтения onboarding из AsyncStorage (макс. 2.5 сек), иначе не скрыть сплэш в эмуляторе
  if (onboardingDone === null) {
    return <AppSplashScreen />;
  }

  if (!onboardingDone) {
    return <OnboardingScreen onFinish={finishOnboarding} />;
  }

  return (
    <NavigationContainer>
      <ClientNavigator />
    </NavigationContainer>
  );
}

const FONT_LOAD_TIMEOUT_MS = 6000;

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') return;
    let cancelled = false;
    try {
      const { YANDEX_MAPKIT_API_KEY } = require('./src/shared/infrastructure/config');
      const YaMap = require('react-native-yamap').default;
      const key = YANDEX_MAPKIT_API_KEY && String(YANDEX_MAPKIT_API_KEY).trim();
      if (key && !cancelled) YaMap.init(key).catch((err) => { if (__DEV__) console.warn('[YaMap] init failed:', err?.message || err); });
    } catch (_) {}
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const done = () => {
      if (!cancelled) setFontsLoaded(true);
    };
    const timeout = setTimeout(done, FONT_LOAD_TIMEOUT_MS);
    Font.loadAsync({
      Jost_300Light,
      Jost_400Regular,
      Jost_500Medium,
      Jost_600SemiBold,
      Jost_700Bold,
    })
      .then(done)
      .catch((e) => {
        console.warn('Font load error', e);
        done();
      });
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      try {
        await SplashScreen.hideAsync();
      } catch (_) {}
    }
  }, [fontsLoaded]);

  // Скрыть нативный сплэш после загрузки шрифтов или по таймауту (в эмуляторе загрузка может зависнуть)
  useEffect(() => {
    if (!fontsLoaded) return;
    const hide = async () => {
      try {
        await SplashScreen.hideAsync();
      } catch (_) {}
    };
    const t = setTimeout(hide, 150);
    return () => clearTimeout(t);
  }, [fontsLoaded]);

  // Принудительно скрыть нативный сплэш через 2.5 сек (в эмуляторе часто зависает на "Bundling 100%")
  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        await SplashScreen.hideAsync();
      } catch (_) {}
    }, 2500);
    return () => clearTimeout(t);
  }, []);

  // Не показывать чёрный экран: пока грузятся шрифты — фон как у сплэша и индикатор
  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.waveDark, justifyContent: 'center', alignItems: 'center' }} onLayout={onLayoutRootView}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
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

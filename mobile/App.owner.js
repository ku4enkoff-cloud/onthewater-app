import React, { useContext, useState, useEffect, useCallback } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
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
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, AuthContext } from './src/shared/context/AuthContext';
import { NotificationsProvider, NotificationsContext } from './src/shared/context/NotificationsContext';
import { theme } from './src/shared/theme';
import OwnerAuthStack from './src/owner/OwnerAuthStack';
import OwnerNavigator from './src/owner/navigation/OwnerNavigator';
import TermsAcceptModal from './src/shared/components/TermsAcceptModal';
import { useRegisterPushToken } from './src/client/hooks/useRegisterPushToken';
import { usePushNotificationNavigation } from './src/shared/hooks/usePushNotificationNavigation';
import { ensureYamapInitialized } from './src/shared/yamapInit';
import { initAppMetrica } from './src/shared/analytics/appMetrica';
import { initPushNotifications } from './src/shared/notifications/initPushNotifications';

SplashScreen.preventAutoHideAsync();

ensureYamapInitialized();
initAppMetrica();
initPushNotifications();

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
  const navigationRef = useNavigationContainerRef();
  const [navReady, setNavReady] = useState(false);
  const { user, loading, refreshUser } = useContext(AuthContext);
  const needsTermsAccept = user && !user.terms_accepted_at;
  const { pushEnabled, loaded: pushLoaded } = useContext(NotificationsContext);
  useRegisterPushToken(user, pushEnabled, pushLoaded);
  usePushNotificationNavigation(navigationRef, { user, navReady });
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }
  return (
    <NavigationContainer ref={navigationRef} onReady={() => setNavReady(true)}>
      {user == null ? <OwnerAuthStack /> : <OwnerNavigator />}
      {user != null ? (
        <TermsAcceptModal
          visible={!!needsTermsAccept}
          onAccepted={() => refreshUser()}
        />
      ) : null}
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
        <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
          <AuthProvider>
            <NotificationsProvider>
              <OwnerRoot />
              <StatusBar style="light" />
            </NotificationsProvider>
          </AuthProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
